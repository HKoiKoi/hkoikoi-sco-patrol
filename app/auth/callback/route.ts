import { getSafeNextPath } from "@/lib/auth/safe-next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  // open redirect 방지: 사이트 내부 경로만 허용
  const next = getSafeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // 홈 서버에서는 Next.js가 127.0.0.1:3001로 요청을 받으므로 request.url의 origin을
      // 리디렉션에 쓰면 localhost:3001로 간다. 상대 경로로 보내 브라우저가 공개 호스트 기준으로 이동하게 한다.
      redirect(next);
    }

    redirect(`/auth/error?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/auth/error?error=${encodeURIComponent("인증 코드가 없습니다.")}`);
}
