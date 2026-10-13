/** 좌석 카테고리 (patrol_logs / patrol_drafts의 int[] 컬럼 이름과 동일). */
export type SeatCategory = "standing" | "cafe_zone" | "drowsy" | "away";

/** 카테고리별 좌석 번호 배열. 양의 정수, 카테고리 내 중복 없음. */
export type SeatSet = Record<SeatCategory, number[]>;

/** 순찰 입력 내용 (초안·로컬 백업·완료 입력의 공통 구조). memo는 2,000자 이하. */
export type PatrolContent = SeatSet & { memo: string };

/** 확정 순찰 기록 (patrol_logs). 시각은 서버가 만든 ISO 문자열. */
export interface PatrolLog extends PatrolContent {
  id: string;
  /** 영업일 (YYYY-MM-DD, 04:00 KST 경계) */
  businessDate: string;
  patrolledAt: string;
  authorId: string;
  /** staff_names.full_name */
  authorName: string;
}

/** 작성 중 초안 (patrol_drafts). */
export interface PatrolDraft {
  revision: number;
  updatedAt: string;
  content: PatrolContent;
}

/** 퀵 태그 (quick_tags). */
export interface QuickTag {
  id: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
}

/** save_patrol_draft RPC 응답. */
export type SaveDraftResult =
  | { status: "ok"; revision: number }
  | { status: "conflict"; serverRevision: number; serverDraft: PatrolDraft };

/** complete_patrol RPC 응답. duplicate는 같은 요청 ID의 재요청. */
export type CompletePatrolResult =
  | {
      status: "ok" | "duplicate";
      logId: string;
      patrolledAt: string;
      revision: number;
    }
  | { status: "conflict"; serverRevision: number };

/** 초안 저장·순찰 완료 어댑터. 더미(가짜)와 Supabase RPC 구현이 같은 계약을 따른다. */
export interface PatrolDraftAdapter {
  saveDraft(
    baseRevision: number,
    content: PatrolContent,
  ): Promise<SaveDraftResult>;
  completePatrol(
    requestId: string,
    expectedRevision: number,
  ): Promise<CompletePatrolResult>;
}

/** Server Action 공통 반환 형태. */
export type ActionResult<T> =
  { ok: true; data: T } | { ok: false; error: string };

/** localStorage `draft:{user_id}` 백업 값. */
export interface DraftBackup {
  revision: number;
  savedAt: string;
  payload: PatrolContent;
}
