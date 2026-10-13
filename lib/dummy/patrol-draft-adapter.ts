// 가짜 초안 어댑터. 메모리에 서버 초안·revision을 두고 지연·충돌·오프라인을 흉내 낸다.
// Task 018에서 Supabase RPC 구현으로 교체하며 삭제한다.
import { EMPTY_PATROL_CONTENT } from "@/lib/patrol-form-reducer";
import type {
  CompletePatrolResult,
  PatrolContent,
  PatrolDraft,
  PatrolDraftAdapter,
  SaveDraftResult,
} from "@/lib/types/patrol";

export type FakeAdapterMode = "ok" | "conflict" | "offline";

let mode: FakeAdapterMode = "ok";
let serverDraft: PatrolDraft = {
  revision: 0,
  updatedAt: new Date().toISOString(),
  content: EMPTY_PATROL_CONTENT,
};
const completedByRequestId = new Map<
  string,
  Extract<CompletePatrolResult, { status: "ok" | "duplicate" }>
>();

function delay(): Promise<void> {
  const ms = 300 + Math.random() * 500;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 충돌 응답용 서버 초안. 다른 기기에서 수정한 것처럼 revision을 올린다. */
function makeConflictDraft(): PatrolDraft {
  serverDraft = {
    revision: serverDraft.revision + 1,
    updatedAt: new Date().toISOString(),
    content: {
      ...EMPTY_PATROL_CONTENT,
      standing: [7],
      memo: "다른 기기에서 저장한 내용",
    },
  };
  return serverDraft;
}

export const fakePatrolAdapter: PatrolDraftAdapter & {
  setMode(next: FakeAdapterMode): void;
} = {
  setMode(next) {
    mode = next;
  },

  async saveDraft(
    baseRevision: number,
    content: PatrolContent,
  ): Promise<SaveDraftResult> {
    await delay();
    if (mode === "offline") throw new Error("네트워크에 연결할 수 없습니다.");
    if (mode === "conflict" || baseRevision !== serverDraft.revision) {
      const draft = mode === "conflict" ? makeConflictDraft() : serverDraft;
      return {
        status: "conflict",
        serverRevision: draft.revision,
        serverDraft: draft,
      };
    }
    serverDraft = {
      revision: serverDraft.revision + 1,
      updatedAt: new Date().toISOString(),
      content,
    };
    return { status: "ok", revision: serverDraft.revision };
  },

  async completePatrol(
    requestId: string,
    expectedRevision: number,
  ): Promise<CompletePatrolResult> {
    await delay();
    if (mode === "offline") throw new Error("네트워크에 연결할 수 없습니다.");
    const previous = completedByRequestId.get(requestId);
    if (previous) return { ...previous, status: "duplicate" };
    if (mode === "conflict" || expectedRevision !== serverDraft.revision) {
      if (mode === "conflict") makeConflictDraft();
      return { status: "conflict", serverRevision: serverDraft.revision };
    }
    // 완료 시 서버 초안은 빈 값 + revision+1로 초기화된다.
    serverDraft = {
      revision: serverDraft.revision + 1,
      updatedAt: new Date().toISOString(),
      content: EMPTY_PATROL_CONTENT,
    };
    const result = {
      status: "ok" as const,
      logId: `fake-log-${crypto.randomUUID()}`,
      patrolledAt: new Date().toISOString(),
      revision: serverDraft.revision,
    };
    completedByRequestId.set(requestId, result);
    return result;
  },
};

declare global {
  interface Window {
    __fakePatrolAdapter?: { setMode(mode: FakeAdapterMode): void };
  }
}

// 개발 환경에서만 브라우저 콘솔로 모드를 바꿀 수 있게 노출한다.
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  window.__fakePatrolAdapter = { setMode: fakePatrolAdapter.setMode };
}
