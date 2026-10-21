import Link from "next/link";

import { LogoutButton } from "@/components/auth/logout-button";
import { Button } from "@/components/ui/button";
import type { Viewer } from "@/lib/types/auth";

interface AuthButtonProps {
  viewer: Viewer;
}

// 로그인 상태에 따른 인증 버튼 (viewer는 상위에서 주입)
export function AuthButton({ viewer }: AuthButtonProps) {
  if (!viewer) {
    return (
      <div className="flex items-center gap-2">
        <Button asChild size="sm" variant="outline">
          <Link href="/auth/login">로그인</Link>
        </Button>
        <Button asChild size="sm" variant="default">
          <Link href="/auth/sign-up">가입</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden max-w-32 truncate text-sm sm:inline">
        {viewer.fullName}
      </span>
      <LogoutButton />
    </div>
  );
}
