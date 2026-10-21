import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

import { AuthButton } from "@/components/auth/auth-button";
import { NavMenu } from "@/components/layout/nav-menu";
import { ThemeSwitcher } from "@/components/layout/theme-switcher";
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
        <Link
          href="/logs"
          className="order-2 flex min-w-0 items-center gap-2 md:order-1 md:flex-1"
        >
          <Image
            src="/logo.png"
            alt=""
            width={32}
            height={32}
            className="size-8 shrink-0 rounded-full border object-cover"
          />
          <span className="truncate text-base font-semibold">
            SCO 순찰 일지
          </span>
        </Link>
        <div className="order-1 md:order-2 md:flex md:flex-none md:justify-center">
          <NavMenu viewer={viewer} />
        </div>
        <div className="order-3 ml-auto flex shrink-0 items-center justify-end gap-1 md:ml-0 md:flex-1">
          <ThemeSwitcher />
          <Suspense fallback={<Skeleton className="h-9 w-24" />}>
            <AuthButton viewer={viewer} />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
