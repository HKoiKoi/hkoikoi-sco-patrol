"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { toast } from "sonner";

import {
  createInitialPatrolFormState,
  patrolFormReducer,
  type PatrolFormAction,
} from "@/lib/patrol-form-reducer";
import type { Viewer } from "@/lib/types/auth";
import type { PatrolDraftAdapter, QuickTag } from "@/lib/types/patrol";

import { ConflictDialog } from "./conflict-dialog";
import { MemoInput } from "./memo-input";
import { ACTION_BAR_SPACER_CLASS, PatrolActionBar } from "./patrol-action-bar";
import { QuickTagBar } from "./quick-tag-bar";
import { SaveStatus } from "./save-status";
import { SeatCategoryInput } from "./seat-category-input";

/** 마지막 입력 후 자동 저장까지 기다리는 시간 */
const SAVE_DEBOUNCE_MS = 1000;
/** 완료 직전 flush에서 저장을 다시 시도하는 최대 횟수 */
const MAX_FLUSH_ATTEMPTS = 3;

interface PatrolFormProps {
  viewer: Viewer;
  /** 초안 저장·순찰 완료 어댑터 (page.tsx에서 주입) */
  adapter: PatrolDraftAdapter;
  quickTags: QuickTag[];
}

// 순찰 입력 폼: 좌석 4종(모바일 1열, md 이상 2x2) → 메모(라벨, 퀵 태그, 입력창) 순으로 세로 배치
export function PatrolForm({ adapter, quickTags }: PatrolFormProps) {
  const [state, rawDispatch] = useReducer(
    patrolFormReducer,
    undefined,
    createInitialPatrolFormState,
  );
  // 비동기 흐름(완료 직전 flush 등)이 최신 상태를 읽도록 reducer 결과를 ref에 미러링한다.
  const stateRef = useRef(state);
  const inflightSaveRef = useRef<Promise<void> | null>(null);
  // 완료 재시도 시 같은 요청 ID를 써서 서버 멱등 처리를 탄다.
  const requestIdRef = useRef<string | null>(null);
  // 클릭 직후 COMPLETE_START 전까지(저장 flush 중) 버튼을 잠근다.
  const [flushing, setFlushing] = useState(false);

  const dispatch = useCallback((action: PatrolFormAction) => {
    stateRef.current = patrolFormReducer(stateRef.current, action);
    rawDispatch(action);
  }, []);

  const save = useCallback((): Promise<void> => {
    dispatch({ type: "SAVE_START" });
    const { status, revision, content } = stateRef.current;
    // reducer가 시작을 거절했다면(이미 저장 중·완료 등) 요청을 보내지 않는다.
    if (status !== "saving")
      return inflightSaveRef.current ?? Promise.resolve();

    const request = (async () => {
      try {
        const result = await adapter.saveDraft(revision, content);
        if (result.status === "ok") {
          dispatch({
            type: "SAVE_OK",
            revision: result.revision,
            savedAt: new Date().toISOString(),
          });
        } else {
          dispatch({ type: "SAVE_CONFLICT", serverDraft: result.serverDraft });
        }
      } catch {
        dispatch({ type: "SAVE_OFFLINE" });
      }
    })();
    inflightSaveRef.current = request;
    return request;
  }, [adapter, dispatch]);

  // 입력이 멈춘 뒤 1초 후 저장. 입력이 이어지면 타이머를 다시 건다.
  useEffect(() => {
    if (state.status !== "dirty") return;
    const timer = setTimeout(() => void save(), SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [state.status, state.content, save]);

  async function handleComplete() {
    if (flushing || stateRef.current.completing) return;
    setFlushing(true);
    try {
      // 대기 중인 저장을 먼저 끝낸다. 저장 중 입력이 들어오면 다시 dirty가 되므로 몇 번 반복한다.
      for (let i = 0; i < MAX_FLUSH_ATTEMPTS; i++) {
        const { status } = stateRef.current;
        if (status === "saving") {
          await inflightSaveRef.current;
        } else if (status === "dirty" || (status === "offline" && i === 0)) {
          await save();
        } else {
          break;
        }
      }
      const current = stateRef.current;
      if (current.status !== "saved" && current.status !== "clean") {
        if (current.status === "offline") {
          toast.error("오프라인이라 완료할 수 없음");
        }
        return;
      }

      dispatch({ type: "COMPLETE_START" });
      requestIdRef.current ??= crypto.randomUUID();
      const requestId = requestIdRef.current;
      try {
        const result = await adapter.completePatrol(
          requestId,
          current.revision,
        );
        if (result.status === "conflict") {
          requestIdRef.current = null;
          dispatch({
            type: "COMPLETE_CONFLICT",
            serverRevision: result.serverRevision,
            serverDraft: result.serverDraft,
          });
        } else {
          requestIdRef.current = null;
          dispatch({
            type: "COMPLETE_OK",
            logId: result.logId,
            patrolledAt: result.patrolledAt,
            revision: result.revision,
          });
          // 복사·다음 순찰 버튼이 없으므로 완료 즉시 다음 순찰 입력 상태로 돌아간다.
          dispatch({ type: "NEXT_PATROL" });
          toast.success("순찰 완료 기록됨");
        }
      } catch {
        dispatch({ type: "COMPLETE_FAILED" });
      }
    } finally {
      setFlushing(false);
    }
  }

  return (
    <div className={`space-y-4 ${ACTION_BAR_SPACER_CLASS}`}>
      <div className="flex justify-end">
        <SaveStatus status={state.status} lastSavedAt={state.lastSavedAt} />
      </div>

      {/* 좌석 입력: 스탠딩 | 카페존 / 졸음/딴짓 | 자리비움 */}
      <section aria-label="좌석 입력" className="min-w-0">
        <SeatCategoryInput
          seats={{
            standing: state.content.standing,
            cafe_zone: state.content.cafe_zone,
            drowsy: state.content.drowsy,
            away: state.content.away,
          }}
          onAddSeat={(category, seat) =>
            dispatch({ type: "ADD_SEAT", category, seat })
          }
          onRemoveSeat={(category, seat) =>
            dispatch({ type: "REMOVE_SEAT", category, seat })
          }
        />
      </section>

      {/* 메모: 라벨 → 퀵 태그 → 입력창 */}
      <section aria-label="태그와 메모" className="flex min-w-0 flex-col gap-4">
        <MemoInput
          value={state.content.memo}
          onChange={(memo) => dispatch({ type: "SET_MEMO", memo })}
        >
          <QuickTagBar
            tags={quickTags}
            onAppend={(label) => dispatch({ type: "APPEND_TAG", label })}
          />
        </MemoInput>
      </section>

      <PatrolActionBar
        completing={state.completing || flushing}
        onComplete={() => void handleComplete()}
      />
      <ConflictDialog
        open={state.status === "conflict"}
        onChooseLocal={() =>
          dispatch({ type: "RESOLVE_CONFLICT", choice: "local" })
        }
        onChooseServer={() =>
          dispatch({ type: "RESOLVE_CONFLICT", choice: "server" })
        }
      />
    </div>
  );
}
