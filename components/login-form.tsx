"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { getSafeNextPath } from "@/lib/auth/safe-next";
import { Button } from "@/components/ui/button";
import { GoogleLoginButton } from "@/components/google-login-button";
import { InAppBrowserNotice } from "@/components/in-app-browser-notice";
import {
  AuthErrorMessage,
  getAuthErrorMessage,
} from "@/components/auth-error-message";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useState } from "react";

export function LoginForm({
  className,
  next = "/logs",
  ...props
}: React.ComponentPropsWithoutRef<"div"> & { next?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      // 로그아웃 상태에서 프리페치한 보호 경로의 로그인 리디렉션이 클라이언트 라우터 캐시에
      // 남아 있어 router.push는 로그인 화면으로 되돌아간다. 전체 이동으로 캐시를 버린다.
      // 클라이언트에서도 한 번 더 검증해 사이트 내부 경로로만 복귀한다.
      window.location.assign(getSafeNextPath(next));
    } catch (error: unknown) {
      setError(getAuthErrorMessage(error));
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">로그인</CardTitle>
          <CardDescription>
            이메일과 비밀번호를 입력해 로그인하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">비밀번호</Label>
                  <Link
                    href="/auth/forgot-password"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    비밀번호를 잊으셨나요?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <AuthErrorMessage message={error} />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "로그인 중..." : "로그인"}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              계정이 없으신가요?{" "}
              <Link
                href="/auth/sign-up"
                className="underline underline-offset-4"
              >
                회원가입
              </Link>
            </div>
          </form>
          <div className="relative my-6 text-center text-sm">
            <div className="absolute inset-0 top-1/2 border-t" />
            <span className="relative bg-card px-2 text-muted-foreground">
              또는
            </span>
          </div>
          <div className="flex flex-col gap-3">
            <InAppBrowserNotice />
            <GoogleLoginButton label="Google로 계속하기" next={next} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
