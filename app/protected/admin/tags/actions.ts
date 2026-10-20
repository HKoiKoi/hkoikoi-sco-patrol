"use server";

import { refresh } from "next/cache";

import { requireAdmin } from "@/lib/auth/dal";
import { validateTagLabel } from "@/lib/quick-tag-label";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/patrol";

// 퀵 태그 관리 Server Action (관리자 전용).
// 권한의 최종 판단은 RLS와 RPC 본문의 역할 검사이며, 거부된 행은 에러가 아니라 0행으로 돌아온다.
// requireAdmin은 redirect를 던지므로 try/catch 밖에서 호출한다.

type TagResult = ActionResult<null>;

const ADMIN_PATH = "/protected/admin/tags";

const ERROR_FORBIDDEN = "권한이 없거나 삭제된 태그입니다";
const ERROR_INVALID = "잘못된 요청입니다";
const ERROR_SAVE_FAILED = "저장하지 못했습니다. 잠시 후 다시 시도해 주세요";
const ERROR_DUPLICATE = "이미 있는 문구입니다";
const ERROR_NEWLINE = "개행 없이 입력해 주세요";
const ERROR_ADMIN_REQUIRED = "관리자 권한이 필요합니다";
const ERROR_NOT_FOUND = "태그를 찾을 수 없습니다";

const OK: TagResult = { ok: true, data: null };

function isValidId(id: unknown): id is string {
  return typeof id === "string" && id.length > 0;
}

/** Postgres 에러 코드를 사용자 문구로 바꾼다. */
function mapTagError(error: { code?: string } | null): string {
  switch (error?.code) {
    case "23505":
      return ERROR_DUPLICATE;
    case "23514":
      return ERROR_NEWLINE;
    case "42501":
      return ERROR_ADMIN_REQUIRED;
    case "P0002":
      return ERROR_NOT_FOUND;
    default:
      return ERROR_SAVE_FAILED;
  }
}

/** insert/update/delete 결과를 ActionResult로 바꾼다. 0행은 권한 없음 또는 삭제된 태그다. */
function toResult(
  error: { code?: string } | null,
  rows: { id: string }[] | null,
): TagResult {
  if (error) return { ok: false, error: mapTagError(error) };
  if (!rows || rows.length === 0) return { ok: false, error: ERROR_FORBIDDEN };
  refresh();
  return OK;
}

/** 새 태그를 맨 뒤 순서로 추가한다. */
export async function createTag(label: string): Promise<TagResult> {
  await requireAdmin(ADMIN_PATH);

  if (typeof label !== "string") return { ok: false, error: ERROR_INVALID };
  const validated = validateTagLabel(label);
  if (!validated.ok) return { ok: false, error: validated.error };

  const supabase = await createClient();
  const { data: last, error: readError } = await supabase
    .from("quick_tags")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (readError) return { ok: false, error: mapTagError(readError) };

  // 동시 추가로 sort_order가 겹쳐도 유일 제약이 없어 순서만 모호해질 뿐 저장은 막지 않는다.
  const { data, error } = await supabase
    .from("quick_tags")
    .insert({ label: validated.label, sort_order: (last?.sort_order ?? 0) + 1 })
    .select("id");

  return toResult(error, data);
}

export async function updateTagLabel(
  id: string,
  label: string,
): Promise<TagResult> {
  await requireAdmin(ADMIN_PATH);

  if (!isValidId(id) || typeof label !== "string") {
    return { ok: false, error: ERROR_INVALID };
  }
  const validated = validateTagLabel(label);
  if (!validated.ok) return { ok: false, error: validated.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quick_tags")
    .update({ label: validated.label })
    .eq("id", id)
    .select("id");

  return toResult(error, data);
}

/** 활성 여부를 목표값으로 설정한다. 뒤집지 않으므로 중복 요청에도 결과가 같다. */
export async function toggleTagActive(
  id: string,
  isActive: boolean,
): Promise<TagResult> {
  await requireAdmin(ADMIN_PATH);

  if (!isValidId(id) || typeof isActive !== "boolean") {
    return { ok: false, error: ERROR_INVALID };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quick_tags")
    .update({ is_active: isActive })
    .eq("id", id)
    .select("id");

  return toResult(error, data);
}

export async function deleteTag(id: string): Promise<TagResult> {
  await requireAdmin(ADMIN_PATH);

  if (!isValidId(id)) return { ok: false, error: ERROR_INVALID };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quick_tags")
    .delete()
    .eq("id", id)
    .select("id");

  return toResult(error, data);
}

/** 두 태그의 순서를 RPC로 맞바꾼다(한 트랜잭션, 관리자 검사는 RPC 본문). */
export async function swapTagOrder(
  tagA: string,
  tagB: string,
): Promise<TagResult> {
  await requireAdmin(ADMIN_PATH);

  if (!isValidId(tagA) || !isValidId(tagB) || tagA === tagB) {
    return { ok: false, error: ERROR_INVALID };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("swap_quick_tag_order", {
    tag_a: tagA,
    tag_b: tagB,
  });
  if (error) return { ok: false, error: mapTagError(error) };

  refresh();
  return OK;
}
