import { AppHeader } from "@/components/layout/app-header";
import { PendingBanner } from "@/components/layout/pending-banner";
import { getViewer } from "@/lib/auth/dal";

// 쿠키를 읽는 getViewer()를 한 곳에서 await 해 헤더와 배너에 같은 viewer를 주입한다.
// Cache Components 규칙상 반드시 호출하는 쪽에서 <Suspense>로 감싼다.
export async function AppChrome() {
  const viewer = await getViewer();

  return (
    <>
      <AppHeader viewer={viewer} />
      <PendingBanner viewer={viewer} />
    </>
  );
}
