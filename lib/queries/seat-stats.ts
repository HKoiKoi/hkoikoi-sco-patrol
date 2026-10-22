import "server-only";

import { shiftBusinessDate } from "@/lib/business-date";
import { createClient } from "@/lib/supabase/server";
import {
  WATCH_THRESHOLD,
  WATCH_WINDOW_DAYS,
  type SeatStatRow,
} from "@/lib/stats";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/** get_watchlist_seats 호출. getSeatStats와 getWatchSeats가 같은 인자를 쓰도록 공유한다. */
function rpcWatchlistSeats(supabase: SupabaseServerClient, asOf: string) {
  return supabase.rpc("get_watchlist_seats", {
    as_of: asOf,
    window_days: WATCH_WINDOW_DAYS,
    threshold: WATCH_THRESHOLD,
  });
}

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
    rpcWatchlistSeats(supabase, asOf),
  ]);

  if (stats.error) {
    throw new Error(`좌석 통계 조회 실패: ${stats.error.message}`);
  }
  if (watch.error) {
    throw new Error(`요주의 좌석 조회 실패: ${watch.error.message}`);
  }

  return { rows: stats.data, watchSeats: watch.data };
}

/**
 * 영업일 asOf 기준 요주의 좌석 번호만 조회한다.
 * 일지 카드 강조는 부가 표시라서, 조회에 실패해도 throw하지 않고 빈 배열을 돌려준다.
 * 그래야 요주의 조회 오류가 일지 목록 자체를 막지 않고 모든 카드가 일반 스타일로 보인다.
 */
export async function getWatchSeats(asOf: string): Promise<number[]> {
  const supabase = await createClient();
  const { data, error } = await rpcWatchlistSeats(supabase, asOf);
  return error ? [] : data;
}
