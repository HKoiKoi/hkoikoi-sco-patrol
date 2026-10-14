// 화면의 버튼 노출 판정. 최종 방어선은 RLS/GRANT와 RPC 내부 역할 검사다.
import type { PatrolLog } from "@/lib/types/patrol";
import type { Viewer } from "@/lib/types/auth";

/** 순찰 기록 작성 가능 여부 (manager, admin). */
export function canWrite(viewer: Viewer): boolean {
  return viewer?.role === "manager" || viewer?.role === "admin";
}

/** 승인 대기 사용자 여부 (pending). */
export function isPending(viewer: Viewer): boolean {
  return viewer?.role === "pending";
}

export function isAdmin(viewer: Viewer): boolean {
  return viewer?.role === "admin";
}

/** 기록 수정·삭제 가능 여부: admin은 모두, manager는 본인 기록만. */
export function canEdit(
  log: Pick<PatrolLog, "authorId">,
  viewer: Viewer,
): boolean {
  if (!viewer) return false;
  if (viewer.role === "admin") return true;
  return viewer.role === "manager" && log.authorId === viewer.userId;
}
