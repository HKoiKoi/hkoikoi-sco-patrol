import type { Viewer } from "@/lib/types/auth";
import type { PatrolLog } from "@/lib/types/patrol";

import { PatrolLogItem } from "./patrol-log-item";

interface PatrolLogListProps {
  logs: PatrolLog[];
  viewer: Viewer;
}

// 순찰 기록 카드 목록. 기록이 없으면 빈 상태 문구를 보여 준다.
export function PatrolLogList({ logs, viewer }: PatrolLogListProps) {
  if (logs.length === 0) {
    return (
      <p className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
        이 영업일에는 순찰 기록이 없습니다
      </p>
    );
  }

  // 일련번호: 해당 영업일 기록을 오래된 순으로 1, 2, 3 ... 으로 매긴다 (id는 문자열이라 순번을 부여).
  const serialById = new Map(
    [...logs]
      .sort((a, b) => Date.parse(a.patrolledAt) - Date.parse(b.patrolledAt))
      .map((log, index) => [log.id, index + 1]),
  );

  return (
    <ul className="space-y-3">
      {logs.map((log) => (
        <li key={log.id} className="min-w-0">
          <PatrolLogItem
            log={log}
            viewer={viewer}
            serial={serialById.get(log.id) ?? 0}
          />
        </li>
      ))}
    </ul>
  );
}
