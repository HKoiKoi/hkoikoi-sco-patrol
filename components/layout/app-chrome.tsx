import { Suspense } from "react";

import { AppHeader } from "@/components/layout/app-header";
import { PendingBanner } from "@/components/layout/pending-banner";
import { getViewer } from "@/lib/auth/dal";

async function ViewerBanner() {
  return <PendingBanner viewer={await getViewer()} />;
}

// 헤더 뼈대는 정적 셸로 먼저 보내고, 쿠키를 읽는 getViewer()는 조각별 Suspense 안에서만 호출한다.
export function AppChrome() {
  return (
    <>
      <AppHeader />
      <Suspense fallback={null}>
        <ViewerBanner />
      </Suspense>
    </>
  );
}
