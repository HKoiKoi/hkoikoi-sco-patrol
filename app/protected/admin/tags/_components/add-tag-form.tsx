"use client";

import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import type { TagActionResult } from "./tag-list";

interface AddTagFormProps {
  onAdd: (label: string) => Promise<TagActionResult>;
  /** 다른 조작이 진행 중이면 제출을 막는다. */
  disabled?: boolean;
}

// 새 태그 추가 폼. Enter 또는 [추가]로 제출하며 성공하면 입력을 비운다.
export function AddTagForm({ onAdd, disabled = false }: AddTagFormProps) {
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (disabled) return;
    const result = await onAdd(label);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setLabel("");
    setError(null);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2" noValidate>
      <label htmlFor="new-tag-label" className="text-base font-semibold">
        새 태그 추가
      </label>
      <div className="flex gap-2">
        <Input
          id="new-tag-label"
          className="h-12 min-w-0"
          placeholder="예: 제빙기 청소"
          value={label}
          aria-invalid={error !== null}
          aria-describedby={error ? "new-tag-error" : undefined}
          onChange={(event) => {
            setLabel(event.target.value);
            setError(null);
          }}
        />
        <Button type="submit" className="min-h-12 shrink-0" disabled={disabled}>
          <Plus aria-hidden="true" />
          추가
        </Button>
      </div>
      {error && (
        <p id="new-tag-error" role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
