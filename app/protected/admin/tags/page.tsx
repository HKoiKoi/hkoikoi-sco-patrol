import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { requireAdmin } from "@/lib/auth/dal";
import { DUMMY_QUICK_TAGS } from "@/lib/dummy/quick-tags";

import { TagList } from "./_components/tag-list";

// 로딩 스켈레톤
function TagsSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="불러오는 중">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}

// 서버에서 관리자 확인(비로그인·pending·manager는 리디렉션) 후 목록 렌더
async function TagsContent() {
  await requireAdmin("/protected/admin/tags");

  // TODO: Task 018에서 DB 조회로 교체
  return <TagList initialTags={DUMMY_QUICK_TAGS} />;
}

export default function AdminTagsPage() {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-4 p-4 sm:p-5">
      <h1 className="text-2xl font-bold">퀵 태그 관리</h1>
      <Suspense fallback={<TagsSkeleton />}>
        <TagsContent />
      </Suspense>
    </main>
  );
}
