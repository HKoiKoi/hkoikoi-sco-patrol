"use client";

// 어댑터 주입 지점. 함수가 든 어댑터는 서버 컴포넌트에서 props로 넘길 수 없어 클라이언트 경계에서 만든다.
import { useState } from "react";

import { createPatrolDraftAdapter } from "@/lib/patrol-draft-rpc";
import type { AuthenticatedViewer } from "@/lib/types/auth";
import type { PatrolDraft, QuickTag } from "@/lib/types/patrol";

import { PatrolForm } from "./patrol-form";

interface PatrolFormHostProps {
  viewer: AuthenticatedViewer;
  quickTags: QuickTag[];
  /** 서버에서 조회한 본인 초안 (행이 없으면 revision 0의 빈 초안) */
  initialDraft: PatrolDraft;
}

export function PatrolFormHost({
  viewer,
  quickTags,
  initialDraft,
}: PatrolFormHostProps) {
  const [adapter] = useState(createPatrolDraftAdapter);

  return (
    <PatrolForm
      viewer={viewer}
      adapter={adapter}
      quickTags={quickTags}
      initialDraft={initialDraft}
    />
  );
}
