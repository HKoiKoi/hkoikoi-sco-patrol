"use client";

import { useTransition } from "react";
import { CircleCheck } from "lucide-react";
import { toast } from "sonner";

import {
  SEAT_CATEGORY_COLORS,
  SEAT_CATEGORY_ICONS,
  SEAT_CATEGORY_LABELS,
  SEAT_CHIP_SIZE_CLASS,
} from "@/components/patrol/seat-chips";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { PatrolLog } from "@/lib/types/patrol";

import {
  moveAwaySeat as moveAwaySeatAction,
  removeAwaySeat as removeAwaySeatAction,
} from "../actions";

interface AwaySeatActionsProps {
  log: PatrolLog;
}

// 자리비움 좌석별 처리 메뉴 (스탠딩/카페존으로 이동, 삭제). 저장은 Server Action이 최종 검증한다.
export function AwaySeatActions({ log }: AwaySeatActionsProps) {
  const [pending, startTransition] = useTransition();

  if (log.away.length === 0) return null;

  const move = (seat: number, target: "standing" | "cafe_zone") => {
    if (pending) return;
    startTransition(async () => {
      const result = await moveAwaySeatAction(log.id, seat, target);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const label = SEAT_CATEGORY_LABELS[target];
      const Icon = SEAT_CATEGORY_ICONS[target];
      // 모바일 가시성: 하단 중앙, 큰 글자, 이동 대상 카테고리 색, 약 4초 표시
      toast.custom(
        () => (
          <div
            role="status"
            className={cn(
              "flex w-[calc(100vw-2rem)] max-w-sm items-center gap-3 rounded-lg border-2 px-4 py-4 text-base font-semibold shadow-lg",
              SEAT_CATEGORY_COLORS[target],
            )}
          >
            <CircleCheck className="size-6 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1 break-words">
              {seat}번 → {label}으로 이동
            </span>
            <Icon className="size-6 shrink-0" aria-hidden="true" />
          </div>
        ),
        { position: "bottom-center", duration: 4000 },
      );
    });
  };

  const remove = (seat: number) => {
    if (pending) return;
    startTransition(async () => {
      const result = await removeAwaySeatAction(log.id, seat);
      if (result.ok) {
        toast.success(`자리비움 ${seat}번을 삭제했습니다`);
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="flex min-w-0 flex-wrap gap-2">
      {log.away.map((seat) => (
        <DropdownMenu key={seat}>
          <DropdownMenuTrigger asChild>
            {/* 번호 칩 자체가 메뉴 트리거 */}
            <button
              type="button"
              className={cn(
                "border",
                SEAT_CHIP_SIZE_CLASS,
                SEAT_CATEGORY_COLORS.away,
              )}
              aria-label={`자리비움 ${seat}번 처리 메뉴 열기`}
            >
              {seat}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              className="min-h-12"
              onSelect={() => move(seat, "cafe_zone")}
            >
              카페존으로 이동
            </DropdownMenuItem>
            <DropdownMenuItem
              className="min-h-12"
              onSelect={() => move(seat, "standing")}
            >
              스탠딩으로 이동
            </DropdownMenuItem>
            <DropdownMenuItem
              className="min-h-12 text-destructive focus:text-destructive"
              onSelect={() => remove(seat)}
            >
              삭제
            </DropdownMenuItem>
            {/* 메뉴를 닫기만 한다 */}
            <DropdownMenuItem className="min-h-12">취소</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ))}
    </div>
  );
}
