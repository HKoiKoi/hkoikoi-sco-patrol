"use client";

// 하단 고정 액션바의 실제 높이(안전 영역 포함)를 --action-bar-height(px)에 담는다.
// 바는 fixed라 문서 흐름 밖이므로, 맨 아래에 있는 공통 푸터가 이 값만큼 아래 여백을 둬서 바에 가려지지 않게 한다.
// 바가 사라지면(언마운트) 변수를 지워 다른 페이지의 푸터는 그대로 둔다.
import { useEffect, useRef } from "react";

const CSS_VARIABLE = "--action-bar-height";

export function useActionBarHeight<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const root = document.documentElement;
    const observer = new ResizeObserver(() => {
      root.style.setProperty(CSS_VARIABLE, `${element.offsetHeight}px`);
    });
    observer.observe(element);
    root.style.setProperty(CSS_VARIABLE, `${element.offsetHeight}px`);

    return () => {
      observer.disconnect();
      root.style.removeProperty(CSS_VARIABLE);
    };
  }, []);

  return ref;
}
