// 순찰 입력 폼 상태 전이. 순수 함수만 두며 시각·revision은 서버 응답값만 사용한다.
import { MEMO_MAX_LENGTH } from "@/lib/patrol-format";
import { addSeat, removeSeat } from "@/lib/seat-numbers";
import type {
  PatrolContent,
  PatrolDraft,
  SeatCategory,
} from "@/lib/types/patrol";

export type PatrolFormStatus =
  "clean" | "dirty" | "saving" | "saved" | "offline" | "error" | "conflict";

export interface CompletedPatrol {
  logId: string;
  patrolledAt: string;
  revision: number;
  /** 완료 시점에 제출된 입력 내용 (결과 화면·복사 문구용) */
  content: PatrolContent;
}

export interface PatrolFormState {
  content: PatrolContent;
  revision: number;
  status: PatrolFormStatus;
  /** 마지막 저장 성공 시각 (서버 응답 기준 ISO 문자열) */
  lastSavedAt: string | null;
  completed: CompletedPatrol | null;
  conflictDraft: PatrolDraft | null;
  completing: boolean;
  /** 저장 요청에 실어 보낸 content 스냅샷. SAVE_OK에서 최신 입력과 비교한다. */
  savingContent: PatrolContent | null;
}

export type PatrolFormAction =
  | { type: "ADD_SEAT"; category: SeatCategory; seat: number }
  | { type: "REMOVE_SEAT"; category: SeatCategory; seat: number }
  | { type: "SET_MEMO"; memo: string }
  | { type: "APPEND_TAG"; label: string }
  | { type: "SAVE_START" }
  | { type: "SAVE_OK"; revision: number; savedAt: string | null }
  | { type: "SAVE_CONFLICT"; serverDraft: PatrolDraft }
  | { type: "SAVE_OFFLINE" }
  /** 서버가 저장을 거절한 경우(권한·검증·DB 오류). 네트워크 실패(offline)와 구분한다. */
  | { type: "SAVE_ERROR" }
  | { type: "RESOLVE_CONFLICT"; choice: "local" | "server" }
  | { type: "COMPLETE_START" }
  | {
      type: "COMPLETE_OK";
      logId: string;
      patrolledAt: string;
      revision: number;
    }
  | {
      type: "COMPLETE_CONFLICT";
      serverRevision: number;
      serverDraft: PatrolDraft;
    }
  /** 완료 요청이 네트워크 오류 등으로 응답 없이 끝난 경우. 같은 요청 ID로 다시 시도할 수 있게 풀어 준다. */
  | { type: "COMPLETE_FAILED" }
  | { type: "NEXT_PATROL" }
  /** 탭 포커스 복귀 시 서버 초안 반영. 깨끗한 상태에서 서버 revision이 더 클 때만 교체한다. */
  | { type: "REPLACE_FROM_SERVER"; draft: PatrolDraft }
  /** 마운트 시 로컬 백업 복원. 서버에 아직 저장되지 않은 내용이므로 dirty로 둔다. */
  | { type: "RESTORE_BACKUP"; content: PatrolContent; revision: number };

export const EMPTY_PATROL_CONTENT: PatrolContent = {
  standing: [],
  cafe_zone: [],
  drowsy: [],
  away: [],
  memo: "",
};

export function createInitialPatrolFormState(
  draft?: Pick<PatrolDraft, "revision" | "content" | "updatedAt"> | null,
): PatrolFormState {
  return {
    content: draft ? draft.content : EMPTY_PATROL_CONTENT,
    revision: draft?.revision ?? 0,
    status: "clean",
    lastSavedAt: null,
    completed: null,
    conflictDraft: null,
    completing: false,
    savingContent: null,
  };
}

function clampMemo(memo: string): string {
  return memo.length > MEMO_MAX_LENGTH ? memo.slice(0, MEMO_MAX_LENGTH) : memo;
}

function isSameContent(a: PatrolContent, b: PatrolContent): boolean {
  const categories: SeatCategory[] = [
    "standing",
    "cafe_zone",
    "drowsy",
    "away",
  ];
  return (
    a.memo === b.memo &&
    categories.every(
      (c) => a[c].length === b[c].length && a[c].every((n, i) => n === b[c][i]),
    )
  );
}

/** 입력이 바뀐 뒤의 상태. 충돌 중이면 충돌을, 그 외에는 dirty를 유지한다. */
function withEdit(state: PatrolFormState, content: PatrolContent) {
  return {
    ...state,
    content,
    status: state.status === "conflict" ? state.status : ("dirty" as const),
  };
}

export function patrolFormReducer(
  state: PatrolFormState,
  action: PatrolFormAction,
): PatrolFormState {
  // 완료 결과 화면과 완료 요청 중에는 입력을 받지 않는다.
  const editable = state.completed === null && !state.completing;

  switch (action.type) {
    case "ADD_SEAT": {
      if (!editable) return state;
      const result = addSeat(state.content[action.category], action.seat);
      if (!result.ok) return state;
      return withEdit(state, {
        ...state.content,
        [action.category]: result.seats,
      });
    }
    case "REMOVE_SEAT": {
      if (!editable) return state;
      const list = state.content[action.category];
      if (!list.includes(action.seat)) return state;
      return withEdit(state, {
        ...state.content,
        [action.category]: removeSeat(list, action.seat),
      });
    }
    case "SET_MEMO": {
      if (!editable) return state;
      const memo = clampMemo(action.memo);
      if (memo === state.content.memo) return state;
      return withEdit(state, { ...state.content, memo });
    }
    case "APPEND_TAG": {
      if (!editable) return state;
      const { memo } = state.content;
      const next = clampMemo(memo ? `${memo}\n${action.label}` : action.label);
      if (next === memo) return state;
      return withEdit(state, { ...state.content, memo: next });
    }
    case "SAVE_START": {
      if (
        state.status !== "dirty" &&
        state.status !== "offline" &&
        state.status !== "error"
      ) {
        return state;
      }
      if (!editable) return state;
      return { ...state, status: "saving", savingContent: state.content };
    }
    case "SAVE_OK": {
      // 저장 요청을 보낸 적이 없으면(완료·초기화 등) 무시한다.
      if (state.savingContent === null) return state;
      const unchanged = isSameContent(state.savingContent, state.content);
      return {
        ...state,
        revision: action.revision,
        savingContent: null,
        // 저장 중 입력이 들어왔다면 dirty를 유지해 다시 저장되게 한다.
        status: unchanged ? "saved" : "dirty",
        lastSavedAt: unchanged
          ? (action.savedAt ?? state.lastSavedAt)
          : state.lastSavedAt,
      };
    }
    case "SAVE_CONFLICT":
      if (state.savingContent === null) return state;
      return {
        ...state,
        status: "conflict",
        conflictDraft: action.serverDraft,
        savingContent: null,
      };
    case "SAVE_OFFLINE":
      if (state.savingContent === null) return state;
      return { ...state, status: "offline", savingContent: null };
    case "SAVE_ERROR":
      // 입력은 그대로 두고 자동 재저장하지 않는다. 다음 입력(dirty)이나 명시적 재시도에서만 저장한다.
      if (state.savingContent === null) return state;
      return { ...state, status: "error", savingContent: null };
    case "RESOLVE_CONFLICT": {
      const server = state.conflictDraft;
      if (state.status !== "conflict" || server === null) return state;
      if (action.choice === "local") {
        // 내 내용 유지: 서버 revision을 기준으로 다시 저장한다.
        return {
          ...state,
          revision: server.revision,
          status: "dirty",
          conflictDraft: null,
        };
      }
      return {
        ...state,
        content: server.content,
        revision: server.revision,
        status: "saved",
        lastSavedAt: server.updatedAt || state.lastSavedAt,
        conflictDraft: null,
        savingContent: null,
      };
    }
    case "COMPLETE_START":
      if (state.completed !== null || state.completing) return state;
      return { ...state, completing: true };
    case "COMPLETE_OK": {
      if (state.completed !== null) return state; // duplicate 포함, 한 번만 반영
      return {
        ...state,
        completed: {
          logId: action.logId,
          patrolledAt: action.patrolledAt,
          revision: action.revision,
          content: state.content,
        },
        completing: false,
        // 서버 초안은 빈 값 + revision+1로 초기화된다.
        content: EMPTY_PATROL_CONTENT,
        revision: action.revision,
        status: "clean",
        conflictDraft: null,
        savingContent: null,
      };
    }
    case "COMPLETE_CONFLICT":
      return {
        ...state,
        completing: false,
        status: "conflict",
        savingContent: null,
        conflictDraft: action.serverDraft,
      };
    case "COMPLETE_FAILED":
      if (!state.completing) return state;
      return { ...state, completing: false };
    case "REPLACE_FROM_SERVER": {
      // 저장 안 된 입력·저장 중·충돌·완료 중에는 서버 초안으로 덮어쓰지 않는다.
      if (state.status !== "clean" && state.status !== "saved") return state;
      if (state.completed !== null || state.completing) return state;
      if (action.draft.revision <= state.revision) return state;
      return {
        ...state,
        content: action.draft.content,
        revision: action.draft.revision,
        status: isSameContent(action.draft.content, EMPTY_PATROL_CONTENT)
          ? "clean"
          : "saved",
        lastSavedAt: action.draft.updatedAt || state.lastSavedAt,
        conflictDraft: null,
        savingContent: null,
      };
    }
    case "RESTORE_BACKUP": {
      if (!editable) return state;
      return {
        ...state,
        content: action.content,
        revision: action.revision,
        status: "dirty",
        conflictDraft: null,
        savingContent: null,
      };
    }
    case "NEXT_PATROL":
      if (state.completed === null) return state;
      return { ...createInitialPatrolFormState(), revision: state.revision };
    default:
      return state;
  }
}
