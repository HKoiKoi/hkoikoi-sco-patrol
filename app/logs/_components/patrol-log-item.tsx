import type { ReactNode } from "react";

import { CopyButton } from "@/components/patrol/copy-button";
import { SeatChips } from "@/components/patrol/seat-chips";
import { Card, CardContent } from "@/components/ui/card";
import { formatKstTime } from "@/lib/business-date";
import type { PatrolLog } from "@/lib/types/patrol";

interface PatrolLogItemProps {
  log: PatrolLog;
  /** 수정·삭제 등 추가 액션 슬롯 (T007-4에서 채움) */
  actions?: ReactNode;
}

// 순찰 기록 카드: 시각, 작성자, 좌석 칩, 메모, 복사 버튼
export function PatrolLogItem({ log, actions }: PatrolLogItemProps) {
  const hasMemo = log.memo.length > 0;

  return (
    <Card className="min-w-0 py-4">
      <CardContent className="min-w-0 space-y-3 px-4">
        {/* 시각·작성자 */}
        <div className="flex min-w-0 items-baseline gap-2">
          <time
            dateTime={log.patrolledAt}
            className="shrink-0 text-lg font-bold tabular-nums"
          >
            {formatKstTime(log.patrolledAt)}
          </time>
          <span className="min-w-0 text-sm break-words text-muted-foreground">
            {log.authorName}
          </span>
        </div>

        <SeatChips seats={log} />

        {hasMemo && (
          <p className="min-w-0 text-sm break-words whitespace-pre-wrap">
            {log.memo}
          </p>
        )}

        {/* 복사 버튼 슬롯 */}
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <CopyButton
            patrolledAt={log.patrolledAt}
            memo={log.memo}
            drowsy={log.drowsy}
          />
          {actions}
        </div>
      </CardContent>
    </Card>
  );
}
