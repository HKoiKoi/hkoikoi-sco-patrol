"use client";

import { InfoIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { getNoticeMessage } from "@/lib/auth/notice";

// 권한 부족 시 전달되는 `?notice=` 코드를 읽어 안내 배너로 표시한다.
export function NoticeBanner() {
  const searchParams = useSearchParams();
  const message = getNoticeMessage(searchParams.get("notice"));

  if (!message) return null;

  return (
    <div role="status" className="border-b bg-muted">
      <div className="mx-auto flex w-full max-w-5xl items-start gap-2 px-4 py-3 text-sm">
        <InfoIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p className="min-w-0 break-keep">{message}</p>
      </div>
    </div>
  );
}
