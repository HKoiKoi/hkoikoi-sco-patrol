"use client";

import { useRef, useState } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatPatrolLine } from "@/lib/patrol-format";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  patrolledAt: string;
  memo: string;
  drowsy: number[];
  className?: string;
}

// 순찰 한 줄 문구 복사 버튼. 클립보드가 막히면 직접 복사 다이얼로그로 폴백한다.
export function CopyButton({
  patrolledAt,
  memo,
  drowsy,
  className,
}: CopyButtonProps) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const text = formatPatrolLine({ patrolledAt, memo, drowsy });

  // 제스처 유지를 위해 async/await 없이 클릭 핸들러 안에서 즉시 writeText를 호출한다.
  const handleClick = () => {
    let pending: Promise<void> | undefined;
    try {
      pending = navigator.clipboard?.writeText(text);
    } catch {
      pending = undefined;
    }

    if (!pending) {
      setOpen(true);
      return;
    }
    pending
      .then(() => toast.success("복사했습니다"))
      .catch(() => setOpen(true));
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={cn("min-h-12", className)}
        onClick={handleClick}
      >
        <Copy aria-hidden="true" />
        복사
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          onOpenAutoFocus={(event) => {
            // 기본 포커스 대신 입력창에 포커스하고 전체 선택한다.
            event.preventDefault();
            inputRef.current?.focus();
            inputRef.current?.select();
          }}
        >
          <DialogHeader>
            <DialogTitle>직접 복사해 주세요</DialogTitle>
            <DialogDescription>
              자동 복사가 막혀 있습니다. 아래 문구를 길게 눌러 복사하세요.
            </DialogDescription>
          </DialogHeader>
          <Input
            ref={inputRef}
            value={text}
            readOnly
            aria-label="복사할 순찰 문구"
            className="h-12"
            onFocus={(event) => event.currentTarget.select()}
          />
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>
    </>
  );
}
