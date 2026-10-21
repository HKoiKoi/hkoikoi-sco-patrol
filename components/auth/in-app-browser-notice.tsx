"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

// 대소문자 구분: 앱별 UA 토큰(KAKAOTALK, FBAN 등)이 고정 표기라 i 플래그를 쓰지 않는다.
// i를 쓰면 "line"이 일반 UA 문자열에 매칭되는 등 오탐이 늘어난다.
const IN_APP_BROWSER_PATTERN =
  /KAKAOTALK|NAVER|Line|FBAN|FBAV|Instagram|; wv\)/;

export function InAppBrowserNotice() {
  const [isInApp, setIsInApp] = useState(false);

  useEffect(() => {
    // 렌더 중 navigator 접근은 hydration 불일치를 만들므로 effect에서만 검사한다.
    // effect 본문에서 동기 setState를 피하도록 콜백(rAF)에서 반영한다.
    const frame = requestAnimationFrame(() => {
      setIsInApp(IN_APP_BROWSER_PATTERN.test(navigator.userAgent));
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <p
      role="note"
      className={cn(
        "rounded-md border bg-muted px-3 py-2 text-xs text-muted-foreground",
        isInApp &&
          "border-amber-500 bg-amber-50 text-amber-900 dark:border-amber-400/60 dark:bg-amber-950/40 dark:text-amber-200",
      )}
    >
      카카오톡 등 인앱 브라우저에서는 Google 로그인이 차단될 수 있습니다.
      Chrome/Safari 등 외부 브라우저로 열어주세요
    </p>
  );
}
