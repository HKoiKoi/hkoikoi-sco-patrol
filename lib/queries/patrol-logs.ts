import "server-only";

import { toPatrolLog } from "@/lib/supabase/mappers";
import { createClient } from "@/lib/supabase/server";
import type { PatrolLog } from "@/lib/types/patrol";

/**
 * 영업일(YYYY-MM-DD) 하나의 순찰 기록을 최신순으로 조회한다.
 * 조회 권한은 RLS(anon·authenticated 모두 select 허용)가 판정하므로 역할별 분기는 없다.
 * 조회 실패 시 Error를 던져 route의 error.tsx 경계가 처리하게 한다.
 */
export async function getPatrolLogsByDate(date: string): Promise<PatrolLog[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("patrol_logs")
    .select(
      "id, business_date, patrolled_at, author_id, standing, cafe_zone, drowsy, away, memo, staff_names(full_name)",
    )
    .eq("business_date", date)
    .order("patrolled_at", { ascending: false });

  if (error) {
    throw new Error(`순찰 기록 조회 실패: ${error.message}`);
  }

  // 작성자 이름이 없으면 빈 문자열을 넘기고, 화면 폴백은 PatrolLogItem이 맡는다.
  return data.map(({ staff_names, ...row }) =>
    toPatrolLog(row, staff_names?.full_name ?? ""),
  );
}
