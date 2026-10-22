"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function StatsError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto w-full max-w-5xl space-y-4 p-4 sm:p-5">
      <h1 className="text-2xl font-bold">좌석 통계</h1>
      <div
        role="alert"
        className="space-y-3 rounded-lg border border-destructive/50 p-4"
      >
        <p className="font-medium">통계를 불러오지 못했습니다.</p>
        <p className="text-sm text-muted-foreground">
          잠시 후 다시 시도해 주세요.
        </p>
        <Button type="button" className="h-12" onClick={() => retry()}>
          다시 시도
        </Button>
      </div>
    </main>
  );
}
