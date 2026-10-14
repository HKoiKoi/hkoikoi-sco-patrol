/**
 * open redirect 방지: 사이트 내부 경로만 허용한다.
 * - 문자열이 아니거나 "/"로 시작하지 않으면 fallback
 * - "//", "/\" 시작(프로토콜 상대 URL), 스킴(":") 포함, 제어문자(개행 포함) 포함은 fallback
 */
export function getSafeNextPath(value: unknown, fallback = "/logs"): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (value.includes(":")) return fallback;
  if (/[\u0000-\u001f\u007f]/.test(value)) return fallback;
  return value;
}
