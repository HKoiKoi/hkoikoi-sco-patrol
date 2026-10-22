import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

import { AuthButton } from "@/components/auth/auth-button";
import { NavMenu } from "@/components/layout/nav-menu";
import { ThemeSwitcher } from "@/components/layout/theme-switcher";
import { Skeleton } from "@/components/ui/skeleton";
import { getViewer } from "@/lib/auth/dal";

// viewer가 필요한 조각은 각자 await 한다. getViewer()는 요청당 1회만 실행된다(React cache).
async function HeaderNav() {
  return <NavMenu viewer={await getViewer()} />;
}

async function HeaderAuth() {
  return <AuthButton viewer={await getViewer()} />;
}

// 앱 공통 상단 헤더: 앱 이름과 테마 전환은 정적 셸에 두고, 내비게이션·인증 버튼만 viewer를 기다린다.
export function AppHeader() {
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
          {/* 모바일 햄버거(size-12) 자리를 지켜 로고가 밀리지 않게 한다. md 이상은 양옆이 flex-1이라 자리가 필요 없다 */}
          <Suspense fallback={<div className="size-12 md:hidden" />}>
            <HeaderNav />
          </Suspense>
        </div>
        <div className="order-3 ml-auto flex shrink-0 items-center justify-end gap-1 md:ml-0 md:flex-1">
          <ThemeSwitcher />
          <Suspense fallback={<Skeleton className="h-9 w-24" />}>
            <HeaderAuth />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
