// 좌석 번호 입력·목록 처리. 양의 정수만 허용하며 상한은 없다.
import type { SeatSet } from "@/lib/types/patrol";

/** 키패드 입력 문자열을 좌석 번호로 변환한다. 양의 정수가 아니면 null. */
export function parseSeatInput(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

/** 오름차순 정렬 + 중복 제거한 새 배열을 반환한다. */
export function normalizeSeats(list: readonly number[]): number[] {
  return [...new Set(list)].sort((a, b) => a - b);
}

export type AddSeatResult =
  { ok: true; seats: number[] } | { ok: false; reason: "duplicate" };

/** 같은 카테고리 안에서 중복이면 거부한다. 성공 시 정규화된 새 배열을 담는다. */
export function addSeat(list: readonly number[], n: number): AddSeatResult {
  if (list.includes(n)) return { ok: false, reason: "duplicate" };
  return { ok: true, seats: normalizeSeats([...list, n]) };
}

export function removeSeat(list: readonly number[], n: number): number[] {
  return list.filter((seat) => seat !== n);
}

/**
 * 자리비움 번호를 스탠딩/카페존으로 옮긴다.
 * 대상에 이미 있으면 자리비움에서 제거만 한다.
 */
export function moveAwaySeat<
  T extends Pick<SeatSet, "away" | "standing" | "cafe_zone">,
>(seats: T, n: number, target: "standing" | "cafe_zone"): T {
  const away = removeSeat(seats.away, n);
  const targetList = seats[target].includes(n)
    ? [...seats[target]]
    : normalizeSeats([...seats[target], n]);
  return { ...seats, away, [target]: targetList };
}
