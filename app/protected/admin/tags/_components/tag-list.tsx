"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { validateTagLabel } from "@/lib/quick-tag-label";
import { hasDuplicateLabel, sortTags } from "@/lib/quick-tag-list";
import type { ActionResult, QuickTag } from "@/lib/types/patrol";

import {
  createTag,
  deleteTag,
  swapTagOrder,
  toggleTagActive,
  updateTagLabel,
} from "../actions";
import { AddTagForm } from "./add-tag-form";
import { TagRow } from "./tag-row";

/** 태그 조작 결과. 행·폼 컴포넌트가 성공일 때만 입력을 닫거나 비운다. */
export type TagActionResult = { ok: true } | { ok: false; error: string };

const DUPLICATE_ERROR = "이미 있는 문구입니다";
const UNEXPECTED_ERROR =
  "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요";

interface TagListProps {
  initialTags: QuickTag[];
}

// 퀵 태그 관리 목록. 서버가 진실이며 Action 성공 후 refresh()로 새 initialTags가 내려온다.
export function TagList({ initialTags }: TagListProps) {
  const [pending, startTransition] = useTransition();

  const sorted = sortTags(initialTags);

  // Action을 transition 안에서 실행해 목록이 갱신될 때까지 pending을 유지하고 결과를 돌려준다.
  const run = (
    action: () => Promise<ActionResult<null>>,
    successMessage: string,
  ): Promise<TagActionResult> =>
    new Promise((resolve) => {
      startTransition(async () => {
        try {
          const result = await action();
          if (result.ok) {
            toast.success(successMessage);
            resolve({ ok: true });
          } else {
            toast.error(result.error);
            resolve({ ok: false, error: result.error });
          }
        } catch {
          toast.error(UNEXPECTED_ERROR);
          resolve({ ok: false, error: UNEXPECTED_ERROR });
        }
      });
    });

  const handleAdd = async (rawLabel: string): Promise<TagActionResult> => {
    const validated = validateTagLabel(rawLabel);
    if (!validated.ok) return validated;
    if (hasDuplicateLabel(initialTags, validated.label)) {
      return { ok: false, error: DUPLICATE_ERROR };
    }
    return run(() => createTag(validated.label), "태그를 추가했습니다");
  };

  const handleRename = async (
    id: string,
    rawLabel: string,
  ): Promise<TagActionResult> => {
    const validated = validateTagLabel(rawLabel);
    if (!validated.ok) return validated;
    if (hasDuplicateLabel(initialTags, validated.label, id)) {
      return { ok: false, error: DUPLICATE_ERROR };
    }
    return run(
      () => updateTagLabel(id, validated.label),
      "문구를 수정했습니다",
    );
  };

  const handleToggle = async (id: string): Promise<TagActionResult> => {
    const target = initialTags.find((tag) => tag.id === id);
    if (!target) return { ok: false, error: "태그를 찾을 수 없습니다" };
    const nextActive = !target.isActive;
    return run(
      () => toggleTagActive(id, nextActive),
      nextActive ? "태그를 노출합니다" : "태그를 숨겼습니다",
    );
  };

  const handleMove = async (
    id: string,
    direction: "up" | "down",
  ): Promise<TagActionResult> => {
    const index = sorted.findIndex((tag) => tag.id === id);
    const neighbor = sorted[direction === "up" ? index - 1 : index + 1];
    if (index < 0 || !neighbor) {
      return { ok: false, error: "더 이상 이동할 수 없습니다" };
    }
    return run(() => swapTagOrder(id, neighbor.id), "순서를 변경했습니다");
  };

  const handleDelete = async (id: string): Promise<TagActionResult> => {
    if (!initialTags.some((tag) => tag.id === id)) {
      return { ok: false, error: "태그를 찾을 수 없습니다" };
    }
    return run(() => deleteTag(id), "태그를 삭제했습니다");
  };

  return (
    <div className="space-y-6">
      {/* 태그 추가 폼 */}
      <AddTagForm onAdd={handleAdd} disabled={pending} />

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
              disabled={pending}
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
