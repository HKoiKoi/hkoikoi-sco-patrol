"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";

import {
  addTag,
  hasDuplicateLabel,
  moveTag,
  removeTag,
  renameTag,
  sortTags,
  toggleTag,
} from "@/lib/quick-tag-list";
import { validateTagLabel } from "@/lib/quick-tag-label";
import type { QuickTag } from "@/lib/types/patrol";

import { AddTagForm } from "./add-tag-form";
import { TagRow } from "./tag-row";

/** 태그 조작 결과. Task 018에서 Server Action 반환값으로 그대로 교체한다. */
export type TagActionResult = { ok: true } | { ok: false; error: string };

const DUPLICATE_ERROR = "이미 있는 문구입니다";

interface TagListProps {
  initialTags: QuickTag[];
}

// 퀵 태그 관리 목록. 더미 단계에서는 클라이언트 상태만 갱신한다.
export function TagList({ initialTags }: TagListProps) {
  const [tags, setTags] = useState<QuickTag[]>(initialTags);
  // 클라이언트 임시 id 생성용 카운터 (Task 018에서 DB id로 교체)
  const idCounter = useRef(0);

  const sorted = sortTags(tags);

  const handleAdd = (rawLabel: string): TagActionResult => {
    const validated = validateTagLabel(rawLabel);
    if (!validated.ok) return validated;
    if (hasDuplicateLabel(tags, validated.label)) {
      return { ok: false, error: DUPLICATE_ERROR };
    }
    idCounter.current += 1;
    // TODO: Task 018에서 Server Action(태그 추가)으로 교체
    setTags((prev) =>
      addTag(prev, validated.label, `client-tag-${idCounter.current}`),
    );
    toast.success("태그를 추가했습니다 (더미)");
    return { ok: true };
  };

  const handleRename = (id: string, rawLabel: string): TagActionResult => {
    const validated = validateTagLabel(rawLabel);
    if (!validated.ok) return validated;
    if (hasDuplicateLabel(tags, validated.label, id)) {
      return { ok: false, error: DUPLICATE_ERROR };
    }
    // TODO: Task 018에서 Server Action(문구 수정)으로 교체
    setTags((prev) => renameTag(prev, id, validated.label));
    toast.success("문구를 수정했습니다 (더미)");
    return { ok: true };
  };

  const handleToggle = (id: string): TagActionResult => {
    const target = tags.find((tag) => tag.id === id);
    if (!target) return { ok: false, error: "태그를 찾을 수 없습니다" };
    // TODO: Task 018에서 Server Action(노출 전환)으로 교체
    setTags((prev) => toggleTag(prev, id));
    toast.success(
      target.isActive ? "태그를 숨겼습니다 (더미)" : "태그를 노출합니다 (더미)",
    );
    return { ok: true };
  };

  const handleMove = (
    id: string,
    direction: "up" | "down",
  ): TagActionResult => {
    const index = sorted.findIndex((tag) => tag.id === id);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || targetIndex < 0 || targetIndex >= sorted.length) {
      return { ok: false, error: "더 이상 이동할 수 없습니다" };
    }
    // TODO: Task 018에서 Server Action(순서 변경)으로 교체
    setTags((prev) => moveTag(prev, id, direction));
    toast.success("순서를 변경했습니다 (더미)");
    return { ok: true };
  };

  const handleDelete = (id: string): TagActionResult => {
    if (!tags.some((tag) => tag.id === id)) {
      return { ok: false, error: "태그를 찾을 수 없습니다" };
    }
    // TODO: Task 018에서 Server Action(태그 삭제)으로 교체
    setTags((prev) => removeTag(prev, id));
    toast.success("태그를 삭제했습니다 (더미)");
    return { ok: true };
  };

  return (
    <div className="space-y-6">
      {/* 태그 추가 폼 */}
      <AddTagForm onAdd={handleAdd} />

      {/* 전체 태그 목록 (숨김 포함) */}
      {sorted.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          등록된 퀵 태그가 없습니다. 위에서 새 태그를 추가해 주세요.
        </p>
      ) : (
        <ul className="space-y-2" aria-label="퀵 태그 목록">
          {sorted.map((tag, index) => (
            <TagRow
              key={tag.id}
              tag={tag}
              position={index + 1}
              isFirst={index === 0}
              isLast={index === sorted.length - 1}
              onRename={handleRename}
              onToggle={handleToggle}
              onMove={handleMove}
              onDelete={handleDelete}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
