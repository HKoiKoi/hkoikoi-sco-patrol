// 좌석 통계 처리. 요주의 판정은 DB(get_watchlist_seats)가 하므로 여기서 다시 계산하지 않는다.
import type { Database } from "@/lib/supabase/database.types";

/** 요주의 좌석 집계 기간(일). 영업일 기준 오늘을 포함한다. */
export const WATCH_WINDOW_DAYS = 30;

/** 기간 안에 졸음 횟수가 이 값 이상이면 요주의 좌석이다. */
export const WATCH_THRESHOLD = 5;

/** 통계 화면의 요주의 목록에 보여 줄 최대 좌석 수. 카드 강조용 판정(DB)에는 적용하지 않는다. */
export const WATCH_LIST_LIMIT = 10;

/** get_seat_stats가 돌려주는 좌석별 카테고리 횟수 한 행. */
export type SeatStatRow =
  Database["public"]["Functions"]["get_seat_stats"]["Returns"][number];

export type SeatStatCategory = "standing" | "cafe_zone" | "drowsy";

/**
 * 해당 카테고리 횟수가 1회 이상인 좌석을 횟수 내림차순으로 limit개 돌려준다.
 * 동률이면 좌석 번호 오름차순이며 입력 배열은 바꾸지 않는다.
 */
export function topSeats(
  rows: readonly SeatStatRow[],
  category: SeatStatCategory,
  limit = 10,
): SeatStatRow[] {
  const key = `${category}_count` as const;
  return rows
    .filter((row) => row[key] > 0)
    .sort((a, b) => b[key] - a[key] || a.seat - b.seat)
    .slice(0, limit);
}

/**
 * get_watchlist_seats가 돌려준 좌석의 통계 행만 졸음/딴짓 횟수 내림차순으로 limit개 돌려준다.
 * 동률이면 좌석 번호 오름차순이며 입력 배열은 바꾸지 않는다. 요주의 판정은 DB가 하므로 임계값은 다시 비교하지 않는다.
 */
export function watchlistRows(
  rows: readonly SeatStatRow[],
  watchSeats: readonly number[],
  limit = WATCH_LIST_LIMIT,
): SeatStatRow[] {
  const watch = new Set(watchSeats);
  return rows
    .filter((row) => watch.has(row.seat))
    .sort((a, b) => b.drowsy_count - a.drowsy_count || a.seat - b.seat)
    .slice(0, limit);
}
