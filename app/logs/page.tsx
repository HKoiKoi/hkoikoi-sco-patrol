import { io } from "next/cache";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { getBusinessDate, parseBusinessDateParam } from "@/lib/business-date";
import { getDummyLogsByDate } from "@/lib/dummy/patrol-logs";
import { ACTIVE_DUMMY_VIEWER } from "@/lib/dummy/viewers";

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
  const businessDate = parseBusinessDateParam(date) ?? currentDate;
  // TODO: Task 018에서 DB 조회로 교체
  const logs = getDummyLogsByDate(businessDate);

  return (
    <div className="space-y-4">
      <DateNav
        date={businessDate}
        currentDate={currentDate}
        viewer={ACTIVE_DUMMY_VIEWER}
      />
      {/* TODO: Task 018에서 getViewer()로 교체 */}
      <PatrolLogList logs={logs} viewer={ACTIVE_DUMMY_VIEWER} />
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
