// 서버 전용: 퀵 태그 조회. 표시 순서는 sort_order 오름차순이다.
import "server-only";

import { toQuickTag } from "@/lib/supabase/mappers";
import { createClient } from "@/lib/supabase/server";
import type { QuickTag } from "@/lib/types/patrol";

const QUICK_TAG_COLUMNS = "id, label, sort_order, is_active, created_at";

/**
 * 활성(is_active=true) 퀵 태그만 sort_order 오름차순으로 조회한다. 순찰 기록 화면용.
 * 조회 실패 시 Error를 던진다.
 */
export async function getActiveQuickTags(): Promise<QuickTag[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("quick_tags")
    .select(QUICK_TAG_COLUMNS)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`퀵 태그 조회 실패: ${error.message}`);
  }

  return data.map(toQuickTag);
}

/**
 * 숨김 태그까지 모두 sort_order 오름차순으로 조회한다. 관리자 태그 관리 화면용.
 * 조회 실패 시 Error를 던진다.
 */
export async function getAllQuickTags(): Promise<QuickTag[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("quick_tags")
    .select(QUICK_TAG_COLUMNS)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`퀵 태그 조회 실패: ${error.message}`);
  }

  return data.map(toQuickTag);
}
