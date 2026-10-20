import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { requireStaff } from "@/lib/auth/dal";
import { getMyDraft } from "@/lib/queries/patrol-draft";
import { getActiveQuickTags } from "@/lib/queries/quick-tags";

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

// 서버에서 권한 확인(비로그인·pending은 리디렉션) 후 폼 렌더
async function PatrolContent() {
  const viewer = await requireStaff("/protected/patrol");

  const [initialDraft, quickTags] = await Promise.all([
    getMyDraft(viewer.userId),
    getActiveQuickTags(),
  ]);

  return (
    <PatrolFormHost
      viewer={viewer}
      quickTags={quickTags}
      initialDraft={initialDraft}
    />
  );
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
