import { io } from "next/cache";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { requireStaff } from "@/lib/auth/dal";
import { getBusinessDate } from "@/lib/business-date";
import { getMyDraft } from "@/lib/queries/patrol-draft";
import { getLatestStandingCafeZone } from "@/lib/queries/patrol-logs";
import { getActiveQuickTags } from "@/lib/queries/quick-tags";

import { PatrolFormHost } from "./_components/patrol-form-host";

// 하단 고정 액션바(patrol-action-bar.tsx)의 높이: min-h-12 버튼 + p-3(sm:p-4) 두 번 + border-t 1px + 안전 영역.
// useActionBarHeight는 hydrate 후에야 --action-bar-height를 채우므로, 그 전에는 푸터의 하단 여백이 0이다가 뒤늦게 커져 푸터가 움직인다.
// 첫 페인트부터 같은 값을 깔아 두고, 훅이 실제 높이로 덮어쓴다. 바의 패딩·버튼 높이를 바꾸면 이 값도 맞춘다.
const ACTION_BAR_HEIGHT_CSS = `:root{--action-bar-height:calc(4.5rem + 1px + env(safe-area-inset-bottom))}@media (min-width:40rem){:root{--action-bar-height:calc(5rem + 1px + env(safe-area-inset-bottom))}}`;

// 로딩 스켈레톤: PatrolForm과 같은 구조·높이(저장 상태 줄, 좌석 카드 4개, 메모 영역)로 만든다.
// 푸터는 정적 셸이라 먼저 그려지므로 스켈레톤이 폼보다 짧으면 폼이 도착할 때 푸터가 아래로 밀려 레이아웃이 크게 움직인다.
function PatrolSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="불러오는 중">
      <Skeleton className="ml-auto h-6 w-20" />
      {/* 좌석 카드: 제목 28 + 입력줄 48 + 안내줄 20 (seat-category-input.tsx) */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="flex flex-col gap-2 rounded-md border p-3"
          >
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-12 w-full" />
            <div className="h-5" />
          </div>
        ))}
      </div>
      {/* 메모 영역: 라벨 28 + 퀵 태그(버튼 48, 모바일 2열 4줄·md 4열 2줄 = 태그 8개 기준) + 입력창 112 + 글자 수 20.
          실제 폼은 마지막 자식이 고정 액션바라 메모 영역 아래에 space-y 간격 16px이 남으므로 mb-4로 맞춘다 */}
      <div className="mb-4 flex flex-col gap-1.5">
        <Skeleton className="h-7 w-12" />
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
        <Skeleton className="h-28 w-full" />
        <div className="h-5" />
      </div>
    </div>
  );
}

// 서버에서 권한 확인(비로그인·pending은 리디렉션) 후 폼 렌더
async function PatrolContent() {
  const viewer = await requireStaff("/protected/patrol");

  // 현재 시각을 읽기 전에 호출한다(Cache Components). 영업일은 직전 순찰을 찾는 기준이다.
  await io();
  const businessDate = getBusinessDate(new Date());

  const [initialDraft, quickTags, prefill] = await Promise.all([
    getMyDraft(viewer.userId),
    getActiveQuickTags(),
    getLatestStandingCafeZone(businessDate),
  ]);

  return (
    <PatrolFormHost
      viewer={viewer}
      quickTags={quickTags}
      initialDraft={initialDraft}
      prefill={prefill}
    />
  );
}

export default function PatrolPage() {
  return (
    <>
      <style>{ACTION_BAR_HEIGHT_CSS}</style>
      <main className="mx-auto w-full max-w-5xl space-y-4 p-4 sm:p-5">
        <h1 className="text-2xl font-bold">순찰 기록</h1>
        <Suspense fallback={<PatrolSkeleton />}>
          <PatrolContent />
        </Suspense>
      </main>
    </>
  );
}
