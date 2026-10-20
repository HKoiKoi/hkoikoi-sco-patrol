// 클라이언트 전용: save_patrol_draft / complete_patrol RPC를 브라우저 Supabase 클라이언트로 호출하는 어댑터.
import { createClient } from "@/lib/supabase/client";
import {
  toCompletePatrolResult,
  toPatrolDraft,
  toSaveDraftResult,
} from "@/lib/supabase/mappers";
import type {
  CompletePatrolResult,
  PatrolContent,
  PatrolDraft,
  PatrolDraftAdapter,
  SaveDraftResult,
} from "@/lib/types/patrol";

/** 네트워크 실패(오프라인, 요청 중단 등)로 서버가 응답하지 못한 경우. 로컬 백업 후 재시도 대상이다. */
export class PatrolDraftNetworkError extends Error {
  constructor(options?: { cause?: unknown }) {
    super("네트워크에 연결할 수 없습니다.", options);
    this.name = "PatrolDraftNetworkError";
  }
}

/** 서버가 요청을 거절한 경우(권한·검증·DB 오류 등). 원문은 cause에만 두고 화면에 노출하지 않는다. */
export class PatrolDraftRpcError extends Error {
  /** PostgREST/DB 오류 코드 (없으면 빈 문자열) */
  readonly code: string;
  /** HTTP 상태 코드 */
  readonly status: number;

  constructor(code: string, status: number, options?: { cause?: unknown }) {
    super("서버가 요청을 처리하지 못했습니다.", options);
    this.name = "PatrolDraftRpcError";
    this.code = code;
    this.status = status;
  }
}

interface RpcFailure {
  error: { message: string; code?: string } | null;
  status: number;
}

/**
 * RPC 오류를 분류해 던진다.
 * postgrest-js 2.117.3은 fetch가 reject되면 status 0 + code ""로 오류를 돌려주고(index.cjs의
 * then()/toTransportFailure), 서버가 응답한 오류는 HTTP status > 0과 PostgREST/SQLSTATE code를 담는다.
 */
function throwIfError({ error, status }: RpcFailure): void {
  if (!error) return;
  if (status === 0) {
    throw new PatrolDraftNetworkError({ cause: error });
  }
  throw new PatrolDraftRpcError(error.code ?? "", status, { cause: error });
}

/** Supabase RPC 기반 초안 저장·순찰 완료 어댑터를 만든다. 브라우저에서만 호출한다. */
export function createPatrolDraftAdapter(): PatrolDraftAdapter {
  const supabase = createClient();

  return {
    async saveDraft(
      baseRevision: number,
      content: PatrolContent,
    ): Promise<SaveDraftResult> {
      const response = await supabase.rpc("save_patrol_draft", {
        base_revision: baseRevision,
        standing: content.standing,
        cafe_zone: content.cafe_zone,
        drowsy: content.drowsy,
        away: content.away,
        memo: content.memo,
      });
      throwIfError(response);
      return toSaveDraftResult(response.data);
    },

    async completePatrol(
      requestId: string,
      expectedRevision: number,
    ): Promise<CompletePatrolResult> {
      const response = await supabase.rpc("complete_patrol", {
        client_request_id: requestId,
        expected_revision: expectedRevision,
      });
      throwIfError(response);
      return toCompletePatrolResult(response.data);
    },

    async fetchDraft(userId: string): Promise<PatrolDraft | null> {
      const response = await supabase
        .from("patrol_drafts")
        .select(
          "user_id, revision, updated_at, standing, cafe_zone, drowsy, away, memo",
        )
        .eq("user_id", userId)
        .maybeSingle();
      throwIfError(response);
      return response.data ? toPatrolDraft(response.data) : null;
    },
  };
}
