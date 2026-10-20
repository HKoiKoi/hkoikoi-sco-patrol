// 서버 전용: 로그인한 사용자의 순찰 초안을 조회한다.
import "server-only";

import { EMPTY_PATROL_CONTENT } from "@/lib/patrol-form-reducer";
import { toPatrolDraft } from "@/lib/supabase/mappers";
import { createClient } from "@/lib/supabase/server";
import type { PatrolDraft } from "@/lib/types/patrol";

/**
 * 사용자 본인의 순찰 초안을 조회한다. 소유자 판정은 RLS가 하고 user_id 필터는 의도 표시용이다.
 * 초안 행이 아직 없으면(첫 저장 전) revision 0의 빈 초안을 돌려준다.
 * 조회 실패 시 Error를 던져 route의 error.tsx 경계가 처리하게 한다.
 */
export async function getMyDraft(userId: string): Promise<PatrolDraft> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("patrol_drafts")
    .select(
      "user_id, revision, updated_at, standing, cafe_zone, drowsy, away, memo",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`초안 조회 실패: ${error.message}`);
  }

  if (!data) {
    return { revision: 0, updatedAt: "", content: EMPTY_PATROL_CONTENT };
  }

  return toPatrolDraft(data);
}
