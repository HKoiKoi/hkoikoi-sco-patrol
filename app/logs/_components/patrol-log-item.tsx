import { cva } from "class-variance-authority";
import { AlertTriangle, StickyNote } from "lucide-react";

import { CopyButton } from "@/components/patrol/copy-button";
import { SeatChips } from "@/components/patrol/seat-chips";
import { Card, CardContent } from "@/components/ui/card";
import { formatKstTime } from "@/lib/business-date";
import { canEdit } from "@/lib/permissions";
import type { Viewer } from "@/lib/types/auth";
import { watchSeatsInLog } from "@/lib/stats";
import type { PatrolLog } from "@/lib/types/patrol";

import { AwaySeatActions } from "./away-seat-actions";
import { DeleteLogDialog, EditLogDialog } from "./edit-log-dialog";

// 요주의 좌석이 든 카드는 테두리·배경으로 구분한다 (카테고리 칩 색과 겹치지 않게 destructive 토큰 사용).
const cardVariants = cva("min-w-0 py-4", {
  variants: {
    watch: {
      true: "border-2 border-destructive bg-red-50 dark:bg-red-950/40",
      false: "",
    },
  },
  defaultVariants: { watch: false },
});

interface PatrolLogItemProps {
  log: PatrolLog;
  viewer: Viewer;
  /** 해당 영업일 안에서 오래된 기록부터 1, 2, 3 ... 으로 매긴 일련번호 */
  serial: number;
  /** 현재 요주의 좌석 번호. 이 기록의 졸음/딴짓 좌석과 겹치면 카드를 강조한다. */
  watchSeats?: readonly number[];
}

// 순찰 기록 카드: 시각, 작성자, 좌석 칩, 메모, 복사 버튼
export function PatrolLogItem({
  log,
  viewer,
  serial,
  watchSeats = [],
}: PatrolLogItemProps) {
  const editable = canEdit(log, viewer);
  const hasMemo = log.memo.trim().length > 0;
  const flagged = watchSeatsInLog(log.drowsy, watchSeats);
  const isWatch = flagged.length > 0;

  return (
    <Card className={cardVariants({ watch: isWatch })}>
      <CardContent className="min-w-0 space-y-3 px-4 pb-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {/* 일지 번호 배지 */}
          <span
            role="img"
            aria-label={`일지 번호 ${serial}`}
            className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-2 text-xs font-bold text-primary-foreground tabular-nums"
          >
            <span aria-hidden="true">#{serial}</span>
          </span>
          {/* 색만으로 구분하지 않도록 아이콘과 텍스트를 함께 둔다 */}
          {isWatch && (
            <span className="inline-flex h-6 items-center gap-1 rounded-full border border-destructive px-2 text-xs font-bold text-destructive">
              <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
              요주의
            </span>
          )}
        </div>

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

        {/* 수정 권한이 있으면 자리비움 칩이 클릭 가능한 메뉴가 된다 */}
        <SeatChips
          seats={log}
          highlightSeats={flagged}
          awaySlot={editable ? <AwaySeatActions log={log} /> : undefined}
        />

        {hasMemo && (
          // 메모 섹션: 좌석 섹션과 같은 라벨 + 박스 본문 (비어 있으면 숨김)
          <section className="min-w-0 space-y-1.5" aria-label="메모">
            <h2 className="inline-flex items-center gap-1.5 text-base font-semibold text-muted-foreground">
              <StickyNote className="size-5 shrink-0" aria-hidden="true" />
              메모
            </h2>
            <p className="min-w-0 rounded-md border bg-muted/50 px-3 py-2.5 text-base break-words whitespace-pre-wrap text-foreground">
              {log.memo}
            </p>
          </section>
        )}

        {/* 복사 버튼 슬롯 */}
        <div className="flex min-w-0 flex-wrap items-center gap-2 pt-1">
          <CopyButton
            patrolledAt={log.patrolledAt}
            memo={log.memo}
            drowsy={log.drowsy}
          />
          {editable && (
            <>
              <EditLogDialog log={log} />
              <DeleteLogDialog logId={log.id} />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
