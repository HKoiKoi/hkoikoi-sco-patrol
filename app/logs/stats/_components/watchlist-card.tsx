import { TriangleAlert } from "lucide-react";

import {
  SEAT_CATEGORY_COLORS,
  SEAT_CHIP_SIZE_CLASS,
} from "@/components/patrol/seat-chips";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  WATCH_LIST_LIMIT,
  WATCH_THRESHOLD,
  WATCH_WINDOW_DAYS,
  type SeatStatRow,
} from "@/lib/stats";
import { cn } from "@/lib/utils";

interface WatchlistCardProps {
  /** watchlistRows로 이미 추려 정렬한 행 */
  rows: SeatStatRow[];
}

// 요주의 좌석 목록 (졸음/딴짓 기준 횟수 이상, 많은 순)
export function WatchlistCard({ rows }: WatchlistCardProps) {
  return (
    <Card className="min-w-0">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-1.5 text-base">
          <TriangleAlert className="size-5 shrink-0" aria-hidden="true" />
          요주의 좌석
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          최근 {WATCH_WINDOW_DAYS}일 졸음/딴짓 {WATCH_THRESHOLD}회 이상 중 많은
          순 상위 {WATCH_LIST_LIMIT}좌석
        </p>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            요주의 좌석이 없습니다.
          </p>
        ) : (
          <ul className="flex min-w-0 flex-wrap gap-3">
            {rows.map((row) => (
              <li key={row.seat} className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "min-w-0 break-words",
                    SEAT_CHIP_SIZE_CLASS,
                    SEAT_CATEGORY_COLORS.drowsy,
                  )}
                >
                  {row.seat}
                  <span className="sr-only">번</span>
                </Badge>
                <span className="text-base font-semibold">
                  {row.drowsy_count}회
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
