import Link from "next/link";
import { Suspense } from "react";

import { AuthButton } from "@/components/auth-button";
import { NavMenu } from "@/components/layout/nav-menu";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Skeleton } from "@/components/ui/skeleton";
import type { Viewer } from "@/lib/types/auth";

interface AppHeaderProps {
  viewer: Viewer;
}

// 앱 공통 상단 헤더: 앱 이름, 내비게이션, 테마 전환, 인증 버튼
export function AppHeader({ viewer }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="mx-auto flex min-h-14 w-full max-w-5xl items-center gap-2 px-4">
        <NavMenu viewer={viewer} />
        <Link
          href="/logs"
          className="min-w-0 flex-1 truncate text-base font-semibold md:flex-none md:pr-4"
        >
          SCO 순찰 일지
        </Link>
        <div className="ml-auto flex shrink-0 items-center gap-1 md:ml-auto">
          <ThemeSwitcher />
          <Suspense fallback={<Skeleton className="h-9 w-24" />}>
            <AuthButton viewer={viewer} />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
