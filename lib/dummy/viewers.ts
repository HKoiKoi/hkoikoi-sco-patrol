// Task 018에서 getViewer()로 교체하며 삭제한다.
import type { AuthenticatedViewer, Viewer } from "@/lib/types/auth";

const pending: AuthenticatedViewer = {
  userId: "dummy-pending",
  fullName: "대기 사용자",
  role: "pending",
};

const manager: AuthenticatedViewer = {
  userId: "dummy-manager",
  fullName: "김매니저",
  role: "manager",
};

const admin: AuthenticatedViewer = {
  userId: "dummy-admin",
  fullName: "관리자",
  role: "admin",
};

/** 화면 확인용 더미 사용자. */
export const DUMMY_VIEWERS = {
  anonymous: null,
  pending,
  manager,
  admin,
} satisfies Record<string, Viewer>;

/** 현재 화면에서 사용하는 더미 사용자. */
export const ACTIVE_DUMMY_VIEWER: Viewer = DUMMY_VIEWERS.admin;
