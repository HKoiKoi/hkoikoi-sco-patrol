"use client";

import { useEffect } from "react";

// 루트 레이아웃을 대체하므로 전역 스타일·Tailwind가 없다. 최소한의 인라인 스타일과 OS 색 구성만 따른다.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, sans-serif",
          colorScheme: "light dark",
        }}
      >
        <main style={{ maxWidth: 640, margin: "0 auto", padding: 16 }}>
          <h1 style={{ fontSize: 24 }}>문제가 발생했습니다</h1>
          <div role="alert">
            <p>앱을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
            <button
              type="button"
              onClick={() => retry()}
              style={{ minHeight: 48, padding: "0 16px", fontSize: 16 }}
            >
              다시 시도
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
