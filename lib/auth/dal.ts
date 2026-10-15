import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { getSafeNextPath } from "@/lib/auth/safe-next";
import type { NoticeCode } from "@/lib/auth/notice";
import { createClient } from "@/lib/supabase/server";
import type { AuthenticatedViewer, Role, Viewer } from "@/lib/types/auth";

/** `/logs?notice=<코드>` 안내 경로 */
function noticePath(code: NoticeCode): string {
  return `/logs?notice=${code}`;
}

/** DB의 role 문자열을 Role로 좁힌다. 알 수 없는 값은 가장 낮은 권한(pending). */
function toRole(value: string | null | undefined): Role {
  return value === "manager" || value === "admin" ? value : "pending";
}

/**
 * 현재 로그인한 사용자와 profiles.role을 서버에서 조회한다(요청당 1회).
 * 비로그인은 null. 프로필 조회 실패·행 없음은 pending으로 처리한다(권한을 낮추는 방향).
 * 권한 판정이라 `use cache`로 캐시하지 않는다.
 */
export const getViewer = cache(async (): Promise<Viewer> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", userId)
    .maybeSingle();

  return {
    userId,
    fullName: profile?.full_name ?? "",
    role: toRole(profile?.role),
  };
});

/** 로그인과 승인(pending 아님)을 확인한다. 부족하면 리디렉션한다. */
async function requireApproved(nextPath: string): Promise<AuthenticatedViewer> {
  const viewer = await getViewer();
  if (!viewer) {
    redirect(
      `/auth/login?next=${encodeURIComponent(getSafeNextPath(nextPath))}`,
    );
  }
  if (viewer.role === "pending") redirect(noticePath("pending"));
  return viewer;
}

/**
 * manager·admin만 통과시킨다. 비로그인은 로그인(`nextPath`로 복귀), pending은 안내로 보낸다.
 * `nextPath`는 호출하는 페이지의 경로 리터럴을 넘긴다.
 */
export async function requireStaff(
  nextPath: string,
): Promise<AuthenticatedViewer> {
  return requireApproved(nextPath);
}

/** admin만 통과시킨다. manager는 `admin-required` 안내로 보낸다. */
export async function requireAdmin(
  nextPath: string,
): Promise<AuthenticatedViewer> {
  const viewer = await requireApproved(nextPath);
  if (viewer.role !== "admin") redirect(noticePath("admin-required"));
  return viewer;
}
