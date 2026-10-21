"use client";

import { Button } from "@/components/ui/button";
import { clearAllDraftBackups } from "@/lib/draft-backup";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();

    // localStorage 접근이 불가능해도 /logs 이동은 진행한다(함수 내부에서 무시).
    clearAllDraftBackups();

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
