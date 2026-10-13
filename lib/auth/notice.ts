/** 권한 부족 시 `/logs?notice=<코드>`로 전달되는 안내 코드와 한국어 문구 */
export const NOTICE_MESSAGES = {
  "login-required": "로그인이 필요합니다. 로그인 후 다시 시도해 주세요.",
  pending:
    "관리자 승인이 완료되지 않아 작성할 수 없습니다. 승인 후 이용해 주세요.",
  "admin-required": "관리자 권한이 필요합니다.",
} as const;

export type NoticeCode = keyof typeof NOTICE_MESSAGES;

/** 알 수 없는 코드·undefined는 null */
export function getNoticeMessage(
  code: string | undefined | null,
): string | null {
  if (!code || !Object.hasOwn(NOTICE_MESSAGES, code)) return null;
  return NOTICE_MESSAGES[code as NoticeCode];
}
