import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getSafeNextPath } from "@/lib/auth/safe-next";

type LoginSearchParams = Promise<{ next?: string | string[] }>;

// searchParams는 요청 시점 데이터이므로 Suspense 경계 안에서 읽는다
async function LoginContent({
  searchParams,
}: {
  searchParams: LoginSearchParams;
}) {
  const { next } = await searchParams;

  // 배열 등 문자열이 아닌 값은 getSafeNextPath가 기본 경로로 대체한다
  return <LoginForm next={getSafeNextPath(next)} />;
}

function LoginFallback() {
  return (
    <Card aria-busy="true">
      <CardHeader className="gap-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-4 w-56" />
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </CardContent>
    </Card>
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: LoginSearchParams;
}) {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Suspense fallback={<LoginFallback />}>
          <LoginContent searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
