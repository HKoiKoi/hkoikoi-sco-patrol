// 퀵 태그 문구 정규화·검증. DB의 유일 인덱스(공백·대소문자 무시)와 같은 규칙을 쓴다.

/** 앞뒤 공백을 제거하고 연속 공백을 한 칸으로 만든다. */
export function normalizeTagLabel(label: string): string {
  return label.trim().replace(/\s+/g, " ");
}

/** 중복 비교용 키. 정규화 후 소문자로 바꾼다. */
export function tagLabelKey(label: string): string {
  return normalizeTagLabel(label).toLowerCase();
}

export type ValidateTagLabelResult =
  { ok: true; label: string } | { ok: false; error: string };

/** 필수·개행 불가를 검증하고 정규화된 문구를 반환한다. */
export function validateTagLabel(label: string): ValidateTagLabelResult {
  if (/[\r\n\v\f\u0085\u2028\u2029]/.test(label.trim())) {
    return { ok: false, error: "태그 문구에는 줄바꿈을 넣을 수 없습니다." };
  }
  const normalized = normalizeTagLabel(label);
  if (normalized.length === 0) {
    return { ok: false, error: "태그 문구를 입력해 주세요." };
  }
  return { ok: true, label: normalized };
}
