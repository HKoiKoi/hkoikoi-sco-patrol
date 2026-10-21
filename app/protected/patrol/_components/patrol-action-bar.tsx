import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * 액션바가 차지하는 높이 (버튼 48px + 상하 패딩 + 안전 영역 여유).
 * 사용처는 본문 하단에 이 클래스를 적용해 내용이 가려지지 않게 한다.
 */
export const ACTION_BAR_SPACER_CLASS = "pb-28";

interface PatrolActionBarProps {
  /** 순찰 완료 요청 처리 중 여부 */
  completing: boolean;
  /** 완료 응답을 받지 못해 같은 요청으로 다시 시도해야 하는 상태 */
  retrying?: boolean;
  onComplete: () => void;
  className?: string;
}

// 하단 고정 액션바: [순찰 완료]
export function PatrolActionBar({
  completing,
  retrying = false,
  onComplete,
  className,
}: PatrolActionBarProps) {
  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur",
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-5xl items-center p-3 sm:p-4">
        <Button
          type="button"
          className="min-h-12 flex-1 text-lg aria-disabled:pointer-events-none aria-disabled:opacity-50"
          // disabled를 쓰면 포커스를 가진 버튼이 비활성화되며 포커스가 body로 떨어진다
          aria-disabled={completing}
          aria-busy={completing}
          onClick={completing ? undefined : onComplete}
        >
          {completing && (
            <Loader2 className="animate-spin" aria-hidden="true" />
          )}
          {completing ? "처리 중" : retrying ? "다시 시도" : "순찰 완료"}
        </Button>
      </div>
    </div>
  );
}
