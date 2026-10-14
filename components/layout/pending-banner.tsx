import { ClockIcon } from "lucide-react";

import { NOTICE_MESSAGES } from "@/lib/auth/notice";
import { isPending } from "@/lib/permissions";
import type { Viewer } from "@/lib/types/auth";

interface PendingBannerProps {
  viewer: Viewer;
}

// 승인 대기(pending) 사용자에게만 보이는 상시 안내 배너
export function PendingBanner({ viewer }: PendingBannerProps) {
  if (!isPending(viewer)) return null;

  return (
    <div role="status" className="border-b bg-muted">
      <div className="mx-auto flex w-full max-w-5xl items-start gap-2 px-4 py-3 text-sm">
        <ClockIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p className="min-w-0 break-keep">{NOTICE_MESSAGES.pending}</p>
      </div>
    </div>
  );
}
