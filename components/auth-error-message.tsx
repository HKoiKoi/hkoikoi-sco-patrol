// 인증 오류 메시지 표시 컴포넌트와 영어 오류 메시지의 한국어 변환 함수

const DEFAULT_AUTH_ERROR_MESSAGE =
  "오류가 발생했습니다. 잠시 후 다시 시도해 주세요";

// 대표 인증 오류 메시지(부분 일치) → 한국어 문구 매핑
const AUTH_ERROR_MESSAGES: ReadonlyArray<readonly [string, string]> = [
  ["Invalid login credentials", "이메일 또는 비밀번호가 올바르지 않습니다"],
  ["User already registered", "이미 가입된 이메일입니다"],
  ["Email not confirmed", "이메일 인증이 완료되지 않았습니다"],
  ["Password should be at least", "비밀번호는 최소 6자 이상이어야 합니다"],
  ["Unable to validate email address", "올바른 이메일 주소를 입력해 주세요"],
  [
    "New password should be different",
    "새 비밀번호는 기존 비밀번호와 달라야 합니다",
  ],
];

// 알 수 없는 오류 객체에서 message 문자열을 안전하게 추출
function readMessage(error: unknown): string | null {
  if (error instanceof Error) return error.message;
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return null;
}

export function getAuthErrorMessage(error: unknown): string {
  const message = readMessage(error);
  if (!message) return DEFAULT_AUTH_ERROR_MESSAGE;

  const matched = AUTH_ERROR_MESSAGES.find(([keyword]) =>
    message.includes(keyword),
  );
  return matched ? matched[1] : DEFAULT_AUTH_ERROR_MESSAGE;
}

interface AuthErrorMessageProps {
  message: string | null;
}

export function AuthErrorMessage({ message }: AuthErrorMessageProps) {
  if (message === null) return null;

  return (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  );
}
