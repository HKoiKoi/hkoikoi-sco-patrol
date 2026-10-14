import { io } from "next/cache";
import Image from "next/image";
import { Suspense } from "react";

// 현재 연도: 요청 시점에 읽도록 io()로 정적 셸에서 제외한다
async function CurrentYear() {
  await io();
  return <>{new Date().getFullYear()}</>;
}

// 앱 공통 하단 푸터: 앱 이름, 짧은 설명, 저작권 표기
export function AppFooter() {
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <Image
            src="/logo.png"
            alt=""
            width={24}
            height={24}
            className="size-6 shrink-0 rounded-full border object-cover"
          />
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">
              SCO 순찰 일지
            </p>
            <p>30분 간격 순찰 기록</p>
          </div>
        </div>
        <p>
          © <Suspense fallback={null}>{<CurrentYear />}</Suspense> HKOIKOI
        </p>
      </div>
    </footer>
  );
}
