import { Suspense } from "react";

export default function PatrolPage() {
  return (
    <main className="mx-auto w-full max-w-5xl p-5">
      <h1 className="text-2xl font-bold">순찰 기록</h1>
      <Suspense fallback={null}>{/* 데이터 영역 자리 */}</Suspense>
    </main>
  );
}
