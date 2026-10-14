"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { NOTICE_MESSAGES } from "@/lib/auth/notice";
import { canWrite, isPending } from "@/lib/permissions";
import type { Viewer } from "@/lib/types/auth";

const PATROL_PATH = "/protected/patrol";

interface WritePatrolButtonProps {
  viewer: Viewer;
}

// [새 순찰 일지 작성] 버튼: 비로그인은 로그인 안내 후 이동, 승인 대기는 안내만, 작성 권한자는 Link로 순찰 기록 화면 이동
export function WritePatrolButton({ viewer }: WritePatrolButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (isPending(viewer)) {
      // 승인 대기: 이동 없이 안내만 표시
      toast.info(NOTICE_MESSAGES.pending);
      return;
    }
    // 비로그인: 안내 후 로그인 화면으로 이동 (로그인 후 순찰 기록으로 복귀)
    toast.info(NOTICE_MESSAGES["login-required"]);
    router.push(`/auth/login?next=${encodeURIComponent(PATROL_PATH)}`);
  };

  // 작성 권한자: 클라이언트 핸들러 없이 순찰 기록 화면으로 가는 링크
  if (canWrite(viewer)) {
    return (
      <Button asChild className="min-h-12">
        <Link href={PATROL_PATH}>
          <Plus aria-hidden="true" />새 순찰 일지 작성
        </Link>
      </Button>
    );
  }

  return (
    <Button type="button" className="min-h-12" onClick={handleClick}>
      <Plus aria-hidden="true" />새 순찰 일지 작성
    </Button>
  );
}
