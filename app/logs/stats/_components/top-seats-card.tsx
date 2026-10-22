import {
  SEAT_CATEGORY_COLORS,
  SEAT_CHIP_SIZE_CLASS,
  SeatCategoryLabel,
} from "@/components/patrol/seat-chips";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { SeatStatCategory, SeatStatRow } from "@/lib/stats";
import { cn } from "@/lib/utils";

interface TopSeatsCardProps {
  category: SeatStatCategory;
  /** topSeats로 이미 추려 정렬한 행 */
  rows: SeatStatRow[];
}

// 카테고리별 TOP 10 (좌석 번호, 횟수). 색이 아닌 라벨·'N회' 텍스트로도 구분한다.
export function TopSeatsCard({ category, rows }: TopSeatsCardProps) {
  const key = `${category}_count` as const;

  return (
    <Card className="min-w-0">
      <CardHeader className="pb-3">
        <SeatCategoryLabel category={category} />
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">기록이 없습니다.</p>
        ) : (
          <ol className="space-y-2">
            {rows.map((row, index) => (
              <li key={row.seat} className="flex min-w-0 items-center gap-3">
                <span className="w-6 shrink-0 text-right text-sm text-muted-foreground">
                  {index + 1}
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    "min-w-0 break-words",
                    SEAT_CHIP_SIZE_CLASS,
                    SEAT_CATEGORY_COLORS[category],
                  )}
                >
                  {row.seat}
                  <span className="sr-only">번</span>
                </Badge>
                <span className="ml-auto shrink-0 text-base font-semibold">
                  {row[key]}회
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
