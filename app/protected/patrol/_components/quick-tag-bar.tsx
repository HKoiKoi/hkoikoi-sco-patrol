"use client";

import { Button } from "@/components/ui/button";
import type { QuickTag } from "@/lib/types/patrol";
import { cn } from "@/lib/utils";

interface QuickTagBarProps {
  tags: QuickTag[];
  onAppend: (label: string) => void;
  className?: string;
}

// 활성 퀵 태그 버튼 목록 (탭하면 메모 끝에 추가하도록 label을 전달)
export function QuickTagBar({ tags, onAppend, className }: QuickTagBarProps) {
  const activeTags = tags
    .filter((tag) => tag.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (activeTags.length === 0) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        표시할 퀵 태그가 없습니다
      </p>
    );
  }

  return (
    <ul className={cn("flex min-w-0 flex-wrap gap-2", className)}>
      {activeTags.map((tag) => (
        <li key={tag.id} className="min-w-0">
          <Button
            type="button"
            variant="secondary"
            className="min-h-12 max-w-full text-base break-words whitespace-normal"
            onClick={() => onAppend(tag.label)}
          >
            {tag.label}
          </Button>
        </li>
      ))}
    </ul>
  );
}
