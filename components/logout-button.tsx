"use client";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

// 로그아웃 시 지울 임시 저장 백업 키 접두사
const DRAFT_KEY_PREFIX = "draft:";

export function LogoutButton() {
  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();

    // localStorage 접근이 불가능해도 /logs 이동은 진행한다.
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key?.startsWith(DRAFT_KEY_PREFIX)) keys.push(key);
      }
      keys.forEach((key) => localStorage.removeItem(key));
    } catch {
      // 무시
    }

    // router.refresh가 로그아웃 전 라우트를 다시 요청해 보호 경로의 로그인 리디렉션이
    // 404로 남으므로, 라우터 캐시까지 버리는 전체 이동을 쓴다.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- 의도된 전체 이동
    window.location.assign("/logs");
  };

  return (
    <Button size="sm" variant="outline" onClick={logout}>
      로그아웃
    </Button>
  );
}
