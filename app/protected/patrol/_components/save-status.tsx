import { AlertTriangle, Check, CloudOff, Loader2 } from "lucide-react";

import { formatKstTime } from "@/lib/business-date";
import type { PatrolFormStatus } from "@/lib/patrol-form-reducer";
import { cn } from "@/lib/utils";

interface SaveStatusProps {
  status: PatrolFormStatus;
  /** 마지막 저장 성공 시각 (서버 응답 기준 ISO 문자열) */
  lastSavedAt: string | null;
  className?: string;
}

// 저장 상태 표시 (스크린 리더에는 변경 사항을 polite로 알림)
export function SaveStatus({
  status,
  lastSavedAt,
  className,
}: SaveStatusProps) {
  return (
    <p
      role="status"
      aria-live="polite"
      className={cn(
        "flex min-h-6 items-center gap-1.5 text-sm text-muted-foreground",
        (status === "conflict" || status === "error") &&
          "font-medium text-destructive",
        className,
      )}
    >
      {status === "saving" && (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          저장 중
        </>
      )}
      {status === "saved" && (
        <>
          <Check className="size-4" aria-hidden="true" />
          {lastSavedAt ? `저장됨 ${formatKstTime(lastSavedAt)}` : "저장됨"}
        </>
      )}
      {status === "offline" && (
        <>
          <CloudOff className="size-4" aria-hidden="true" />
          오프라인 (기기에 임시 저장)
        </>
      )}
      {status === "error" && (
        <>
          <AlertTriangle className="size-4" aria-hidden="true" />
          저장 실패 (기기에 임시 저장)
        </>
      )}
      {status === "conflict" && (
        <>
          <AlertTriangle className="size-4" aria-hidden="true" />
          충돌
        </>
      )}
      {/* clean은 표시 없음, dirty는 곧 저장되므로 안내만 약하게 표시 */}
      {status === "dirty" && "저장 대기 중"}
    </p>
  );
}
