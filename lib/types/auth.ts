/** profiles.role 값. 기본값은 pending이며 승격은 Supabase 대시보드에서만 한다. */
export type Role = "pending" | "manager" | "admin";

/** 로그인한 사용자 정보 (profiles 대응). */
export interface AuthenticatedViewer {
  userId: string;
  fullName: string;
  role: Role;
}

/** 현재 보는 사람. 비로그인이면 null. */
export type Viewer = AuthenticatedViewer | null;
