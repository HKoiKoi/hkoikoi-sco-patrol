// 영업일·시각 유틸리티. 화면 표시와 날짜 이동 기본값 전용이며 최종 기준은 DB(`private.business_date_of()`)다.
// 서버 기본 시간대(TZ)에 의존하지 않도록 모든 포맷에 timeZone 'Asia/Seoul'을 명시한다.

/** 영업일 경계(04:00 KST)를 맞추기 위해 빼는 시간(ms) */
const BUSINESS_DAY_OFFSET_MS = 4 * 60 * 60 * 1000;

const BUSINESS_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;

// en-CA 로케일은 YYYY-MM-DD 형식을 반환한다.
const kstDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const kstTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Seoul",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** 주어진 시각의 영업일(KST 04:00 경계)을 `YYYY-MM-DD`로 반환한다. */
export function getBusinessDate(at: Date): string {
  return kstDateFormatter.format(
    new Date(at.getTime() - BUSINESS_DAY_OFFSET_MS),
  );
}

/** `YYYY-MM-DD`를 UTC 자정 Date로 변환한다. 유효하지 않으면 null. */
function toUtcDate(value: string): Date | null {
  if (!BUSINESS_DATE_PATTERN.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  // 2월 30일 같은 존재하지 않는 날짜는 되돌렸을 때 값이 달라진다.
  return date.toISOString().slice(0, 10) === value ? date : null;
}

/** `?date` 파라미터를 검증한다. 형식 오류·존재하지 않는 날짜·배열·undefined는 null. */
export function parseBusinessDateParam(
  value: string | string[] | undefined,
): string | null {
  if (typeof value !== "string") return null;
  return toUtcDate(value) ? value : null;
}

/** 영업일을 일 단위로 이동한다(UTC 산술이라 월말·연말·윤년을 안전하게 처리). */
export function shiftBusinessDate(date: string, days: number): string {
  const base = toUtcDate(date);
  if (!base) throw new RangeError(`유효하지 않은 영업일: ${date}`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

/** ISO 시각을 KST `HH:mm`으로 표시한다(자정은 `00:xx`). */
export function formatKstTime(iso: string): string {
  return kstTimeFormatter.format(new Date(iso));
}

/** 영업일을 화면용 `YYYY. MM. DD (요일)`로 표시한다. */
export function formatBusinessDateLabel(date: string): string {
  const base = toUtcDate(date);
  if (!base) throw new RangeError(`유효하지 않은 영업일: ${date}`);
  const [y, m, d] = date.split("-");
  return `${y}. ${m}. ${d} (${WEEKDAY_LABELS[base.getUTCDay()]})`;
}
