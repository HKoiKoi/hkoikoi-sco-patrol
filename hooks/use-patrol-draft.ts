"use client";

// 순찰 초안 자동 저장·복원 훅. 폼 상태(reducer)에 디바운스 저장, 단일 요청 큐, 충돌 처리,
// 로컬 백업, 포커스 복귀 재조회를 연결한다. 저장 시각은 서버 updated_at만 쓴다(클라이언트 시계 미사용).
import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  type Dispatch,
} from "react";
import { toast } from "sonner";

import {
  clearDraftBackup,
  readDraftBackup,
  writeDraftBackup,
} from "@/lib/draft-backup";
import { PatrolDraftNetworkError } from "@/lib/patrol-draft-rpc";
import {
  createInitialPatrolFormState,
  patrolFormReducer,
  type PatrolFormAction,
  type PatrolFormState,
} from "@/lib/patrol-form-reducer";
import { createClient } from "@/lib/supabase/client";
import type {
  PatrolContent,
  PatrolDraft,
  PatrolDraftAdapter,
  SeatCategory,
} from "@/lib/types/patrol";

/** 완료 직전 flush에서 저장을 다시 시도하는 최대 횟수 */
const MAX_FLUSH_ATTEMPTS = 3;

/** 마지막 입력 후 자동 저장까지 기다리는 시간 */
const SAVE_DEBOUNCE_MS = 1000;

const SEAT_CATEGORIES: SeatCategory[] = [
  "standing",
  "cafe_zone",
  "drowsy",
  "away",
];

function isSameContent(a: PatrolContent, b: PatrolContent): boolean {
  return (
    a.memo === b.memo &&
    SEAT_CATEGORIES.every(
      (c) => a[c].length === b[c].length && a[c].every((n, i) => n === b[c][i]),
    )
  );
}

function isEmptyContent(content: PatrolContent): boolean {
  return (
    content.memo === "" && SEAT_CATEGORIES.every((c) => !content[c].length)
  );
}

/**
 * 저장 직후 본인 초안의 서버 updated_at을 조회한다(클라이언트 시계 미사용).
 * 조회 실패·행 없음은 null이며, 호출부는 저장 성공으로 처리하고 기존 저장 시각을 유지한다.
 */
async function fetchServerUpdatedAt(userId: string): Promise<string | null> {
  try {
    const { data, error } = await createClient()
      .from("patrol_drafts")
      .select("updated_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) return null;
    return data.updated_at;
  } catch {
    return null;
  }
}

/** 서버 초안으로 초기 상태를 만든다. 내용이 있으면 이미 저장된 상태("저장됨 HH:mm")로 시작한다. */
function createInitialState(draft: PatrolDraft): PatrolFormState {
  const base = createInitialPatrolFormState(draft);
  if (isEmptyContent(draft.content)) return base;
  return { ...base, status: "saved", lastSavedAt: draft.updatedAt || null };
}

interface UsePatrolDraftOptions {
  userId: string;
  adapter: PatrolDraftAdapter;
  /** 서버가 조회한 본인 초안 (행이 없으면 revision 0의 빈 초안) */
  initialDraft: PatrolDraft;
}

interface UsePatrolDraftResult {
  state: PatrolFormState;
  dispatch: Dispatch<PatrolFormAction>;
  /** 저장 flush 후 순찰을 완료한다. */
  handleComplete: () => Promise<void>;
  /** 클릭 직후 COMPLETE_START 전까지(저장 flush 중) true */
  flushing: boolean;
}

export function usePatrolDraft({
  userId,
  adapter,
  initialDraft,
}: UsePatrolDraftOptions): UsePatrolDraftResult {
  const [state, rawDispatch] = useReducer(
    patrolFormReducer,
    initialDraft,
    createInitialState,
  );
  const stateRef = useRef(state);
  const inflightSaveRef = useRef<Promise<void> | null>(null);
  // 저장 실패(오프라인·거절) 이후 저장에 성공하기 전까지 true. 입력이 바뀔 때마다 로컬 백업을 갱신한다.
  const needsBackupRef = useRef(false);
  const refetchingRef = useRef(false);
  // 완료 재시도 시 같은 요청 ID를 써서 서버 멱등 처리를 탄다.
  const requestIdRef = useRef<string | null>(null);
  // 같은 틱 연타를 막는 동기 가드. flushing(state)은 UI 표시용이다.
  const completingRef = useRef(false);
  const [flushing, setFlushing] = useState(false);

  const dispatch = useCallback((action: PatrolFormAction) => {
    stateRef.current = patrolFormReducer(stateRef.current, action);
    rawDispatch(action);
  }, []);

  const save = useCallback((): Promise<void> => {
    // 저장 중 들어온 입력은 상태만 dirty로 두고, 요청이 끝나면 최신 내용 하나로 다시 저장된다.
    if (inflightSaveRef.current) return inflightSaveRef.current;

    dispatch({ type: "SAVE_START" });
    const { status, revision, content } = stateRef.current;
    if (status !== "saving") return Promise.resolve();

    const request = (async () => {
      try {
        const result = await adapter.saveDraft(revision, content);
        if (result.status === "ok") {
          // 저장 시각은 서버 updated_at을 다시 읽어 쓴다. 조회 실패 시 저장은 성공으로 두고 시각만 유지한다.
          const savedAt = await fetchServerUpdatedAt(userId);
          dispatch({ type: "SAVE_OK", revision: result.revision, savedAt });
          needsBackupRef.current = false;
          // 입력이 더 들어와 dirty로 남았다면 그 내용은 아직 서버에 없으므로 백업을 유지한다.
          if (stateRef.current.status === "saved") clearDraftBackup(userId);
        } else {
          dispatch({ type: "SAVE_CONFLICT", serverDraft: result.serverDraft });
          // 서버 초안이 비어 있으면 선택 없이 로컬 입력을 서버 revision 기준으로 다시 저장한다.
          if (isEmptyContent(result.serverDraft.content)) {
            dispatch({ type: "RESOLVE_CONFLICT", choice: "local" });
          }
        }
      } catch (error) {
        // 네트워크 실패는 offline, 서버가 거절했거나 응답 형태가 잘못된 경우는 error로 나눈다.
        dispatch({
          type:
            error instanceof PatrolDraftNetworkError
              ? "SAVE_OFFLINE"
              : "SAVE_ERROR",
        });
        needsBackupRef.current = true;
        const latest = stateRef.current;
        writeDraftBackup(userId, {
          revision: latest.revision,
          savedAt: new Date().toISOString(),
          payload: latest.content,
        });
      } finally {
        inflightSaveRef.current = null;
      }
    })();
    inflightSaveRef.current = request;
    return request;
  }, [adapter, dispatch, userId]);

  // 진입 시 로컬 백업이 서버 초안 이후에 만든 입력이면 복원한다(복원 후 디바운스 저장이 재전송).
  useEffect(() => {
    const backup = readDraftBackup(userId);
    if (!backup) return;
    if (
      backup.revision >= initialDraft.revision &&
      !isSameContent(backup.payload, initialDraft.content)
    ) {
      needsBackupRef.current = true;
      dispatch({
        type: "RESTORE_BACKUP",
        content: backup.payload,
        revision: initialDraft.revision,
      });
    } else {
      clearDraftBackup(userId);
    }
    // 마운트 시 한 번만 판단한다. initialDraft는 서버가 준 초기값이다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, dispatch]);

  // 오프라인·저장 실패 이후의 추가 입력도 백업에 반영한다.
  useEffect(() => {
    if (!needsBackupRef.current) return;
    if (
      state.status !== "dirty" &&
      state.status !== "offline" &&
      state.status !== "error"
    ) {
      return;
    }
    writeDraftBackup(userId, {
      revision: state.revision,
      savedAt: new Date().toISOString(),
      payload: state.content,
    });
  }, [state.status, state.content, state.revision, userId]);

  // 입력이 멈춘 뒤 1초 후 저장. 입력이 이어지면 타이머를 다시 건다.
  // revision을 의존성에 넣어, 저장 중 들어온 입력이 요청 종료 후 다시 저장되게 한다.
  useEffect(() => {
    if (state.status !== "dirty") return;
    const timer = setTimeout(() => void save(), SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [state.status, state.content, state.revision, save]);

  // 네트워크가 돌아오면 오프라인 상태의 초안을 재전송한다.
  useEffect(() => {
    function handleOnline() {
      if (stateRef.current.status === "offline") void save();
    }
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [save]);

  // 탭 복귀 시 저장 안 된 입력이 없는 상태에서만 서버 초안을 다시 읽고, revision이 더 크면 교체한다.
  useEffect(() => {
    let cancelled = false;
    async function refetch() {
      if (document.visibilityState !== "visible") return;
      const { status } = stateRef.current;
      if (status !== "clean" && status !== "saved") return;
      if (inflightSaveRef.current || refetchingRef.current) return;

      refetchingRef.current = true;
      try {
        const draft = await adapter.fetchDraft(userId);
        // 응답 도착 시점의 status는 reducer가 다시 확인한다(dirty·saving이면 무시).
        if (draft && !cancelled) {
          dispatch({ type: "REPLACE_FROM_SERVER", draft });
        }
      } catch {
        // 재조회 실패는 조용히 넘기고 다음 복귀 때 다시 시도한다.
      } finally {
        refetchingRef.current = false;
      }
    }
    document.addEventListener("visibilitychange", refetch);
    window.addEventListener("focus", refetch);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", refetch);
      window.removeEventListener("focus", refetch);
    };
  }, [adapter, dispatch, userId]);

  async function handleComplete() {
    // 같은 틱의 연타는 React state(flushing)가 갱신되기 전이라 ref로 동기 차단한다.
    if (completingRef.current) return;
    if (stateRef.current.completing) return;
    completingRef.current = true;
    setFlushing(true);
    try {
      // 재시도 대기 중에는 입력이 잠겨 있고 서버 초안이 이미 비워졌을 수 있으므로 저장 flush 없이 곧바로 재요청한다.
      if (!stateRef.current.completeRetry) {
        // 대기 중인 저장을 먼저 끝낸다. 저장 중 입력이 들어오면 다시 dirty가 되므로 몇 번 반복한다.
        for (let i = 0; i < MAX_FLUSH_ATTEMPTS; i++) {
          const { status } = stateRef.current;
          if (status === "saving") {
            await inflightSaveRef.current;
          } else if (
            status === "dirty" ||
            status === "offline" ||
            status === "error"
          ) {
            await save();
          } else {
            break;
          }
        }
        const { status } = stateRef.current;
        if (status !== "saved" && status !== "clean") {
          // conflict는 충돌 다이얼로그가 이미 떠 있으므로 토스트를 중복해서 띄우지 않는다.
          if (status === "offline") {
            toast.error("오프라인이라 완료할 수 없습니다");
          } else if (status === "error") {
            toast.error("저장에 실패해 완료하지 못했습니다");
          } else if (status === "dirty" || status === "saving") {
            toast.error("입력이 계속 바뀌어 완료하지 못했습니다");
          }
          return;
        }
      }

      dispatch({ type: "COMPLETE_START" });
      // 응답이 유실돼 재시도할 때도 같은 요청 ID·같은 revision을 보내 서버 멱등 처리(duplicate)를 탄다.
      requestIdRef.current ??= crypto.randomUUID();
      const requestId = requestIdRef.current;
      try {
        const result = await adapter.completePatrol(
          requestId,
          stateRef.current.revision,
        );
        requestIdRef.current = null;
        if (result.status === "conflict") {
          dispatch({
            type: "COMPLETE_CONFLICT",
            serverRevision: result.serverRevision,
            serverDraft: result.serverDraft,
          });
          toast.error("다른 기기에서 수정되어 순찰이 기록되지 않았습니다");
        } else {
          dispatch({
            type: "COMPLETE_OK",
            logId: result.logId,
            patrolledAt: result.patrolledAt,
            revision: result.revision,
          });
          clearDraftBackup(userId);
          needsBackupRef.current = false;
          // 복사·다음 순찰 버튼이 없으므로 완료 즉시 다음 순찰 입력 상태로 돌아간다.
          dispatch({ type: "NEXT_PATROL" });
          toast.success("순찰 완료 기록됨");
        }
      } catch (error) {
        if (error instanceof PatrolDraftNetworkError) {
          // 서버가 처리했는지 알 수 없으므로 요청 ID를 유지한 채 재시도를 기다린다.
          dispatch({ type: "COMPLETE_FAILED" });
          toast.error(
            "연결이 끊겨 완료 여부를 확인하지 못했습니다. 다시 시도해 주세요",
          );
        } else {
          requestIdRef.current = null;
          dispatch({ type: "COMPLETE_REJECTED" });
          toast.error("순찰을 기록하지 못했습니다");
        }
      }
    } finally {
      completingRef.current = false;
      setFlushing(false);
    }
  }

  return { state, dispatch, handleComplete, flushing };
}
