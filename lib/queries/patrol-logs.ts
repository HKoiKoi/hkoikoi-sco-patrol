import "server-only";

import { toPatrolLog } from "@/lib/supabase/mappers";
import { createClient } from "@/lib/supabase/server";
import type { PatrolContent, PatrolLog } from "@/lib/types/patrol";

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

/**
 * 영업일 하나에서 가장 최근에 완료된 순찰의 스탠딩·카페존 좌석을 조회한다(작성자 무관).
 * 순찰 입력 화면의 자동 채움용이다. 부가 기능이라 조회 실패가 화면을 막으면 안 되므로,
 * 다른 조회 함수와 달리 에러를 던지지 않고 null을 돌려 "채우지 않음"으로 처리한다.
 * 기록이 없거나 두 목록이 모두 비어 있어도 채울 값이 없으므로 null이다.
 */
export async function getLatestStandingCafeZone(
  businessDate: string,
): Promise<Pick<PatrolContent, "standing" | "cafe_zone"> | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("patrol_logs")
    .select("standing, cafe_zone")
    .eq("business_date", businessDate)
    .order("patrolled_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  if (data.standing.length === 0 && data.cafe_zone.length === 0) return null;

  return { standing: data.standing, cafe_zone: data.cafe_zone };
}
