import { io } from "next/cache";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  formatBusinessDateLabel,
  getBusinessDate,
  shiftBusinessDate,
} from "@/lib/business-date";
import { getSeatStats } from "@/lib/queries/seat-stats";
import {
  WATCH_WINDOW_DAYS,
  topSeats,
  watchlistRows,
  type SeatStatCategory,
} from "@/lib/stats";

import { TopSeatsCard } from "./_components/top-seats-card";
import { WatchlistCard } from "./_components/watchlist-card";

const TOP_CATEGORIES: readonly SeatStatCategory[] = [
  "standing",
  "cafe_zone",
  "drowsy",
];

// 로딩 스켈레톤
function StatsSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="불러오는 중">
      <Skeleton className="h-24 w-full" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}

// 통계 본문 (현재 시각을 읽으므로 Suspense 안에서 렌더)
async function StatsContent() {
  await io();
  const today = getBusinessDate(new Date());
  const from = shiftBusinessDate(today, -(WATCH_WINDOW_DAYS - 1));
  const { rows, watchSeats } = await getSeatStats(today);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {formatBusinessDateLabel(from)} ~ {formatBusinessDateLabel(today)} (
        {WATCH_WINDOW_DAYS}일)
      </p>
      <WatchlistCard rows={watchlistRows(rows, watchSeats)} />
      {rows.length === 0 ? (
        <p className="rounded-lg border p-4 text-sm text-muted-foreground">
          이 기간에 집계할 순찰 기록이 없습니다.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {TOP_CATEGORIES.map((category) => (
            <TopSeatsCard
              key={category}
              category={category}
              rows={topSeats(rows, category)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SeatStatsPage() {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-4 p-4 sm:p-5">
      <h1 className="text-2xl font-bold">좌석 통계</h1>
      <Suspense fallback={<StatsSkeleton />}>
        <StatsContent />
      </Suspense>
    </main>
  );
}
