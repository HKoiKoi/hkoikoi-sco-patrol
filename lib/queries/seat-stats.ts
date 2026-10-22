import "server-only";

import { shiftBusinessDate } from "@/lib/business-date";
import { createClient } from "@/lib/supabase/server";
import {
  WATCH_THRESHOLD,
  WATCH_WINDOW_DAYS,
  type SeatStatRow,
} from "@/lib/stats";

/**
 * 영업일 asOf를 포함한 최근 WATCH_WINDOW_DAYS일의 좌석별 통계와 요주의 좌석 번호를 조회한다.
 * 두 함수는 security invoker라 공개 조회 규칙을 그대로 따르며, 실패 시 Error를 던져 error.tsx가 처리한다.
 */
export async function getSeatStats(
  asOf: string,
): Promise<{ rows: SeatStatRow[]; watchSeats: number[] }> {
  const supabase = await createClient();

  const [stats, watch] = await Promise.all([
    supabase.rpc("get_seat_stats", {
      from_date: shiftBusinessDate(asOf, -(WATCH_WINDOW_DAYS - 1)),
      to_date: asOf,
    }),
    supabase.rpc("get_watchlist_seats", {
      as_of: asOf,
      window_days: WATCH_WINDOW_DAYS,
      threshold: WATCH_THRESHOLD,
    }),
  ]);

  if (stats.error) {
    throw new Error(`좌석 통계 조회 실패: ${stats.error.message}`);
  }
  if (watch.error) {
    throw new Error(`요주의 좌석 조회 실패: ${watch.error.message}`);
  }

  return { rows: stats.data, watchSeats: watch.data };
}
