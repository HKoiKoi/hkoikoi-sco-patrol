"use client";

// 어댑터 주입 지점. 함수가 든 어댑터는 서버 컴포넌트에서 props로 넘길 수 없어 클라이언트 경계에서 주입한다.
// Task 020에서 이 파일의 import만 Supabase RPC 어댑터로 교체한다.
import { fakePatrolAdapter } from "@/lib/dummy/patrol-draft-adapter";
import type { Viewer } from "@/lib/types/auth";
import type { QuickTag } from "@/lib/types/patrol";

import { PatrolForm } from "./patrol-form";

interface PatrolFormHostProps {
  viewer: Viewer;
  quickTags: QuickTag[];
}

export function PatrolFormHost({ viewer, quickTags }: PatrolFormHostProps) {
  return (
    <PatrolForm
      viewer={viewer}
      adapter={fakePatrolAdapter}
      quickTags={quickTags}
    />
  );
}
