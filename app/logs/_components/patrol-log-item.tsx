import { StickyNote } from "lucide-react";

import { CopyButton } from "@/components/patrol/copy-button";
import { SeatChips } from "@/components/patrol/seat-chips";
import { Card, CardContent } from "@/components/ui/card";
import { formatKstTime } from "@/lib/business-date";
import { canEdit } from "@/lib/permissions";
import type { Viewer } from "@/lib/types/auth";
import type { PatrolLog } from "@/lib/types/patrol";

import { AwaySeatActions } from "./away-seat-actions";
import { DeleteLogDialog, EditLogDialog } from "./edit-log-dialog";

interface PatrolLogItemProps {
  log: PatrolLog;
  viewer: Viewer;
  /** 해당 영업일 안에서 오래된 기록부터 1, 2, 3 ... 으로 매긴 일련번호 */
  serial: number;
}

// 순찰 기록 카드: 시각, 작성자, 좌석 칩, 메모, 복사 버튼
export function PatrolLogItem({ log, viewer, serial }: PatrolLogItemProps) {
  const editable = canEdit(log, viewer);
  const hasMemo = log.memo.trim().length > 0;

  return (
    <Card className="min-w-0 py-4">
      <CardContent className="min-w-0 space-y-3 px-4 pb-0">
        {/* 일지 번호 배지 */}
        <span
          role="img"
          aria-label={`일지 번호 ${serial}`}
          className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-2 text-xs font-bold text-primary-foreground tabular-nums"
        >
          <span aria-hidden="true">#{serial}</span>
        </span>

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
          awaySlot={editable ? <AwaySeatActions log={log} /> : undefined}
        />

        {hasMemo && (
          // 메모 섹션: 좌석 섹션과 같은 라벨 + 박스 본문 (비어 있으면 숨김)
          <section className="min-w-0 space-y-1.5" aria-label="메모">
            <h3 className="inline-flex items-center gap-1.5 text-base font-semibold text-muted-foreground">
              <StickyNote className="size-5 shrink-0" aria-hidden="true" />
              메모
            </h3>
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
              <DeleteLogDialog />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
