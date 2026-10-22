import { getSafeNextPath } from "@/lib/auth/safe-next";
import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // open redirect 방지: 사이트 내부 경로만 허용
  const next = getSafeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // x-forwarded-host는 클라이언트가 조작할 수 있어 리디렉션 대상에 쓰지 않는다.
      // Vercel 같은 프록시 뒤에서도 request.url의 origin이 공개 호스트로 해석된다.
      return NextResponse.redirect(`${origin}${next}`);
    }

    return NextResponse.redirect(
      `${origin}/auth/error?error=${encodeURIComponent(error.message)}`,
    );
  }

  return NextResponse.redirect(
    `${origin}/auth/error?error=${encodeURIComponent("인증 코드가 없습니다.")}`,
  );
}
