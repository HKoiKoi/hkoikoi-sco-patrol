import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useActionBarHeight } from "@/hooks/use-action-bar-height";
import { useKeyboardInset } from "@/hooks/use-keyboard-inset";
import { cn } from "@/lib/utils";

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
  // 가상 키보드가 올라오면 바를 키보드 위로 올린다(--keyboard-inset)
  useKeyboardInset();
  // 바 높이를 --action-bar-height에 담아 공통 푸터가 바 뒤로 가려지지 않게 한다
  const barRef = useActionBarHeight<HTMLDivElement>();

  return (
    <div
      ref={barRef}
      className={cn(
        "fixed inset-x-0 bottom-[var(--keyboard-inset,0px)] z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur",
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
