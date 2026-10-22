"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isAdmin } from "@/lib/permissions";
import type { Viewer } from "@/lib/types/auth";
import { cn } from "@/lib/utils";

interface NavMenuProps {
  viewer: Viewer;
}

// 현재 경로가 해당 메뉴에 속하는지 판정 (기본은 하위 경로 포함, exact면 정확 일치)
function isActive(pathname: string, href: string, exact = false) {
  return pathname === href || (!exact && pathname.startsWith(`${href}/`));
}

// 주 내비게이션: md 이상 가로 링크, md 미만 햄버거 드롭다운
export function NavMenu({ viewer }: NavMenuProps) {
  const pathname = usePathname();

  // 순찰 기록은 권한 처리를 클릭 후 서버가 하므로 항상 노출한다.
  // /logs는 /logs/stats를 하위 경로로 보지 않도록 정확 일치로 판정한다.
  const items: { href: string; label: string; exact?: boolean }[] = [
    { href: "/logs", label: "일지 조회", exact: true },
    { href: "/logs/stats", label: "통계" },
    { href: "/protected/patrol", label: "순찰 기록" },
    ...(isAdmin(viewer)
      ? [{ href: "/protected/admin/tags", label: "퀵 태그 관리" }]
      : []),
  ];

  return (
    <>
      {/* 데스크톱/태블릿: 가로 링크 */}
      <nav aria-label="주 메뉴" className="hidden md:block">
        <ul className="flex items-center gap-1">
          {items.map((item) => {
            const active = isActive(pathname, item.href, item.exact);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-12 items-center rounded-md px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* 모바일: 햄버거 드롭다운 */}
      <div className="md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-12"
              aria-label="메뉴 열기"
            >
              <Menu className="size-5" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-44">
            {items.map((item) => {
              const active = isActive(pathname, item.href, item.exact);
              return (
                <DropdownMenuItem
                  key={item.href}
                  asChild
                  className={cn("min-h-12 text-base", active && "bg-accent")}
                >
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
