import type { PatrolLog } from "@/lib/types/patrol";

import { PatrolLogItem } from "./patrol-log-item";

interface PatrolLogListProps {
  logs: PatrolLog[];
}

// 순찰 기록 카드 목록. 기록이 없으면 빈 상태 문구를 보여 준다.
export function PatrolLogList({ logs }: PatrolLogListProps) {
  if (logs.length === 0) {
    return (
      <p className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
        이 영업일에는 순찰 기록이 없습니다
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {logs.map((log) => (
        <li key={log.id} className="min-w-0">
          <PatrolLogItem log={log} />
        </li>
      ))}
    </ul>
  );
}
