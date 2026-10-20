// 퀵 태그 목록 표시·검사용 순수 함수. 입력을 변경하지 않고 새 배열을 반환한다.
import { tagLabelKey } from "@/lib/quick-tag-label";
import type { QuickTag } from "@/lib/types/patrol";

/** sortOrder 오름차순으로 정렬한 새 배열을 반환한다. */
export function sortTags(tags: readonly QuickTag[]): QuickTag[] {
  return [...tags].sort((a, b) => a.sortOrder - b.sortOrder);
}

/** 공백·대소문자를 무시하고 같은 문구가 이미 있는지 확인한다. excludeId는 비교에서 제외한다. */
export function hasDuplicateLabel(
  tags: readonly QuickTag[],
  label: string,
  excludeId?: string,
): boolean {
  const key = tagLabelKey(label);
  return tags.some(
    (tag) => tag.id !== excludeId && tagLabelKey(tag.label) === key,
  );
}
