import type {
  CompletePatrolResult,
  PatrolContent,
  PatrolDraft,
  PatrolLog,
  QuickTag,
  SaveDraftResult,
} from "@/lib/types/patrol";

import type { Json, Tables } from "./database.types";

type JsonObject = { [key: string]: Json | undefined };

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function expectObject(value: unknown, where: string): JsonObject {
  if (!isObject(value)) throw new Error(`${where}: 객체가 아닙니다.`);
  return value;
}

function expectString(value: unknown, where: string): string {
  if (typeof value !== "string")
    throw new Error(`${where}: 문자열이 아닙니다.`);
  return value;
}

function expectNumber(value: unknown, where: string): number {
  if (typeof value !== "number") throw new Error(`${where}: 숫자가 아닙니다.`);
  return value;
}

function expectNumberArray(value: unknown, where: string): number[] {
  if (!Array.isArray(value) || !value.every((v) => typeof v === "number")) {
    throw new Error(`${where}: 숫자 배열이 아닙니다.`);
  }
  return value;
}

/** patrol_logs 행 + 작성자 이름(staff_names.full_name). client_request_id는 제외한다. */
export function toPatrolLog(
  row: Omit<Tables<"patrol_logs">, "client_request_id">,
  authorName: string,
): PatrolLog {
  return {
    id: row.id,
    businessDate: row.business_date,
    patrolledAt: row.patrolled_at,
    authorId: row.author_id,
    authorName,
    standing: row.standing,
    cafe_zone: row.cafe_zone,
    drowsy: row.drowsy,
    away: row.away,
    memo: row.memo ?? "",
  };
}

function toContent(row: {
  standing: number[];
  cafe_zone: number[];
  drowsy: number[];
  away: number[];
  memo: string;
}): PatrolContent {
  return {
    standing: row.standing,
    cafe_zone: row.cafe_zone,
    drowsy: row.drowsy,
    away: row.away,
    memo: row.memo,
  };
}

/** patrol_drafts 행 → PatrolDraft. */
export function toPatrolDraft(row: Tables<"patrol_drafts">): PatrolDraft {
  return {
    revision: row.revision,
    updatedAt: row.updated_at,
    content: toContent(row),
  };
}

/** quick_tags 행 → QuickTag. */
export function toQuickTag(row: Tables<"quick_tags">): QuickTag {
  return {
    id: row.id,
    label: row.label,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  };
}

/** RPC가 돌려주는 평평한 server_draft JSON → PatrolDraft. */
function parseServerDraft(value: unknown): PatrolDraft {
  const d = expectObject(value, "server_draft");
  return {
    revision: expectNumber(d.revision, "server_draft.revision"),
    updatedAt: expectString(d.updated_at, "server_draft.updated_at"),
    content: {
      standing: expectNumberArray(d.standing, "server_draft.standing"),
      cafe_zone: expectNumberArray(d.cafe_zone, "server_draft.cafe_zone"),
      drowsy: expectNumberArray(d.drowsy, "server_draft.drowsy"),
      away: expectNumberArray(d.away, "server_draft.away"),
      memo: expectString(d.memo, "server_draft.memo"),
    },
  };
}

/** save_patrol_draft 응답(Json) → SaveDraftResult. 형태가 다르면 Error. */
export function toSaveDraftResult(json: Json): SaveDraftResult {
  const r = expectObject(json, "save_patrol_draft");
  switch (r.status) {
    case "ok":
      return {
        status: "ok",
        revision: expectNumber(r.revision, "save_patrol_draft.revision"),
        updatedAt: expectString(r.updated_at, "save_patrol_draft.updated_at"),
      };
    case "conflict":
      return {
        status: "conflict",
        serverRevision: expectNumber(
          r.server_revision,
          "save_patrol_draft.server_revision",
        ),
        serverDraft: parseServerDraft(r.server_draft),
      };
    default:
      throw new Error("save_patrol_draft: 알 수 없는 status입니다.");
  }
}

/** complete_patrol 응답(Json) → CompletePatrolResult. 형태가 다르면 Error. */
export function toCompletePatrolResult(json: Json): CompletePatrolResult {
  const r = expectObject(json, "complete_patrol");
  switch (r.status) {
    case "ok":
    case "duplicate":
      return {
        status: r.status,
        logId: expectString(r.log_id, "complete_patrol.log_id"),
        patrolledAt: expectString(
          r.patrolled_at,
          "complete_patrol.patrolled_at",
        ),
        revision: expectNumber(r.revision, "complete_patrol.revision"),
      };
    case "conflict":
      return {
        status: "conflict",
        serverRevision: expectNumber(
          r.server_revision,
          "complete_patrol.server_revision",
        ),
        serverDraft: parseServerDraft(r.server_draft),
      };
    default:
      throw new Error("complete_patrol: 알 수 없는 status입니다.");
  }
}
