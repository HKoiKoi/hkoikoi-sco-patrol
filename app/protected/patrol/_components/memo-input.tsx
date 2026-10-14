"use client";

import { useId, type ReactNode } from "react";

import { Textarea } from "@/components/ui/textarea";
import { MEMO_MAX_LENGTH } from "@/lib/patrol-format";
import { cn } from "@/lib/utils";

interface MemoInputProps {
  value: string;
  onChange: (next: string) => void;
  /** 라벨과 입력창 사이에 놓을 내용 (퀵 태그 등) */
  children?: ReactNode;
  className?: string;
}

// 특이사항 메모 입력: 라벨 → children(퀵 태그) → 입력창 (최대 길이 제한과 글자 수 카운터 포함)
export function MemoInput({
  value,
  onChange,
  children,
  className,
}: MemoInputProps) {
  const id = useId();
  const counterId = `${id}-counter`;

  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-xl font-semibold">
        메모
      </label>
      {children}
      <Textarea
        id={id}
        value={value}
        maxLength={MEMO_MAX_LENGTH}
        onChange={(event) => onChange(event.target.value)}
        aria-describedby={counterId}
        placeholder="특이사항을 입력하세요"
        // iOS 자동 확대를 막기 위해 모든 화면에서 16px 이상 유지
        className="min-h-28 text-base md:text-base"
      />
      <p
        id={counterId}
        className="text-right text-sm text-muted-foreground tabular-nums"
      >
        {value.length}/{MEMO_MAX_LENGTH}
      </p>
    </div>
  );
}
