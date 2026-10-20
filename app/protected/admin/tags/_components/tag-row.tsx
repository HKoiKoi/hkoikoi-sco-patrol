"use client";

import { useState, type FormEvent } from "react";
import { ArrowDown, ArrowUp, Check, Pencil, Trash2, X } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { QuickTag } from "@/lib/types/patrol";
import { cn } from "@/lib/utils";

import type { TagActionResult } from "./tag-list";

interface TagRowProps {
  tag: QuickTag;
  /** 화면에 표시하는 순서 번호 (1부터) */
  position: number;
  isFirst: boolean;
  isLast: boolean;
  /** 다른 조작이 진행 중이면 모든 조작을 막는다. */
  disabled: boolean;
  onRename: (id: string, label: string) => Promise<TagActionResult>;
  onToggle: (id: string) => Promise<TagActionResult>;
  onMove: (id: string, direction: "up" | "down") => Promise<TagActionResult>;
  onDelete: (id: string) => Promise<TagActionResult>;
}

// 퀵 태그 한 줄: 순서 번호, 문구(인라인 수정), 노출 스위치, 이동·수정·삭제 버튼
export function TagRow({
  tag,
  position,
  isFirst,
  isLast,
  disabled,
  onRename,
  onToggle,
  onMove,
  onDelete,
}: TagRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(tag.label);
  const [error, setError] = useState<string | null>(null);

  const startEdit = () => {
    setDraft(tag.label);
    setError(null);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setError(null);
  };

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (disabled) return;
    const result = await onRename(tag.id, draft);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setIsEditing(false);
    setError(null);
  };

  const errorId = `tag-error-${tag.id}`;

  return (
    <li
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border bg-card p-3",
        !tag.isActive && "opacity-60",
      )}
    >
      {/* 순서 번호 */}
      <span className="w-6 shrink-0 text-center text-sm text-muted-foreground tabular-nums">
        {position}
      </span>

      {/* 문구 영역: 일반 표시 또는 인라인 수정 */}
      <div className="min-w-0 flex-1 basis-40">
        {isEditing ? (
          <form onSubmit={handleEditSubmit} className="space-y-1" noValidate>
            <div className="flex gap-2">
              <Input
                autoFocus
                className="h-10 min-w-0"
                aria-label={`${tag.label} 문구 수정`}
                aria-invalid={error !== null}
                aria-describedby={error ? errorId : undefined}
                value={draft}
                onChange={(event) => {
                  setDraft(event.target.value);
                  setError(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") cancelEdit();
                }}
              />
              <Button
                type="submit"
                size="icon"
                className="size-10 shrink-0"
                aria-label="문구 저장"
                disabled={disabled}
              >
                <Check aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-10 shrink-0"
                aria-label="수정 취소"
                onClick={cancelEdit}
              >
                <X aria-hidden="true" />
              </Button>
            </div>
            {error && (
              <p id={errorId} role="alert" className="text-xs text-destructive">
                {error}
              </p>
            )}
          </form>
        ) : (
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="min-w-0 font-medium break-words">{tag.label}</span>
            {!tag.isActive && <Badge variant="secondary">숨김</Badge>}
          </div>
        )}
      </div>

      {/* 조작 영역: 모바일에서는 다음 줄로 내려간다 */}
      <div className="ml-9 flex items-center gap-1 sm:ml-0">
        <Switch
          checked={tag.isActive}
          aria-label={`${tag.label} ${tag.isActive ? "숨기기" : "노출하기"}`}
          disabled={disabled}
          // 보이는 크기는 그대로 두고 가상 요소로 터치 영역을 40px 이상으로 넓힌다
          className="relative mr-2 after:absolute after:-inset-3 after:content-['']"
          onCheckedChange={() => {
            onToggle(tag.id);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-10"
          aria-label={`${tag.label} 위로 이동`}
          disabled={disabled || isFirst}
          onClick={() => onMove(tag.id, "up")}
        >
          <ArrowUp aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-10"
          aria-label={`${tag.label} 아래로 이동`}
          disabled={disabled || isLast}
          onClick={() => onMove(tag.id, "down")}
        >
          <ArrowDown aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-10"
          aria-label={`${tag.label} 문구 수정`}
          disabled={disabled || isEditing}
          onClick={startEdit}
        >
          <Pencil aria-hidden="true" />
        </Button>

        {/* 삭제 확인 다이얼로그 */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-10"
              aria-label={`${tag.label} 삭제`}
              disabled={disabled}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>이 태그를 삭제할까요?</AlertDialogTitle>
              <AlertDialogDescription>
                &quot;{tag.label}&quot; 태그를 삭제합니다. 과거 기록의 메모에는
                영향이 없습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="min-h-12">취소</AlertDialogCancel>
              <AlertDialogAction
                className="min-h-12"
                onClick={() => {
                  onDelete(tag.id);
                }}
              >
                삭제
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </li>
  );
}
