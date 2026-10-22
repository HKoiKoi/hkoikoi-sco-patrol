import type { ReactNode } from "react";
import { Coffee, DoorOpen, Moon, PersonStanding } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { SeatCategory, SeatSet } from "@/lib/types/patrol";
import { cn } from "@/lib/utils";

/** 좌석 카테고리별 화면 표시 라벨. */
export const SEAT_CATEGORY_LABELS: Record<SeatCategory, string> = {
  standing: "스탠딩",
  cafe_zone: "카페존",
  drowsy: "졸음/딴짓",
  away: "자리비움",
};

/** 좌석 카테고리 표시 순서. */
export const SEAT_CATEGORY_ORDER: readonly SeatCategory[] = [
  "standing",
  "cafe_zone",
  "drowsy",
  "away",
];

/** 좌석 카테고리별 아이콘. */
export const SEAT_CATEGORY_ICONS: Record<SeatCategory, LucideIcon> = {
  standing: PersonStanding,
  cafe_zone: Coffee,
  drowsy: Moon,
  away: DoorOpen,
};

/** 모든 좌석 칩 공통 크기 (터치 영역 48px 이상). */
export const SEAT_CHIP_SIZE_CLASS =
  "inline-flex min-h-12 min-w-12 items-center justify-center rounded-md px-3 text-base font-medium";

/** 카테고리별 색상 클래스 (라이트/다크). 색만으로 구분하지 않도록 라벨·아이콘을 함께 쓴다. */
export const SEAT_CATEGORY_COLORS: Record<SeatCategory, string> = {
  standing:
    "border-sky-300 bg-sky-100 text-sky-900 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-100",
  cafe_zone:
    "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100",
  drowsy:
    "border-violet-300 bg-violet-100 text-violet-900 dark:border-violet-700 dark:bg-violet-950 dark:text-violet-100",
  away: "border-rose-300 bg-rose-100 text-rose-900 dark:border-rose-700 dark:bg-rose-950 dark:text-rose-100",
};

interface SeatCategoryLabelProps {
  category: SeatCategory;
  className?: string;
}

// 카테고리 아이콘 + 라벨 (색이 아닌 텍스트로도 구분)
export function SeatCategoryLabel({
  category,
  className,
}: SeatCategoryLabelProps) {
  const Icon = SEAT_CATEGORY_ICONS[category];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-base font-semibold break-words",
        className,
      )}
    >
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      {SEAT_CATEGORY_LABELS[category]}
    </span>
  );
}

interface SeatChipsProps {
  seats: SeatSet;
  /** 이 화면에서 직접 렌더하지 않을 카테고리 (예: 클릭 가능한 자리비움 칩을 따로 그릴 때) */
  hideCategories?: readonly SeatCategory[];
  /** 자리비움 칩 대신 렌더할 노드 (클릭 가능한 칩 등). 라벨은 그대로 유지한다. */
  awaySlot?: ReactNode;
  /** 졸음/딴짓 칩 중 강조할 좌석 (요주의). 링·굵은 글씨와 스크린리더용 텍스트를 붙인다. */
  highlightSeats?: readonly number[];
  className?: string;
}

// 카테고리별 좌석 번호 칩 목록 (읽기 전용). 번호가 없는 카테고리는 생략하고 전부 비면 렌더하지 않는다.
export function SeatChips({
  seats,
  hideCategories = [],
  awaySlot,
  highlightSeats = [],
  className,
}: SeatChipsProps) {
  const categories = SEAT_CATEGORY_ORDER.filter(
    (category) =>
      seats[category].length > 0 && !hideCategories.includes(category),
  );

  if (categories.length === 0) return null;

  return (
    <ul
      className={cn(
        "grid min-w-0 grid-cols-1 gap-x-3 gap-y-3 md:grid-cols-2",
        className,
      )}
    >
      {categories.map((category) => (
        <li key={category} className="flex min-w-0 flex-col gap-1.5">
          {/* 색이 아닌 라벨 텍스트로 카테고리를 구분 */}
          <SeatCategoryLabel
            category={category}
            className="text-muted-foreground"
          />
          {category === "away" && awaySlot ? (
            awaySlot
          ) : (
            <div className="flex min-w-0 flex-wrap gap-2">
              {seats[category].map((seat) => {
                // 요주의 강조는 졸음/딴짓 칩에만 적용한다.
                const highlighted =
                  category === "drowsy" && highlightSeats.includes(seat);
                return (
                  <Badge
                    key={seat}
                    variant="outline"
                    className={cn(
                      "min-w-0 break-words",
                      SEAT_CHIP_SIZE_CLASS,
                      SEAT_CATEGORY_COLORS[category],
                      highlighted && "font-bold ring-2 ring-destructive",
                    )}
                  >
                    {seat}
                    <span className="sr-only">
                      번{highlighted && " 요주의"}
                    </span>
                  </Badge>
                );
              })}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
