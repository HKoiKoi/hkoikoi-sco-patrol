import { Suspense } from "react";

export default function AdminTagsPage() {
  return (
    <main className="mx-auto w-full max-w-5xl p-5">
      <h1 className="text-2xl font-bold">퀵 태그 관리</h1>
      <Suspense fallback={null}>{/* 데이터 영역 자리 */}</Suspense>
    </main>
  );
}
