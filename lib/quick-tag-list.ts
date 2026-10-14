// 퀵 태그 목록 편집용 순수 함수. 입력을 변경하지 않고 새 배열을 반환한다.
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

/** 기존 최대 sortOrder + 1로 활성 태그를 추가한다. 빈 목록이면 1부터 시작한다. */
export function addTag(
  tags: readonly QuickTag[],
  label: string,
  id: string,
): QuickTag[] {
  const maxOrder = tags.reduce((max, tag) => Math.max(max, tag.sortOrder), 0);
  return [...tags, { id, label, sortOrder: maxOrder + 1, isActive: true }];
}

/** 해당 태그의 문구를 바꾼다. */
export function renameTag(
  tags: readonly QuickTag[],
  id: string,
  label: string,
): QuickTag[] {
  return tags.map((tag) => (tag.id === id ? { ...tag, label } : tag));
}

/** 해당 태그의 활성 여부를 뒤집는다. */
export function toggleTag(tags: readonly QuickTag[], id: string): QuickTag[] {
  return tags.map((tag) =>
    tag.id === id ? { ...tag, isActive: !tag.isActive } : tag,
  );
}

/** 정렬 기준 인접 항목과 sortOrder를 맞바꾼다. 경계에서는 변경하지 않는다. */
export function moveTag(
  tags: readonly QuickTag[],
  id: string,
  direction: "up" | "down",
): QuickTag[] {
  const sorted = sortTags(tags);
  const index = sorted.findIndex((tag) => tag.id === id);
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || targetIndex < 0 || targetIndex >= sorted.length) {
    return sorted;
  }
  const current = sorted[index];
  const target = sorted[targetIndex];
  sorted[index] = { ...target, sortOrder: current.sortOrder };
  sorted[targetIndex] = { ...current, sortOrder: target.sortOrder };
  return sorted;
}

/** 해당 태그를 제거한다. */
export function removeTag(tags: readonly QuickTag[], id: string): QuickTag[] {
  return tags.filter((tag) => tag.id !== id);
}
