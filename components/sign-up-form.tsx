"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  AuthErrorMessage,
  getAuthErrorMessage,
} from "@/components/auth-error-message";
import { GoogleLoginButton } from "@/components/google-login-button";
import { InAppBrowserNotice } from "@/components/in-app-browser-notice";
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
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [repeatPasswordError, setRepeatPasswordError] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    // 브라우저 기본 검증 대신 한국어 문구로 직접 검증한다
    const nextNameError = name.trim() ? null : "이름을 입력해 주세요";
    const nextEmailError = email.trim() ? null : "이메일을 입력해 주세요";
    const nextPasswordError = password ? null : "비밀번호를 입력해 주세요";
    const nextRepeatPasswordError = !repeatPassword
      ? "비밀번호 확인을 입력해 주세요"
      : password && password !== repeatPassword
        ? "비밀번호가 일치하지 않습니다"
        : null;
    setNameError(nextNameError);
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    setRepeatPasswordError(nextRepeatPasswordError);
    if (
      nextNameError ||
      nextEmailError ||
      nextPasswordError ||
      nextRepeatPasswordError
    ) {
      return;
    }

    const supabase = createClient();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // handle_new_user 트리거가 full_name만 읽고 role은 항상 pending으로 만든다
          data: { full_name: name.trim() },
          emailRedirectTo: `${window.location.origin}/auth/confirm?next=/logs`,
        },
      });
      if (error) throw error;
      router.push("/auth/sign-up-success");
    } catch (error: unknown) {
      setError(getAuthErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">회원가입</CardTitle>
          <CardDescription>새 계정을 만듭니다</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} noValidate>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="full-name">이름</Label>
                <Input
                  id="full-name"
                  type="text"
                  autoComplete="name"
                  placeholder="홍길동"
                  value={name}
                  aria-invalid={nameError ? true : undefined}
                  aria-describedby={nameError ? "full-name-error" : undefined}
                  onChange={(e) => {
                    setName(e.target.value);
                    setNameError(null);
                  }}
                />
                {nameError && (
                  <p
                    id="full-name-error"
                    role="alert"
                    className="text-sm text-destructive"
                  >
                    {nameError}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="m@example.com"
                  value={email}
                  aria-invalid={emailError ? true : undefined}
                  aria-describedby={emailError ? "email-error" : undefined}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError(null);
                  }}
                />
                {emailError && (
                  <p
                    id="email-error"
                    role="alert"
                    className="text-sm text-destructive"
                  >
                    {emailError}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">비밀번호</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  aria-invalid={passwordError ? true : undefined}
                  aria-describedby={
                    passwordError ? "password-error" : undefined
                  }
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError(null);
                  }}
                />
                {passwordError && (
                  <p
                    id="password-error"
                    role="alert"
                    className="text-sm text-destructive"
                  >
                    {passwordError}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="repeat-password">비밀번호 확인</Label>
                </div>
                <Input
                  id="repeat-password"
                  type="password"
                  autoComplete="new-password"
                  value={repeatPassword}
                  aria-invalid={repeatPasswordError ? true : undefined}
                  aria-describedby={
                    repeatPasswordError ? "repeat-password-error" : undefined
                  }
                  onChange={(e) => {
                    setRepeatPassword(e.target.value);
                    setRepeatPasswordError(null);
                  }}
                />
                {repeatPasswordError && (
                  <p
                    id="repeat-password-error"
                    role="alert"
                    className="text-sm text-destructive"
                  >
                    {repeatPasswordError}
                  </p>
                )}
              </div>
              <AuthErrorMessage message={error} />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "가입 중..." : "회원가입"}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              이미 계정이 있으신가요?{" "}
              <Link href="/auth/login" className="underline underline-offset-4">
                로그인
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
            <GoogleLoginButton label="Google로 가입하기" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
