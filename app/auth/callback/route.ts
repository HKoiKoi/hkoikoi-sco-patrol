import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // open redirect 방지: 사이트 내부 상대 경로("/foo")만 허용하고 "//evil.com", "/\evil.com"은 거부
  const nextParam = searchParams.get("next") ?? "/protected";
  const next =
    nextParam.startsWith("/") &&
    !nextParam.startsWith("//") &&
    !nextParam.startsWith("/\\")
      ? nextParam
      : "/protected";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host"); // 로드 밸런서 이전의 원본 host
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }

    return NextResponse.redirect(
      `${origin}/auth/error?error=${encodeURIComponent(error.message)}`,
    );
  }

  return NextResponse.redirect(
    `${origin}/auth/error?error=${encodeURIComponent("No authorization code")}`,
  );
}
