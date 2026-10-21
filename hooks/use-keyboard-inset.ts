"use client";

// 가상 키보드가 올라오면 iOS Safari와 Android Chrome(기본값)은 레이아웃 뷰포트를 그대로 두고 시각 뷰포트만 줄인다.
// 그래서 fixed bottom-0 요소가 키보드 뒤로 숨는다. 키보드가 가린 높이를 --keyboard-inset(px)에 담아
// 하단 고정 요소가 bottom 값으로 키보드 위에 붙게 한다. 키보드가 없거나 핀치 확대 중이면 0이다.
import { useEffect } from "react";

const CSS_VARIABLE = "--keyboard-inset";

export function useKeyboardInset() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const root = document.documentElement;
    let frame = 0;

    function update() {
      frame = 0;
      if (!viewport) return;
      // 핀치 확대 중에는 시각 뷰포트가 줄어도 키보드 때문이 아니므로 보정하지 않는다.
      const covered =
        viewport.scale > 1.01
          ? 0
          : window.innerHeight - viewport.height - viewport.offsetTop;
      root.style.setProperty(
        CSS_VARIABLE,
        `${Math.max(0, Math.round(covered))}px`,
      );
    }

    function schedule() {
      if (!frame) frame = requestAnimationFrame(update);
    }

    update();
    viewport.addEventListener("resize", schedule);
    viewport.addEventListener("scroll", schedule);
    return () => {
      viewport.removeEventListener("resize", schedule);
      viewport.removeEventListener("scroll", schedule);
      if (frame) cancelAnimationFrame(frame);
      root.style.removeProperty(CSS_VARIABLE);
    };
  }, []);
}
