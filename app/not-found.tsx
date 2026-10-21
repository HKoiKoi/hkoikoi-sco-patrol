import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-4 p-4 sm:p-5">
      <h1 className="text-2xl font-bold">페이지를 찾을 수 없습니다</h1>
      <div className="space-y-3 rounded-lg border p-4">
        <p className="text-sm text-muted-foreground">
          주소가 잘못되었거나 이동된 페이지입니다.
        </p>
        <Button asChild className="h-12">
          <Link href="/logs">순찰 일지로 돌아가기</Link>
        </Button>
      </div>
    </main>
  );
}
