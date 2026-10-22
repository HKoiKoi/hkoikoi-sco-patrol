// 복사 문구 생성과 입력 정규화. 클라이언트·서버가 공유하는 순수 함수만 둔다.
import { formatKstTime } from "@/lib/business-date";

/** 메모 최대 길이. DB 검증(2,000자 이하)과 같은 값을 쓴다. */
export const MEMO_MAX_LENGTH = 2000;

// \r\n, \n, \r 외에 줄바꿈으로 취급되는 문자(VT, FF, NEL, U+2028/2029)도 분리 기준에 포함한다.
const LINE_BREAK_PATTERN = /\r\n|[\n\r\v\f\u0085\u2028\u2029]/;

// 일반 공백·탭·전각 공백(U+3000)의 연속은 공백 한 칸으로 바꾼다.
const INLINE_SPACE_PATTERN = /[ \t\u3000]+/g;

/** 메모를 줄 단위로 정리한다: 줄 분리, 공백 정규화, 트림, 빈 줄 제거. */
export function normalizeMemoLines(memo: string): string[] {
  return memo
    .split(LINE_BREAK_PATTERN)
    .map((line) => line.replace(INLINE_SPACE_PATTERN, " ").trim())
    .filter((line) => line.length > 0);
}

/** 열람실별 전역 좌석 번호 구간(양 끝 포함). 복사 문구의 좌석 코드 변환에만 쓴다. */
export const SEAT_ROOM_RANGES: readonly {
  room: number;
  from: number;
  to: number;
}[] = [
  { room: 1, from: 1, to: 10 },
  { room: 2, from: 11, to: 20 },
  { room: 3, from: 21, to: 29 },
  { room: 4, from: 30, to: 39 },
  { room: 5, from: 40, to: 51 },
  { room: 6, from: 52, to: 63 },
  { room: 7, from: 64, to: 77 },
  { room: 8, from: 78, to: 91 },
  { room: 9, from: 92, to: 105 },
  { room: 10, from: 106, to: 119 },
  { room: 11, from: 120, to: 128 },
];

/** 좌석 번호를 `열람실-3자리 번호` 코드로 바꾼다 (23 → `3-023`). 구간 밖이면 숫자만 반환한다. */
export function formatSeatCode(seat: number): string {
  const range = SEAT_ROOM_RANGES.find((r) => seat >= r.from && seat <= r.to);
  if (!range) return String(seat);
  return `${range.room}-${String(seat).padStart(3, "0")}`;
}

interface FormatPatrolLineInput {
  /** 순찰 완료 시각 (ISO 문자열) */
  patrolledAt: string;
  memo: string;
  /** 졸음/딴짓 좌석 번호 */
  drowsy: number[];
}

/**
 * 구글 시트에 붙여넣을 한 줄 문구를 만든다 (`HH:mm 순찰 → 완료[ (상세)]`).
 * 스탠딩·카페존·자리비움은 포함하지 않으며 결과에 개행·탭이 없다.
 */
export function formatPatrolLine({
  patrolledAt,
  memo,
  drowsy,
}: FormatPatrolLineInput): string {
  const time = formatKstTime(patrolledAt);
  const parts: string[] = [];

  const memoText = normalizeMemoLines(memo).join(", ");
  if (memoText) parts.push(memoText);

  if (drowsy.length > 0) {
    const seats = [...drowsy]
      .sort((a, b) => a - b)
      .map(formatSeatCode)
      .join(", ");
    parts.push(`${seats} 졸아서 깨움`);
  }

  const base = `${time} 순찰 → 완료`;
  return parts.length > 0 ? `${base} (${parts.join(", ")})` : base;
}
