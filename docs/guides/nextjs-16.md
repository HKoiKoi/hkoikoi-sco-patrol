# Next.js 16 개발 지침

이 문서는 이 프로젝트(Next.js 16.4 / React 19.3 / Tailwind CSS 4 / Supabase)에서 따라야 할 Next.js 규칙을 정리합니다.
버전별 동작은 기억에 의존하지 말고 `node_modules/next/dist/docs/`의 번들 문서를 먼저 확인하세요.

## 현재 환경

| 항목             | 버전 / 설정                                             |
| ---------------- | ------------------------------------------------------- |
| Next.js          | 16.4 (App Router 전용, Turbopack 기본)                  |
| React            | 19.3                                                    |
| Node.js          | 20.9 이상 (필수)                                        |
| TypeScript       | 5.1 이상                                                |
| Cache Components | `next.config.ts`에서 `cacheComponents: true`            |
| 요청 가로채기    | `proxy.ts` (`middleware.ts`는 deprecated)               |
| 린트             | ESLint 9 flat config (`eslint .`), `next lint`는 제거됨 |

## 필수 규칙

### 1. App Router만 사용

`app/` 디렉터리만 사용합니다. `pages/`, `getServerSideProps`, `getStaticProps`는 사용하지 않습니다.

### 2. Server Components 우선

모든 컴포넌트는 기본적으로 Server Component입니다. 상태, 이벤트 핸들러, 브라우저 API가 필요한 말단 컴포넌트에만 `'use client'`를 붙입니다.

```tsx
// 서버 컴포넌트: 데이터는 서버에서 가져오고 상호작용만 클라이언트로 분리
export default async function Page() {
  const stats = await getStats();
  return <InteractiveChart data={stats} />;
}
```

```tsx
// components/interactive-chart.tsx
"use client";

import { useState } from "react";

export function InteractiveChart({ data }: { data: Stat[] }) {
  const [range, setRange] = useState("week");
  return <Chart data={data} range={range} />;
}
```

### 3. Request API는 항상 비동기

Next.js 16에서는 동기 접근이 완전히 제거되었습니다. `cookies()`, `headers()`, `draftMode()`, `params`, `searchParams` 모두 `await`가 필요합니다.
타입은 `npx next typegen`이 생성하는 전역 헬퍼(`PageProps`, `LayoutProps`, `RouteContext`)를 사용합니다.

```tsx
// app/blog/[slug]/page.tsx
export default async function Page(props: PageProps<"/blog/[slug]">) {
  const { slug } = await props.params;
  const { q } = await props.searchParams;
  return (
    <h1>
      {slug} / {q}
    </h1>
  );
}
```

`opengraph-image`, `twitter-image`, `icon`, `apple-icon`의 `params`와 `id`, `sitemap`의 `id`도 Promise입니다.

### 4. `middleware` 대신 `proxy`

프로젝트 루트의 `proxy.ts`가 요청 전처리(Supabase 세션 갱신)를 담당합니다. 함수 이름은 `proxy`이며, Node.js 런타임에서 실행됩니다.

```ts
// proxy.ts
import { updateSession } from "@/lib/supabase/proxy";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- 모듈 전역 변수나 공유 모듈 상태에 의존하지 않습니다. 정보 전달은 헤더, 쿠키, rewrite, redirect, URL로 합니다.
- `config.runtime`은 지정하지 않습니다.
- Proxy에서 `revalidateTag` 등 캐시 무효화 API는 호출할 수 없습니다.

## Cache Components

이 프로젝트는 `cacheComponents: true`입니다. 데이터 패칭은 **기본이 동적**이고, 캐시는 `use cache`로 명시적으로 선택합니다. 정적 셸(static shell)이 먼저 응답되고 동적 부분이 스트리밍됩니다.

### 동적 데이터는 Suspense 안에서

`cookies()`, `headers()`, `searchParams`, `params`(미리 생성하지 않은 값), 캐시되지 않은 `fetch`/DB 호출은 요청 시점 데이터입니다. `<Suspense>` 경계 밖에서 접근하면 빌드/개발 중 에러가 납니다.

```tsx
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";

async function LogsData() {
  const supabase = await createClient(); // 내부에서 cookies() 사용
  const { data } = await supabase.from("patrol_logs").select();
  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}

export default function Logs() {
  return (
    <Suspense fallback={<div>Loading logs...</div>}>
      <LogsData />
    </Suspense>
  );
}
```

`app/protected/layout.tsx`의 `<AuthButton />` 래핑이 이 패턴입니다.

### `use cache`로 캐시 선택

```tsx
import { cacheLife, cacheTag } from "next/cache";

async function getPosts() {
  "use cache";
  cacheLife("hours");
  cacheTag("posts");
  return db.posts.findMany();
}
```

- `use cache` 함수는 인자로 받은 값과 클로저가 캐시 키가 됩니다. **함수 안에서 `cookies()`/`headers()`를 직접 읽지 않습니다.** 필요한 값은 인자로 넘기거나, 사용자별 캐시는 `use cache: private`을 검토합니다.
- 사용자별 Supabase 쿼리(RLS 적용)는 캐시하지 않습니다.

### 캐시 무효화

| API                         | 사용처                       | 동작                                                              |
| --------------------------- | ---------------------------- | ----------------------------------------------------------------- |
| `updateTag(tag)`            | Server Action                | 즉시 만료, 같은 요청에서 최신 데이터를 읽음 (read-your-writes)    |
| `revalidateTag(tag, "max")` | Server Action, Route Handler | stale-while-revalidate. **두 번째 인자 필수** (생략은 deprecated) |
| `refresh()`                 | Server Action                | 캐시되지 않은 데이터만 갱신                                       |
| `revalidatePath(path)`      | Server Action, Route Handler | 경로 단위 무효화                                                  |

```ts
"use server";

import { updateTag } from "next/cache";

export async function updateProfile(formData: FormData) {
  await saveProfile(formData);
  updateTag("profile"); // 폼 제출 직후 최신 값을 보여줘야 할 때
}
```

### 더 이상 쓰지 않는 것

Cache Components에서는 아래 설정/API를 쓰지 않습니다.

| 기존                                                      | 대체                                          |
| --------------------------------------------------------- | --------------------------------------------- |
| `export const dynamic = "force-dynamic" / "force-static"` | 기본이 동적. 정적으로 만들 부분은 `use cache` |
| `export const revalidate = 60`                            | `cacheLife`                                   |
| `export const fetchCache`, `dynamicParams`                | 사용 불가                                     |
| `export const runtime = "edge"`                           | 사용 불가 (Node.js 런타임 필수)               |
| `experimental_ppr`, `experimental.ppr`                    | 제거됨 (PPR이 기본 동작)                      |
| `unstable_cache`                                          | `use cache`                                   |
| `unstable_noStore`                                        | 불필요 (기본이 동적)                          |
| `experimental.dynamicIO`, `experimental.useCache`         | `cacheComponents`                             |

> `generateStaticParams`는 최소 1개 이상의 param을 반환해야 합니다.

### 네비게이션 시 상태 보존

Cache Components에서는 라우트를 벗어나도 언마운트되지 않고 React `<Activity>`로 숨김 처리됩니다. 이전 페이지의 폼 입력과 펼침 상태가 유지되며, 숨겨진 동안 Effect는 정리(cleanup)됩니다. Effect에서 구독/타이머를 쓴다면 cleanup을 반드시 작성하세요.

## 권장 사항

### Streaming

느린 영역만 `Suspense`로 감싸고, 빠른 영역은 바로 렌더링합니다.

```tsx
export default function DashboardPage() {
  return (
    <>
      <h1>대시보드</h1>
      <Suspense fallback={<ChartSkeleton />}>
        <SlowChart />
      </Suspense>
    </>
  );
}
```

### `after()`로 비블로킹 작업

응답 후에 실행할 로깅/알림은 `after`를 사용합니다.

```ts
import { after } from "next/server";

export async function POST(request: Request) {
  const result = await process(await request.json());
  after(async () => {
    await sendAnalytics(result);
  });
  return Response.json({ id: result.id });
}
```

### 인증 실패 응답

`unauthorized()` / `forbidden()`은 `next/navigation`에서 import하며 Server Component, Server Action, Route Handler에서 사용할 수 있습니다. `next.config.ts`에 `authInterrupts: true`가 필요하고, 사용 전에 `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/unauthorized.md`를 확인하세요. 현재 프로젝트는 인증이 필요한 경로에서 `redirect("/auth/login")`을 사용합니다.

### Typed Routes

`next.config.ts`에 `typedRoutes: true`(실험 기능 아님, 최상위 옵션)를 설정하면 `<Link href>`가 존재하는 경로만 허용합니다. 현재는 켜져 있지 않으며 켜면 `npx next typegen`으로 타입을 생성합니다.

### 이미지 / 폰트

- `next/image` 기본값 변경: `minimumCacheTTL` 4시간, `imageSizes`에서 16 제거, `qualities` 기본값 변경, 쿼리 스트링이 있는 로컬 이미지는 `images.localPatterns` 설정 필요. 상세는 `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`의 `next/image` 절을 참고하세요.
- 폰트는 `next/font/google`을 사용하며 `app/layout.tsx`의 Geist가 예시입니다.

## 빌드와 설정

- `next dev`, `next build` 모두 Turbopack이 기본입니다. `--turbopack` 플래그를 붙이지 않습니다.
- Turbopack 설정은 최상위 `turbopack` 옵션입니다 (`experimental.turbo`는 제거됨).
- 커스텀 `webpack` 설정이 있으면 `next build`가 실패합니다. 필요하면 `--webpack`으로 명시적으로 선택합니다.
- React Compiler를 쓰려면 `reactCompiler: true`와 `babel-plugin-react-compiler`가 필요합니다. 켜기 전에는 `memo`/`useMemo`/`useCallback`을 필요한 곳에만 사용합니다.

```ts
// next.config.ts (현재)
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
};

export default nextConfig;
```

> `cacheComponents`는 `partialPrefetching`을 명시하지 않으면 경고를 출력합니다. 새 설정을 추가할 때 `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/cacheComponents.md`를 확인하세요.

## 금지 사항

```tsx
// 금지: 상태/이벤트가 없는데 'use client'
"use client";
export default function Title({ title }: { title: string }) {
  return <h1>{title}</h1>;
}

// 금지: 클라이언트 컴포넌트에서 서버 전용 모듈 import
("use client");
import { createClient } from "@/lib/supabase/server"; // 서버 전용
```

- 금지: `middleware.ts` 신규 생성, 동기식 `params`/`cookies()` 접근, `next lint` 사용
- 금지: `use cache` 안에서 요청 시점 API 직접 호출
- 금지: Supabase 서버 클라이언트를 모듈 전역 변수에 저장 (요청마다 `createClient()` 호출)
- 금지: 서버 코드에서 `auth.getSession()` 결과를 신뢰 — `getClaims()`/`getUser()`로 검증

## 점검 명령

`package.json`의 주요 스크립트는 `dev`, `build`, `start`, `lint`, `typecheck`, `format`, `check`입니다.

```bash
npm run lint                 # ESLint (eslint .)
npm run typecheck            # 타입 체크 (tsc --noEmit)
npm run format:check         # Prettier 검사
npm run check                # typecheck + lint + format:check
npx next typegen             # PageProps/LayoutProps/RouteContext 타입 생성
npm run build                # 프로덕션 빌드 (Cache Components 검증 포함)
```
