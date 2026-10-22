import { io } from "next/cache";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  getBusinessDate,
  parseBusinessDateParam,
  shiftBusinessDate,
} from "@/lib/business-date";
import { getViewer } from "@/lib/auth/dal";
import { getPatrolLogsByDate } from "@/lib/queries/patrol-logs";
import { getWatchSeats } from "@/lib/queries/seat-stats";

import { DateNav } from "./_components/date-nav";
import { PatrolLogList } from "./_components/patrol-log-list";

interface LogsPageProps {
  searchParams: Promise<{ date?: string | string[] }>;
}

// 로딩 스켈레톤
function LogsSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="불러오는 중">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

// 날짜 이동 + 기록 목록 (현재 시각을 읽으므로 Suspense 안에서 렌더)
async function LogsContent({ searchParams }: LogsPageProps) {
  const { date } = await searchParams;
  await io();
  const currentDate = getBusinessDate(new Date());
  // 잘못된 date는 리디렉션 없이 현재 영업일로 대체한다.
  // 다음 날짜 이동과 같은 상한(현재 영업일 + 1일)을 직접 입력한 URL에도 적용한다.
  // YYYY-MM-DD는 문자열 비교가 곧 날짜 비교다.
  const parsedDate = parseBusinessDateParam(date);
  const businessDate =
    parsedDate !== null && parsedDate <= shiftBusinessDate(currentDate, 1)
      ? parsedDate
      : currentDate;
  // 요주의 판정은 보는 날짜와 무관하게 현재 영업일 기준이다.
  const [viewer, logs, watchSeats] = await Promise.all([
    getViewer(),
    getPatrolLogsByDate(businessDate),
    getWatchSeats(currentDate),
  ]);

  return (
    <div className="space-y-4">
      <DateNav date={businessDate} currentDate={currentDate} viewer={viewer} />
      <PatrolLogList logs={logs} viewer={viewer} watchSeats={watchSeats} />
    </div>
  );
}

export default function LogsPage({ searchParams }: LogsPageProps) {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-4 p-4 sm:p-5">
      <h1 className="text-2xl font-bold">순찰 일지</h1>
      <Suspense fallback={<LogsSkeleton />}>
        <LogsContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
