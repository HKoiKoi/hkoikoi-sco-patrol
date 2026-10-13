import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
  shiftBusinessDate,
  formatBusinessDateLabel,
} from "@/lib/business-date";
import { cn } from "@/lib/utils";

interface DateNavProps {
  /** 표시 중인 영업일 (YYYY-MM-DD) */
  date: string;
  /** 현재 영업일 (YYYY-MM-DD). 다음 이동은 이 날짜의 다음 날까지만 허용한다. */
  currentDate: string;
}

const navButtonClass = cn(
  buttonVariants({ variant: "outline", size: "icon" }),
  "size-12 shrink-0",
);

// 영업일 이전/다음 이동 내비게이션
export function DateNav({ date, currentDate }: DateNavProps) {
  const prevDate = shiftBusinessDate(date, -1);
  const nextDate = shiftBusinessDate(date, 1);
  const maxDate = shiftBusinessDate(currentDate, 1);
  const canGoNext = nextDate <= maxDate;

  return (
    <nav aria-label="영업일 이동" className="flex items-center gap-2">
      <Link
        href={`/logs?date=${prevDate}`}
        className={navButtonClass}
        aria-label="이전 영업일"
      >
        <ChevronLeft aria-hidden="true" />
      </Link>

      <p className="min-w-0 flex-1 text-center text-base font-semibold break-words">
        <time dateTime={date}>{formatBusinessDateLabel(date)}</time>
      </p>

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
    </nav>
  );
}
