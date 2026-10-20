"use client";

import { useState, useTransition } from "react";
import { Pencil, StickyNote, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import {
  SEAT_CATEGORY_COLORS,
  SEAT_CHIP_SIZE_CLASS,
  SEAT_CATEGORY_LABELS,
  SEAT_CATEGORY_ORDER,
  SeatCategoryLabel,
} from "@/components/patrol/seat-chips";
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MEMO_MAX_LENGTH } from "@/lib/patrol-format";
import { addSeat, parseSeatInput, removeSeat } from "@/lib/seat-numbers";
import { cn } from "@/lib/utils";
import type { PatrolLog, SeatCategory } from "@/lib/types/patrol";

import { deletePatrolLog, updatePatrolLog } from "../actions";

interface EditLogDialogProps {
  log: PatrolLog;
}

// 순찰 기록 수정 다이얼로그 (좌석 4종 칩 편집 + 메모). 저장은 Server Action이 최종 검증한다.
export function EditLogDialog({ log }: EditLogDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [seats, setSeats] = useState<Record<SeatCategory, number[]>>({
    standing: log.standing,
    cafe_zone: log.cafe_zone,
    drowsy: log.drowsy,
    away: log.away,
  });
  const [memo, setMemo] = useState(log.memo);
  const [inputs, setInputs] = useState<Record<SeatCategory, string>>({
    standing: "",
    cafe_zone: "",
    drowsy: "",
    away: "",
  });
  const [errors, setErrors] = useState<Partial<Record<SeatCategory, string>>>(
    {},
  );

  // 다이얼로그를 열 때마다 원본 기록으로 되돌린다.
  const handleOpenChange = (next: boolean) => {
    if (next) {
      setSeats({
        standing: log.standing,
        cafe_zone: log.cafe_zone,
        drowsy: log.drowsy,
        away: log.away,
      });
      setMemo(log.memo);
      setInputs({ standing: "", cafe_zone: "", drowsy: "", away: "" });
      setErrors({});
    }
    setOpen(next);
  };

  const handleAdd = (category: SeatCategory) => {
    const value = parseSeatInput(inputs[category]);
    if (value === null) {
      setErrors((prev) => ({
        ...prev,
        [category]: "1 이상의 숫자를 입력하세요",
      }));
      return;
    }
    const result = addSeat(seats[category], value);
    if (!result.ok) {
      setErrors((prev) => ({ ...prev, [category]: "이미 있는 번호입니다" }));
      return;
    }
    setSeats((prev) => ({ ...prev, [category]: result.seats }));
    setInputs((prev) => ({ ...prev, [category]: "" }));
    setErrors((prev) => ({ ...prev, [category]: undefined }));
  };

  const handleSave = () => {
    if (memo.length > MEMO_MAX_LENGTH) {
      toast.error(
        `메모는 ${MEMO_MAX_LENGTH.toLocaleString("ko-KR")}자 이하로 입력하세요`,
      );
      return;
    }
    startTransition(async () => {
      const result = await updatePatrolLog(log.id, {
        standing: seats.standing,
        cafe_zone: seats.cafe_zone,
        drowsy: seats.drowsy,
        away: seats.away,
        memo,
      });
      if (result.ok) {
        toast.success("기록을 수정했습니다");
        setOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="min-h-12">
          <Pencil aria-hidden="true" />
          수정
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>순찰 기록 수정</DialogTitle>
          <DialogDescription>
            좌석 번호와 메모를 수정할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-w-0 grid-cols-1 gap-x-3 gap-y-4 md:grid-cols-2">
          {SEAT_CATEGORY_ORDER.map((category) => (
            <fieldset key={category} className="min-w-0 space-y-2">
              <legend>
                <SeatCategoryLabel category={category} className="text-base" />
              </legend>
              <div className="flex min-w-0 flex-wrap gap-2">
                {seats[category].length === 0 && (
                  <span className="text-xs text-muted-foreground">없음</span>
                )}
                {seats[category].map((seat) => (
                  <Button
                    key={seat}
                    type="button"
                    variant="outline"
                    className={cn(
                      SEAT_CHIP_SIZE_CLASS,
                      "h-auto hover:opacity-80",
                      SEAT_CATEGORY_COLORS[category],
                    )}
                    aria-label={`${SEAT_CATEGORY_LABELS[category]} ${seat}번 삭제`}
                    onClick={() =>
                      setSeats((prev) => ({
                        ...prev,
                        [category]: removeSeat(prev[category], seat),
                      }))
                    }
                  >
                    {seat}
                    <X aria-hidden="true" />
                  </Button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  inputMode="numeric"
                  className="h-12 min-w-0"
                  placeholder="번호"
                  aria-label={`${SEAT_CATEGORY_LABELS[category]} 번호 입력`}
                  value={inputs[category]}
                  onChange={(event) =>
                    setInputs((prev) => ({
                      ...prev,
                      [category]: event.target.value,
                    }))
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleAdd(category);
                    }
                  }}
                />
                <Button
                  type="button"
                  className="min-h-12 shrink-0"
                  onClick={() => handleAdd(category)}
                >
                  추가
                </Button>
              </div>
              {errors[category] && (
                <p role="alert" className="text-xs text-destructive">
                  {errors[category]}
                </p>
              )}
            </fieldset>
          ))}

          {/* 메모: 그리드 전체 폭 */}
          <div className="col-span-full space-y-2">
            <label
              htmlFor={`memo-${log.id}`}
              className="inline-flex items-center gap-1.5 text-base font-semibold"
            >
              <StickyNote className="size-5 shrink-0" aria-hidden="true" />
              메모
            </label>
            <Textarea
              id={`memo-${log.id}`}
              value={memo}
              maxLength={MEMO_MAX_LENGTH}
              rows={4}
              className="min-h-24 w-full"
              onChange={(event) => setMemo(event.target.value)}
            />
            <p className="text-right text-xs text-muted-foreground tabular-nums">
              {memo.length} / {MEMO_MAX_LENGTH}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-12"
            onClick={() => setOpen(false)}
          >
            취소
          </Button>
          <Button
            type="button"
            className="min-h-12"
            disabled={pending}
            onClick={handleSave}
          >
            {pending ? "저장 중..." : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteLogDialogProps {
  logId: string;
}

// 순찰 기록 삭제 확인 다이얼로그. 확인 버튼은 클릭 시 닫히므로 실패는 토스트로 알린다.
export function DeleteLogDialog({ logId }: DeleteLogDialogProps) {
  const [pending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deletePatrolLog(logId);
      if (result.ok) {
        toast.success("기록을 삭제했습니다");
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline" className="min-h-12">
          <Trash2 aria-hidden="true" />
          삭제
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>이 순찰 기록을 삭제할까요?</AlertDialogTitle>
          <AlertDialogDescription>
            삭제한 기록은 되돌릴 수 없습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="min-h-12">취소</AlertDialogCancel>
          <AlertDialogAction
            className="min-h-12"
            disabled={pending}
            onClick={handleDelete}
          >
            삭제
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
