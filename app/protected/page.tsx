import { redirect } from "next/navigation";

// 렌더링 없이 리디렉션만 하는 페이지라 instant 검증 대상에서 제외한다.
export const instant = false;

export default function ProtectedPage() {
  redirect("/logs");
}
