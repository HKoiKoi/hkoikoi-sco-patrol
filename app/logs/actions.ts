"use server";

import { refresh } from "next/cache";

import { requireStaff } from "@/lib/auth/dal";
import { MEMO_MAX_LENGTH } from "@/lib/patrol-format";
import {
  moveAwaySeat as moveAwaySeatInSeats,
  removeSeat,
  validateSeatList,
} from "@/lib/seat-numbers";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, PatrolContent } from "@/lib/types/patrol";

// 기록 수정·삭제와 자리비움 처리 Server Action.
// 권한의 최종 판단은 RLS·컬럼 GRANT이며, 거부된 행은 에러가 아니라 0행으로 돌아온다.
// requireStaff는 redirect를 던지므로 try/catch 밖에서 호출한다.

type LogResult = ActionResult<null>;

const ERROR_FORBIDDEN = "권한이 없거나 삭제된 기록입니다";
const ERROR_INVALID = "잘못된 요청입니다";
const ERROR_SAVE_FAILED = "저장하지 못했습니다. 잠시 후 다시 시도해 주세요";
const ERROR_DELETE_FAILED = "삭제하지 못했습니다. 잠시 후 다시 시도해 주세요";
const ERROR_SEAT_GONE = "이미 처리된 자리비움 번호입니다";
const ERROR_MEMO_TOO_LONG = `메모는 ${MEMO_MAX_LENGTH.toLocaleString("ko-KR")}자 이하로 입력하세요`;

const OK: LogResult = { ok: true, data: null };

type AwayTarget = "standing" | "cafe_zone";

function isValidId(id: unknown): id is string {
  return typeof id === "string" && id.length > 0;
}

function isValidSeat(seat: unknown): seat is number {
  return typeof seat === "number" && Number.isSafeInteger(seat) && seat > 0;
}

/** update 결과를 ActionResult로 바꾼다. 0행은 권한 없음 또는 삭제된 기록이다. */
function toResult(
  error: unknown,
  rows: { id: string }[] | null,
  failedMessage: string,
): LogResult {
  if (error) return { ok: false, error: failedMessage };
  if (!rows || rows.length === 0) return { ok: false, error: ERROR_FORBIDDEN };
  refresh();
  return OK;
}

/** 좌석 4종과 메모를 수정한다. 완료 시각·영업일·작성자는 받지 않는다. */
export async function updatePatrolLog(
  id: string,
  content: PatrolContent,
): Promise<LogResult> {
  await requireStaff("/logs");

  if (!isValidId(id) || typeof content !== "object" || content === null) {
    return { ok: false, error: ERROR_INVALID };
  }
  const standing = validateSeatList(content.standing);
  const cafeZone = validateSeatList(content.cafe_zone);
  const drowsy = validateSeatList(content.drowsy);
  const away = validateSeatList(content.away);
  if (!standing || !cafeZone || !drowsy || !away) {
    return { ok: false, error: ERROR_INVALID };
  }
  if (typeof content.memo !== "string") {
    return { ok: false, error: ERROR_INVALID };
  }
  if (content.memo.length > MEMO_MAX_LENGTH) {
    return { ok: false, error: ERROR_MEMO_TOO_LONG };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("patrol_logs")
    .update({
      standing,
      cafe_zone: cafeZone,
      drowsy,
      away,
      memo: content.memo,
    })
    .eq("id", id)
    .select("id");

  return toResult(error, data, ERROR_SAVE_FAILED);
}

export async function deletePatrolLog(id: string): Promise<LogResult> {
  await requireStaff("/logs");

  if (!isValidId(id)) return { ok: false, error: ERROR_INVALID };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("patrol_logs")
    .delete()
    .eq("id", id)
    .select("id");

  return toResult(error, data, ERROR_DELETE_FAILED);
}

/** 자리비움 번호를 스탠딩/카페존으로 옮긴다. 대상에 이미 있으면 자리비움에서 제거만 한다. */
export async function moveAwaySeat(
  id: string,
  seat: number,
  target: AwayTarget,
): Promise<LogResult> {
  await requireStaff("/logs");

  if (
    !isValidId(id) ||
    !isValidSeat(seat) ||
    (target !== "standing" && target !== "cafe_zone")
  ) {
    return { ok: false, error: ERROR_INVALID };
  }

  const supabase = await createClient();
  const { data: row, error: readError } = await supabase
    .from("patrol_logs")
    .select("standing, cafe_zone, away")
    .eq("id", id)
    .maybeSingle();
  if (readError) return { ok: false, error: ERROR_SAVE_FAILED };
  if (!row) return { ok: false, error: ERROR_FORBIDDEN };
  if (!row.away.includes(seat)) return { ok: false, error: ERROR_SEAT_GONE };

  // 동시 수정은 마지막 저장이 우선한다(PRD).
  const next = moveAwaySeatInSeats(row, seat, target);
  const { data, error } = await supabase
    .from("patrol_logs")
    .update({
      standing: next.standing,
      cafe_zone: next.cafe_zone,
      away: next.away,
    })
    .eq("id", id)
    .select("id");

  return toResult(error, data, ERROR_SAVE_FAILED);
}

/** 자리비움 번호를 어느 카테고리로도 옮기지 않고 삭제한다. */
export async function removeAwaySeat(
  id: string,
  seat: number,
): Promise<LogResult> {
  await requireStaff("/logs");

  if (!isValidId(id) || !isValidSeat(seat)) {
    return { ok: false, error: ERROR_INVALID };
  }

  const supabase = await createClient();
  const { data: row, error: readError } = await supabase
    .from("patrol_logs")
    .select("away")
    .eq("id", id)
    .maybeSingle();
  if (readError) return { ok: false, error: ERROR_SAVE_FAILED };
  if (!row) return { ok: false, error: ERROR_FORBIDDEN };
  if (!row.away.includes(seat)) return { ok: false, error: ERROR_SEAT_GONE };

  const { data, error } = await supabase
    .from("patrol_logs")
    .update({ away: removeSeat(row.away, seat) })
    .eq("id", id)
    .select("id");

  return toResult(error, data, ERROR_SAVE_FAILED);
}
