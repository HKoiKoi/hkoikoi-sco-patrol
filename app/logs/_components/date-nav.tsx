import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
  shiftBusinessDate,
  formatBusinessDateLabel,
} from "@/lib/business-date";
import type { Viewer } from "@/lib/types/auth";
import { cn } from "@/lib/utils";

import { DatePickerInput } from "./date-picker-input";
import { WritePatrolButton } from "./write-patrol-button";

interface DateNavProps {
  /** 표시 중인 영업일 (YYYY-MM-DD) */
  date: string;
  /** 현재 영업일 (YYYY-MM-DD). 다음 이동은 이 날짜의 다음 날까지만 허용한다. */
  currentDate: string;
  viewer: Viewer;
}

const navButtonClass = cn(
  buttonVariants({ variant: "outline", size: "icon" }),
  "size-12 shrink-0",
);

// 영업일 이전/다음 이동 내비게이션
export function DateNav({ date, currentDate, viewer }: DateNavProps) {
  const prevDate = shiftBusinessDate(date, -1);
  const nextDate = shiftBusinessDate(date, 1);
  const maxDate = shiftBusinessDate(currentDate, 1);
  const canGoNext = nextDate <= maxDate;

  return (
    <nav
      aria-label="영업일 이동"
      className="flex flex-wrap items-center justify-between gap-3"
    >
      {/* 날짜 이동: 이전 / 달력 아이콘 + 날짜 입력 / 다음 */}
      <div className="flex min-w-0 flex-1 basis-64 items-center gap-2">
        <Link
          href={`/logs?date=${prevDate}`}
          className={navButtonClass}
          aria-label="이전 영업일"
        >
          <ChevronLeft aria-hidden="true" />
        </Link>

        <CalendarDays
          className="size-5 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <DatePickerInput date={date} max={maxDate} />
          <time dateTime={date} className="sr-only">
            {formatBusinessDateLabel(date)}
          </time>
        </div>

        {canGoNext ? (
          <Link
            href={`/logs?date=${nextDate}`}
            className={navButtonClass}
            aria-label="다음 영업일"
          >
            <ChevronRight aria-hidden="true" />
          </Link>
        ) : (
          // 더 이상 이동할 수 없을 때는 링크 대신 비활성 표시
          <span
            aria-disabled="true"
            className={cn(navButtonClass, "pointer-events-none opacity-50")}
          >
            <ChevronRight aria-hidden="true" />
            <span className="sr-only">다음 영업일 없음</span>
          </span>
        )}
      </div>

      <WritePatrolButton viewer={viewer} />
    </nav>
  );
}
