import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { DUMMY_QUICK_TAGS } from "@/lib/dummy/quick-tags";
import { ACTIVE_DUMMY_VIEWER } from "@/lib/dummy/viewers";
import { canWrite } from "@/lib/permissions";

import { PatrolFormHost } from "./_components/patrol-form-host";

// 로딩 스켈레톤
function PatrolSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="불러오는 중">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

// 권한 확인 후 폼 렌더 (TODO: Task 018에서 requireStaff()/getViewer()로 교체)
async function PatrolContent() {
  const viewer = ACTIVE_DUMMY_VIEWER;

  if (!canWrite(viewer)) {
    return (
      <p role="status" className="rounded-md border bg-muted p-4 text-sm">
        순찰 기록은 매니저와 관리자만 작성할 수 있습니다.
      </p>
    );
  }

  // TODO: Task 018에서 DB 조회로 교체 (어댑터는 Task 020에서 RPC 구현으로 교체)
  return <PatrolFormHost viewer={viewer} quickTags={DUMMY_QUICK_TAGS} />;
}

export default function PatrolPage() {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-4 p-4 sm:p-5">
      <h1 className="text-2xl font-bold">순찰 기록</h1>
      <Suspense fallback={<PatrolSkeleton />}>
        <PatrolContent />
      </Suspense>
    </main>
  );
}
