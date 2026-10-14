"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

// 로그아웃 시 지울 임시 저장 백업 키 접두사
const DRAFT_KEY_PREFIX = "draft:";

export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    // localStorage 접근이 불가능해도 로그아웃은 진행한다.
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

    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/logs");
    router.refresh();
  };

  return (
    <Button size="sm" variant="outline" onClick={logout}>
      로그아웃
    </Button>
  );
}
