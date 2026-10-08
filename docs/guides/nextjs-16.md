# Next.js 16 개발 지침

이 문서는 Claude Code에서 **Next.js 16 (App Router) + React 19.2** 프로젝트를 개발할 때 따라야 할 핵심 규칙과 가이드라인을 제공합니다.

> 기준: Next.js v16.2.x 공식 문서 (context7로 확인).
> 이 프로젝트 설정: `cacheComponents: true`(`next.config.ts`), `proxy.ts`(Supabase 세션 갱신), `eslint .` 기반 lint.
> 컴포넌트 작성 패턴은 `docs/guides/component-patterns.md`를 함께 참고하세요.

## 📌 Next.js 15 → 16 변경 요약

| 이전                                                                  | Next.js 16                                                                |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `params`/`searchParams`/`cookies()` 동기 접근 허용 (15까지 임시 호환) | **동기 접근 완전 제거** — 항상 `await` (또는 Client에서 `use()`)          |
| `middleware.ts` + `export function middleware`                        | **`proxy.ts` + `export function proxy`** (런타임은 `nodejs` 고정)         |
| `experimental.ppr`, `experimental.dynamicIO`                          | 최상위 **`cacheComponents: true`** + `"use cache"`                        |
| `experimental.turbo`                                                  | 최상위 **`turbopack`** 옵션, Turbopack이 `dev`/`build` **기본 번들러**    |
| `experimental.typedRoutes`                                            | 최상위 **`typedRoutes: true`**                                            |
| `revalidateTag("tag")`                                                | `revalidateTag("tag", "max")` (두 번째 인자 필수, 단일 인자는 deprecated) |
| (없음)                                                                | Server Action 전용 `updateTag()` (read-your-writes)                       |
| `next lint`                                                           | **제거됨** → ESLint CLI 직접 사용 (`eslint .`)                            |
| Parallel Routes `default.tsx` 선택                                    | **모든 slot에 `default.tsx` 명시 필수**                                   |
| `unauthorized()`/`forbidden()` (`next/server`로 오해되기 쉬움)        | `next/navigation`에서 import, `experimental.authInterrupts` 필요          |

## 🚀 필수 규칙 (엄격 준수)

### App Router 아키텍처

```text
// ✅ 올바른 방법: App Router 사용
app/
├── layout.tsx          // 루트 레이아웃
├── page.tsx            // 메인 페이지
├── loading.tsx         // 로딩 UI
├── error.tsx           // 에러 UI ("use client" 필요)
├── not-found.tsx       // 404 페이지
└── dashboard/
    ├── layout.tsx      // 대시보드 레이아웃
    └── page.tsx        // 대시보드 페이지

// ❌ 금지: Pages Router 사용
pages/
├── index.tsx
└── dashboard.tsx
```

### Server Components 우선 설계

```tsx
// 🚀 필수: 기본적으로 모든 컴포넌트는 Server Components
import { Suspense } from "react";

export default function UserDashboard() {
  return (
    <div>
      <h1>대시보드</h1>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}

async function DashboardContent() {
  const user = await getUser(); // 서버에서 데이터 가져오기

  return (
    <>
      <h2>{user.name}님</h2>
      {/* 클라이언트 컴포넌트가 필요한 경우에만 분리 */}
      <InteractiveChart data={user.analytics} />
    </>
  );
}
```

```tsx
// components/interactive-chart.tsx
// ✅ 클라이언트 컴포넌트는 최소한으로, "use client"는 파일 최상단
"use client";

import { useState } from "react";

export function InteractiveChart({ data }: { data: Analytics[] }) {
  const [selectedRange, setSelectedRange] = useState("week");
  // 상호작용 로직만 클라이언트에서 처리
  return <Chart data={data} range={selectedRange} />;
}
```

### 🔄 Async Request APIs (동기 접근 완전 제거)

Next.js 16에서는 `cookies`, `headers`, `draftMode`, `params`, `searchParams`를 **비동기로만** 접근할 수 있습니다.

```tsx
import { cookies, headers } from "next/headers";

// ✅ PageProps<'/route'> 전역 타입 헬퍼로 params/searchParams 타입 자동 추론
export default async function Page(props: PageProps<"/users/[id]">) {
  const { id } = await props.params;
  const query = await props.searchParams;

  const cookieStore = await cookies();
  const headersList = await headers();

  const user = await getUser(id);
  return <UserProfile user={user} />;
}

// ❌ 금지: 동기식 접근 (Next.js 16에서 제거됨)
export default function Page({ params }: { params: { id: string } }) {
  const user = getUser(params.id);
  return <UserProfile user={user} />;
}
```

- 타입 헬퍼: 페이지는 `PageProps<'/route'>`, 레이아웃은 `LayoutProps<'/route'>`, Route Handler는 `RouteContext<'/route'>`.
- Client Component는 `async`가 불가하므로 `use(params)`로 읽습니다.
- 마이그레이션 코드모드: `npx @next/codemod@latest upgrade`.

### Typed Routes 활용

```ts
// next.config.ts — 최상위 옵션 (experimental 아님)
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  typedRoutes: true,
};

export default nextConfig;
```

```tsx
import Link from "next/link";

export function Navigation() {
  return (
    <nav>
      {/* ✅ 타입 안전한 링크: 존재하는 경로만 허용 */}
      <Link href="/dashboard">대시보드</Link>
      <Link href={`/products/${id}`}>제품 상세</Link>

      {/* ❌ 컴파일 에러: 존재하지 않는 경로 */}
      <Link href="/nonexistent-route">잘못된 링크</Link>
    </nav>
  );
}
```

## ✅ 권장 사항 (성능 최적화)

### Cache Components: 정적 셸 + Streaming

`cacheComponents: true`일 때의 규칙입니다 (이 프로젝트 적용됨).

- **캐시되지 않은 동적 데이터**(DB/fetch, `cookies()`, `headers()`, `await params` 등)는 **`<Suspense>` 경계 안**에서 접근해야 합니다. 경계 밖이면 오류가 발생합니다.
- 동기적이고 요청 데이터를 쓰지 않는 부분은 **정적 셸**로 즉시 전송됩니다.
- `export const dynamic`, `revalidate` 같은 기존 route segment config는 사용하지 않습니다.
- `runtime = "edge"`는 Cache Components에서 지원되지 않습니다.

```tsx
import { Suspense } from "react";

export default function DashboardPage() {
  return (
    <div>
      <h1>대시보드</h1> {/* 정적 셸: 즉시 전송 */}
      <QuickStats /> {/* 동기/캐시된 컨텐츠 */}
      {/* ✅ 느린/동적 컨텐츠는 Suspense로 감싸 스트리밍 */}
      <Suspense fallback={<SkeletonChart />}>
        <SlowChart />
      </Suspense>
      <Suspense fallback={<SkeletonTable />}>
        <SlowDataTable />
      </Suspense>
    </div>
  );
}

async function SlowChart() {
  const data = await getComplexAnalytics();
  return <Chart data={data} />;
}
```

### 🔄 캐싱 전략: `"use cache"`

`fetch`의 `next: { revalidate, tags }` 옵션 대신, **`"use cache"` + `cacheLife` + `cacheTag`** 로 캐시 범위와 수명을 선언합니다.

```ts
import { cacheLife, cacheTag } from "next/cache";

export async function getProductData(id: string) {
  "use cache";
  cacheLife("hours"); // 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'max'
  cacheTag(`product-${id}`, "products"); // 태그 기반 무효화

  const res = await fetch(`https://api.example.com/products/${id}`);
  return res.json();
}
```

- `"use cache"` 스코프 안에서는 `cookies()`/`headers()` 같은 요청 데이터를 직접 읽을 수 없습니다. 필요한 값은 **인자로 전달**하세요.
- 인자와 클로저로 참조한 값이 캐시 키가 됩니다.

### 캐시 무효화: `updateTag` vs `revalidateTag`

```ts
"use server";

import { revalidateTag, updateTag } from "next/cache";

// ✅ 사용자가 방금 한 변경을 즉시 보여줘야 할 때 (Server Action 전용)
export async function updateProduct(id: string, data: ProductData) {
  await updateDatabase(id, data);
  updateTag(`product-${id}`); // 캐시 만료 + 즉시 갱신 (read-your-writes)
}

// ✅ 약간의 지연이 허용될 때 (Server Action / Route Handler 모두 가능)
export async function refreshCatalog() {
  revalidateTag("products", "max"); // stale-while-revalidate, 두 번째 인자 필수
}
```

- `updateTag`는 **Server Action에서만** 호출할 수 있습니다. Route Handler에서는 `revalidateTag(tag, "max")`를 사용하세요.
- `revalidateTag`는 Client Component나 Proxy에서 호출할 수 없습니다.
- `revalidateTag("tag")` 단일 인자 형태는 deprecated이며 TypeScript 오류가 납니다.

### 🔄 `after()` API 활용

응답을 먼저 반환하고 부가 작업(로깅, 분석, 알림)을 이후에 처리합니다. Server Component, Server Action, Route Handler에서 사용할 수 있습니다.

```ts
import { after } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();

  // 즉시 응답에 필요한 작업
  const result = await processUserData(body);

  // 🔄 비블로킹 작업은 after()로 처리
  after(async () => {
    await sendAnalytics(result);
    await sendNotification(result.userId);
  });

  return Response.json({ success: true, id: result.id });
}
```

### Turbopack

Turbopack이 `next dev`와 `next build`의 **기본 번들러**입니다. 별도 플래그가 필요 없고, 옵트아웃은 `--webpack` 입니다. 설정이 필요하면 최상위 `turbopack` 옵션을 사용합니다.

```ts
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  turbopack: {
    // ✅ 최상위 옵션 (이전: experimental.turbo)
    // 필요한 경우에만 resolveAlias, rules 등을 추가
  },
};

export default nextConfig;
```

- Sass에서 `~` 접두사 import나 `sassOptions.functions`는 Turbopack에서 지원되지 않습니다.
- 커스텀 webpack 설정이 있으면 Turbopack 빌드가 실패할 수 있으므로 마이그레이션 여부를 먼저 확인하세요.

## ⚠️ Breaking Changes 대응

### React 19 호환성

폼과 Server Action은 React 19 API(`useActionState`, `useFormStatus`)를 사용합니다. 자세한 패턴은 `component-patterns.md`를 참고하세요.

```tsx
// app/users/actions.ts — Server Action은 별도 파일 최상단에 "use server"
"use server";

import { redirect } from "next/navigation";

export async function createUser(formData: FormData) {
  const name = formData.get("name");
  const email = formData.get("email");
  if (typeof name !== "string" || typeof email !== "string") {
    throw new Error("잘못된 입력입니다.");
  }

  await saveUser({ name, email });
  redirect("/users"); // 예외를 던져 종료하므로 return 불필요
}
```

```tsx
// components/submit-button.tsx
"use client";

import { useFormStatus } from "react-dom";

// <form> 안에 렌더링된 자식이어야 pending이 동작합니다
export function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending}>
      {pending ? "제출 중..." : "제출"}
    </button>
  );
}
```

```tsx
// app/users/new/page.tsx (Server Component)
import { createUser } from "../actions";
import { SubmitButton } from "@/components/submit-button";

export default function UserForm() {
  return (
    <form action={createUser}>
      <input name="name" required />
      <input name="email" type="email" required />
      <SubmitButton />
    </form>
  );
}
```

- Server Action은 **공개 HTTP 엔드포인트**와 같습니다. 함수 안에서 항상 인증/인가와 입력 검증을 수행하세요.

### 🔄 `middleware` → `proxy`

`middleware.ts`는 deprecated이며 `proxy.ts`로 이름이 바뀌었습니다. 함수 이름도 `proxy`로 변경합니다.

```ts
// proxy.ts (프로젝트 루트) — 이 프로젝트의 실제 구성
import { updateSession } from "@/lib/supabase/proxy";
import { type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- 런타임은 **`nodejs` 고정**이며 설정할 수 없습니다. Edge Runtime이 필요하면 `middleware.ts`를 유지해야 합니다.
- `config.runtime`을 지정하지 마세요.
- 관련 설정 이름도 변경됩니다: `skipMiddlewareUrlNormalize` → `skipProxyUrlNormalize`.
- Proxy는 낙관적인 검사(세션 갱신, 리다이렉트)용입니다. 데이터 접근 직전의 인가 검증은 Server Component/Action 안에서 다시 수행하세요.

### 🔄 `unauthorized()` / `forbidden()`

`next/navigation`에서 import하고, 호출하면 예외를 던져 `unauthorized.tsx`(401) / `forbidden.tsx`(403)를 렌더링합니다. 실험 기능이므로 활성화가 필요합니다.

```ts
// next.config.ts
const nextConfig: NextConfig = {
  cacheComponents: true,
  experimental: {
    authInterrupts: true,
  },
};
```

```tsx
// app/admin/page.tsx
import { forbidden, unauthorized } from "next/navigation";

export default async function AdminPage() {
  const session = await getSession();

  if (!session) unauthorized(); // 401 → app/unauthorized.tsx
  if (!session.user.isAdmin) forbidden(); // 403 → app/forbidden.tsx

  return <AdminDashboard />;
}
```

```tsx
// app/forbidden.tsx
import Link from "next/link";

export default function Forbidden() {
  return (
    <div>
      <h2>접근 권한이 없습니다</h2>
      <Link href="/">홈으로</Link>
    </div>
  );
}
```

Server Component, Server Action, Route Handler에서 호출할 수 있으며, `return unauthorized()`처럼 반환하지 않고 **그냥 호출**합니다.

## 🔄 라우팅 고급 기능

### Route Groups

```text
// ✅ Route Groups로 레이아웃 분리
app/
├── (marketing)/
│   ├── layout.tsx     // 마케팅 레이아웃
│   ├── page.tsx       // 홈페이지
│   └── about/
│       └── page.tsx   // 소개 페이지
├── (dashboard)/
│   ├── layout.tsx     // 대시보드 레이아웃
│   └── analytics/
│       └── page.tsx   // 분석 페이지
└── (auth)/
    ├── login/
    │   └── page.tsx
    └── register/
        └── page.tsx
```

```tsx
// (marketing)/layout.tsx
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="marketing-layout">
      <MarketingHeader />
      {children}
      <MarketingFooter />
    </div>
  );
}
```

### Parallel Routes

**Next.js 16부터 모든 slot에 `default.tsx`가 필수**입니다. 없으면 빌드가 실패합니다.

```text
app/dashboard/
├── layout.tsx
├── page.tsx
├── default.tsx            // ← children slot용 (필수)
├── @analytics/
│   ├── page.tsx
│   └── default.tsx        // ← 필수
└── @notifications/
    ├── page.tsx
    └── default.tsx        // ← 필수
```

```tsx
// dashboard/@analytics/default.tsx — 이전 동작을 유지하려면
import { notFound } from "next/navigation";

export default function Default() {
  notFound(); // 또는 return null
}
```

```tsx
// dashboard/layout.tsx
import { Suspense } from "react";

export default function DashboardLayout({
  children,
  analytics,
  notifications,
}: {
  children: React.ReactNode;
  analytics: React.ReactNode;
  notifications: React.ReactNode;
}) {
  return (
    <div className="dashboard-grid">
      <main>{children}</main>
      <aside className="analytics-panel">
        <Suspense fallback={<AnalyticsSkeleton />}>{analytics}</Suspense>
      </aside>
      <div className="notifications-panel">
        <Suspense fallback={<NotificationsSkeleton />}>
          {notifications}
        </Suspense>
      </div>
    </div>
  );
}
```

`default.tsx`에서 동적 params를 읽을 때도 `params`는 Promise입니다 (`await params`).

### Intercepting Routes

```text
// ✅ Intercepting Routes로 모달 구현
app/
├── layout.tsx              // children + modal slot 렌더링
├── gallery/
│   ├── page.tsx
│   └── [id]/
│       └── page.tsx        // 전체 페이지 보기
└── @modal/
    ├── default.tsx         // ← 필수 (return null)
    └── (.)gallery/
        └── [id]/
            └── page.tsx    // 모달 보기
```

```tsx
// @modal/(.)gallery/[id]/page.tsx
import Image from "next/image";
import { Modal } from "@/components/modal";

export default async function PhotoModal(props: PageProps<"/gallery/[id]">) {
  const { id } = await props.params;
  const photo = await getPhoto(id);

  return (
    <Modal>
      <Image src={photo.url} alt={photo.title} width={800} height={600} />
    </Modal>
  );
}
```

## ❌ 금지 사항

### Pages Router 사용 금지

```text
// ❌ 절대 금지: Pages Router 패턴
pages/
├── _app.tsx
├── _document.tsx
├── index.tsx
└── api/
    └── users.ts
```

```ts
// ❌ 금지: getServerSideProps, getStaticProps 사용
export async function getServerSideProps() {
  // 이 방식은 사용하지 마세요
}
```

### 안티패턴 방지

```tsx
// ❌ 금지: 불필요한 'use client' 사용
"use client";

export default function SimpleComponent({ title }: { title: string }) {
  // 상태나 이벤트 핸들러가 없는데 'use client' 사용
  return <h1>{title}</h1>;
}

// ✅ 올바른 방법: Server Component로 유지
export default function SimpleComponent({ title }: { title: string }) {
  return <h1>{title}</h1>;
}
```

```tsx
// ❌ 금지: Client Component에서 서버 전용 모듈 import
"use client";

import { getUser } from "@/lib/database"; // 서버 전용 함수

export function UserProfile() {
  const user = getUser(); // 에러 발생
  return <div>{user.name}</div>;
}

// ✅ 올바른 방법: 서버에서 데이터를 가져와 props로 전달
export default async function UserPage() {
  const user = await getUser();
  return <UserProfile user={user} />;
}

function UserProfile({ user }: { user: User }) {
  return <div>{user.name}</div>;
}
```

```ts
// ❌ 금지 (Next.js 16): 제거/deprecated된 방식
const { id } = props.params; // 동기 접근
export function middleware() {} // → proxy
revalidateTag("posts"); // → revalidateTag("posts", "max") 또는 updateTag
export const dynamic = "force-dynamic"; // Cache Components와 함께 사용 금지
export const config = { runtime: "edge" }; // proxy / Cache Components 미지원
```

## 코드 품질 체크리스트

이 프로젝트의 `package.json`에 정의된 스크립트는 `dev`, `build`, `start`, `lint` 입니다. (`next lint`는 제거되어 `lint`는 `eslint .`를 실행합니다.) 개발 완료 후 다음을 실행하세요:

```bash
# 🚀 필수: 타입 체크 (typecheck 스크립트가 없으므로 tsc 직접 실행)
npx tsc --noEmit

# 🚀 필수: 린트 검사
npm run lint

# 🚀 필수: 빌드 테스트 (Turbopack, Cache Components 위반도 여기서 검출됨)
npm run build
```

> `typecheck`, `format:check`, `check-all` 같은 스크립트가 필요하면 `package.json`에 먼저 추가하세요.

이 지침을 따라 Next.js 16의 기능을 활용하여 현대적이고 성능 최적화된 애플리케이션을 개발하세요.
