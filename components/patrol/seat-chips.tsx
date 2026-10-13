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

interface SeatChipsProps {
  seats: SeatSet;
  className?: string;
}

// 카테고리별 좌석 번호 칩 목록 (읽기 전용). 번호가 없는 카테고리는 생략하고 전부 비면 렌더하지 않는다.
export function SeatChips({ seats, className }: SeatChipsProps) {
  const categories = SEAT_CATEGORY_ORDER.filter(
    (category) => seats[category].length > 0,
  );

  if (categories.length === 0) return null;

  return (
    <ul className={cn("min-w-0 space-y-1.5", className)}>
      {categories.map((category) => (
        <li
          key={category}
          className="flex min-w-0 flex-wrap items-center gap-1.5"
        >
          {/* 색이 아닌 라벨 텍스트로 카테고리를 구분 */}
          <span className="text-xs font-medium break-words text-muted-foreground">
            {SEAT_CATEGORY_LABELS[category]}
          </span>
          {seats[category].map((seat) => (
            <Badge
              key={seat}
              variant="outline"
              className="min-w-0 bg-muted break-words text-foreground"
            >
              {seat}
              <span className="sr-only">번</span>
            </Badge>
          ))}
        </li>
      ))}
    </ul>
  );
}
