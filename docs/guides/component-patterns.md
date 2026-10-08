# 컴포넌트 패턴 가이드

이 문서는 **Next.js 16 (App Router) + React 19.2** 환경에서 효율적이고 재사용 가능한 컴포넌트를 작성하기 위한 패턴을 정리합니다.

> 기준: Next.js v16.2.x / React v19.2.x 공식 문서 (context7로 확인).
> 이 프로젝트는 `next.config.ts`에서 `cacheComponents: true`를 사용합니다. 아래 "Cache Components" 절을 반드시 확인하세요.

## 📌 React 19 / Next.js 16 핵심 변경 요약

| 이전 방식                                    | 현재 방식                                                       |
| -------------------------------------------- | --------------------------------------------------------------- |
| `forwardRef((props, ref) => ...)`            | `ref`를 일반 prop으로 받기 (`forwardRef`는 deprecated 방향)     |
| `<Context.Provider value={...}>`             | `<Context value={...}>`                                         |
| `useContext(Ctx)`                            | `use(Ctx)` (조건부 호출 가능)                                   |
| `useEffect` + `useState`로 데이터 패칭       | Server Component에서 `await`, 또는 Promise를 넘기고 `use()`로 읽기 |
| `params: { id: string }` (동기)              | `params: Promise<{ id: string }>` → `await params`              |
| 수동 `memo` / `useMemo` / `useCallback`      | React Compiler 사용 시 자동 메모이제이션 (측정 후 필요할 때만 수동) |
| `React.FC`, `PropsWithChildren`              | 일반 함수 + props 인터페이스 (`ComponentProps<"tag">` 활용)     |
| `middleware.ts`                              | `proxy.ts` (Next 16에서 이름 변경, 이 프로젝트 적용됨)          |
| `useFormState` (react-dom)                   | `useActionState` (react)                                        |

## 🧩 기본 설계 원칙

### 1. 단일 책임 원칙 (Single Responsibility)

```tsx
// ✅ 각 컴포넌트가 하나의 명확한 책임
interface UserAvatarProps {
  user: { name: string; avatar?: string };
  size?: keyof typeof avatarSizes;
}

export function UserAvatar({ user, size = "md" }: UserAvatarProps) {
  return (
    <Avatar className={avatarSizes[size]}>
      <AvatarImage src={user.avatar} alt={user.name} />
      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
    </Avatar>
  );
}

export function UserStatus({ isOnline }: { isOnline: boolean }) {
  return (
    <div
      role="status"
      aria-label={isOnline ? "온라인" : "오프라인"}
      className={cn(
        "h-3 w-3 rounded-full",
        isOnline ? "bg-green-500" : "bg-gray-400",
      )}
    />
  );
}

// ❌ 여러 책임이 섞인 컴포넌트
export function UserCard({ user }: { user: User }) {
  // 아바타 + 상태 + 프로필 + 액션 버튼 + 통계... (너무 많은 책임)
}
```

### 2. 컴포지션 우선 (Composition over Inheritance)

```tsx
// ✅ 컴포지션 패턴: 기본 HTML 속성은 ComponentProps로 그대로 받는다
import type { ComponentProps } from "react";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-lg border bg-card p-6", className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 pb-6", className)}
      {...props}
    />
  );
}

// 사용법
<Card>
  <CardHeader>
    <CardTitle>제목</CardTitle>
    <CardDescription>설명</CardDescription>
  </CardHeader>
  <CardContent>내용</CardContent>
</Card>;

// ❌ 상속 패턴 (React에는 부적합)
class BaseCard extends Component {}
class UserCard extends BaseCard {}
```

## 🔄 Server vs Client Components

### 기본 원칙

- **모든 컴포넌트는 기본적으로 Server Component** 입니다. 상호작용(상태, 이벤트, 브라우저 API)이 필요할 때만 `"use client"`를 추가합니다.
- `"use client"`는 **파일 최상단(import보다 위)** 에 선언하며, 그 파일이 import하는 모든 모듈이 클라이언트 번들에 포함됩니다. 가능한 한 **리프(leaf) 컴포넌트**에 적용해 번들 크기를 줄입니다.
- Server → Client로 넘기는 props는 **직렬화 가능**해야 합니다 (함수, 클래스 인스턴스 불가. Server Action은 예외).

### Server Components

```tsx
// ✅ Server Component: 데이터 패칭, SEO, 서버 전용 코드
import { Suspense } from "react";

export default function UserListPage() {
  return (
    <div>
      <h1>사용자 목록</h1>
      {/* 비동기 컴포넌트는 Suspense로 감싸 스트리밍 */}
      <Suspense fallback={<UserListSkeleton />}>
        <UserList />
      </Suspense>
    </div>
  );
}

async function UserList() {
  const users = await getUsers(); // 서버에서 직접 패칭

  return (
    <div className="grid gap-4">
      {users.map((user) => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  );
}
```

### 동적 라우트: `params` / `searchParams`는 Promise

```tsx
// ✅ Server Component (page/layout): async + await
// PageProps<'/route'>는 전역 타입 헬퍼 (next typegen / next dev·build 시 생성)
export default async function ProductPage(props: PageProps<"/products/[id]">) {
  const { id } = await props.params;
  const { tab } = await props.searchParams;

  return <ProductDetail id={id} tab={tab} />;
}

// generateMetadata도 params는 Promise
export async function generateMetadata(props: PageProps<"/products/[id]">) {
  const { id } = await props.params;
  const product = await getProduct(id);
  return { title: product.name };
}
```

```tsx
// ✅ Client Component는 async 불가 → React의 use()로 읽기
"use client";

import { use } from "react";

export default function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  return <h1>{slug}</h1>;
}
```

### Client Components

```tsx
"use client";

import { useState } from "react";

// ✅ 상호작용이 필요한 최소 단위만 Client Component로
export function UserSearchInput({ onSearch }: { onSearch: (q: string) => void }) {
  const [query, setQuery] = useState("");

  return (
    <input
      value={query}
      onChange={(e) => {
        setQuery(e.target.value);
        onSearch(e.target.value);
      }}
      placeholder="사용자 검색..."
    />
  );
}
```

### Server Action + `useActionState` (폼 처리)

```tsx
// app/users/actions.ts
"use server";

export async function updateUserAction(
  _prev: { success: boolean; message: string },
  formData: FormData,
) {
  const name = formData.get("name");
  if (typeof name !== "string" || !name.trim()) {
    return { success: false, message: "이름을 입력해주세요." };
  }
  await updateUser({ name });
  return { success: true, message: "저장되었습니다." };
}
```

```tsx
// components/user-form.tsx
"use client";

import { useActionState } from "react";
import { updateUserAction } from "@/app/users/actions";

export function UserForm() {
  const [state, formAction, isPending] = useActionState(updateUserAction, {
    success: false,
    message: "",
  });

  return (
    <form action={formAction}>
      <input name="name" required />
      <button type="submit" disabled={isPending}>
        {isPending ? "저장 중..." : "저장"}
      </button>
      {state.message && <p aria-live="polite">{state.message}</p>}
    </form>
  );
}
```

> React Hook Form 기반 폼은 `docs/guides/forms-react-hook-form.md`를 참고하세요.

### `useFormStatus` — 폼 내부 자식에서 pending 읽기

```tsx
"use client";

import { useFormStatus } from "react-dom";

// <form> 안에 렌더링된 자식이어야 동작합니다 (같은 컴포넌트에서 form을 렌더링하면 X)
export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? "처리 중..." : children}
    </button>
  );
}
```

### `useOptimistic` — 낙관적 UI

```tsx
"use client";

import { useOptimistic, startTransition } from "react";

export function LikeButton({
  liked,
  toggleLike,
}: {
  liked: boolean;
  toggleLike: () => Promise<void>; // Server Action
}) {
  const [optimisticLiked, setOptimisticLiked] = useOptimistic(liked);

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          setOptimisticLiked(!optimisticLiked); // 즉시 반영
          await toggleLike(); // 완료/실패 시 서버 상태로 동기화
        })
      }
    >
      {optimisticLiked ? "♥" : "♡"}
    </button>
  );
}
```

### Server-Client 경계 설정

```tsx
// ✅ 서버에서 데이터를 가져오고, 상호작용 부분만 클라이언트로 분리
export default async function ProductPage(props: PageProps<"/products/[id]">) {
  const { id } = await props.params;
  const product = await getProduct(id);

  return (
    <div>
      {/* Server Component 영역 */}
      <ProductInfo product={product} />
      <ProductImages images={product.images} />

      {/* Client Component 영역 */}
      <ProductInteractions productId={product.id} />
    </div>
  );
}
```

```tsx
// components/product-interactions.tsx (별도 파일)
"use client";

import { useState } from "react";

export function ProductInteractions({ productId }: { productId: string }) {
  const [liked, setLiked] = useState(false);
  // 상호작용 로직...
}
```

### Server Component를 Client Component의 `children`으로 전달

Client Component 안에서 Server Component를 직접 import하면 클라이언트 번들에 포함됩니다. 대신 **`children`(또는 다른 props)으로 주입**하면 서버에서 렌더링된 결과가 전달됩니다.

```tsx
// components/modal.tsx
"use client";

export function Modal({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  // ...
  return open ? <div role="dialog">{children}</div> : null;
}
```

```tsx
// app/page.tsx (Server Component)
import { Modal } from "@/components/modal";
import { Cart } from "@/components/cart"; // 서버에서 데이터 패칭하는 Server Component

export default function Page() {
  return (
    <Modal>
      <Cart />
    </Modal>
  );
}
```

### Server → Client 데이터 스트리밍: Promise + `use()`

```tsx
// app/profile/page.tsx (Server Component) — await 하지 않고 Promise를 그대로 전달
import { Suspense } from "react";
import { Profile } from "./profile";

export default function Page() {
  const userPromise = getUser(); // await 하지 않음

  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <Profile userPromise={userPromise} />
    </Suspense>
  );
}
```

```tsx
// app/profile/profile.tsx
"use client";

import { use } from "react";

export function Profile({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise); // resolve될 때까지 가장 가까운 Suspense fallback 표시
  return <p>환영합니다, {user.name}</p>;
}
```

### Cache Components (`cacheComponents: true`)

이 프로젝트는 Cache Components가 활성화되어 있습니다.

- **캐시되지 않은 동적 데이터**(DB/fetch, `cookies()`, `headers()`, `await params` 등 요청 시점 데이터)는 **`<Suspense>` 경계 안**에서 접근해야 합니다. 경계 밖에서 접근하면 빌드/개발 중 오류가 발생합니다.
- 캐시하고 싶은 컴포넌트/함수에는 `"use cache"` + `cacheLife()`를 사용합니다.
- `"use cache"` 스코프 안에서는 `cookies()`/`headers()` 같은 요청 데이터를 직접 읽을 수 없습니다. 필요한 값은 **인자(props)로 전달**하세요.
- 기존 route segment config(`export const dynamic = ...`, `revalidate` 등)는 Cache Components와 함께 쓰지 않습니다.

```tsx
import { cacheLife } from "next/cache";

// ✅ 컴포넌트 단위 캐싱
export async function PostList() {
  "use cache";
  cacheLife("hours"); // 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'max'

  const posts = await getPosts();
  return (
    <ul>
      {posts.map((p) => (
        <li key={p.id}>{p.title}</li>
      ))}
    </ul>
  );
}
```

```tsx
// ✅ 정적 셸은 즉시, 동적 부분은 스트리밍
export default function Page() {
  return (
    <>
      <h1>대시보드</h1> {/* 정적: 즉시 전송 */}
      <PostList /> {/* 캐시됨 */}
      <Suspense fallback={<Skeleton />}>
        <MyOrders /> {/* 요청별 동적 데이터 */}
      </Suspense>
    </>
  );
}
```

## 🎯 Props 설계 패턴

### 1. Props Interface 정의 + `ref`는 일반 prop

React 19에서는 함수 컴포넌트가 `ref`를 **일반 prop으로 직접** 받습니다. 새 코드에서 `forwardRef`를 쓰지 않습니다.

```tsx
import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva("inline-flex items-center justify-center ...", {
  variants: {
    variant: {
      default: "bg-primary text-primary-foreground",
      destructive: "bg-destructive text-destructive-foreground",
      outline: "border bg-background",
      secondary: "bg-secondary text-secondary-foreground",
      ghost: "hover:bg-accent",
      link: "underline-offset-4 hover:underline",
    },
    size: {
      default: "h-10 px-4",
      sm: "h-9 px-3",
      lg: "h-11 px-8",
      icon: "h-10 w-10",
    },
  },
  defaultVariants: { variant: "default", size: "default" },
});

// ✅ 네이티브 button 속성 + ref까지 한 번에 상속
interface ButtonProps
  extends ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export function Button({
  variant,
  size,
  loading = false,
  disabled,
  className,
  children,
  ref, // ← forwardRef 불필요
  ...props
}: ButtonProps) {
  return (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner className="mr-2" /> : null}
      {children}
    </button>
  );
}
```

```tsx
// ❌ 이전 방식
const Button = forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => ...);
```

### 2. Polymorphic Components

두 가지 방법이 있으며, 이 프로젝트(shadcn/ui + `radix-ui` 통합 패키지)에서는 **`asChild` + `Slot`** 을 우선 사용합니다.

```tsx
// ✅ 방법 1: asChild (Radix Slot) — shadcn/ui 표준
import { Slot } from "radix-ui"; // 통합 패키지: Slot.Root 로 사용

interface ButtonProps extends ComponentProps<"button"> {
  asChild?: boolean;
}

export function Button({ asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp {...props} />;
}

// 사용법: 스타일은 Button, 렌더링 요소는 Link
<Button asChild>
  <Link href="/dashboard">대시보드</Link>
</Button>;
```

```tsx
// ✅ 방법 2: as prop (타입 안전한 다형성)
type TextProps<T extends React.ElementType> = {
  as?: T;
  variant?: "body" | "caption" | "subtitle";
} & Omit<React.ComponentPropsWithRef<T>, "as" | "variant">;

export function Text<T extends React.ElementType = "p">({
  as,
  variant = "body",
  className,
  ...props
}: TextProps<T>) {
  const Component: React.ElementType = as ?? "p";
  return (
    <Component className={cn(textVariants[variant], className)} {...props} />
  );
}

// 사용법
<Text>기본 단락</Text>;
<Text as="h1" variant="subtitle">제목</Text>;
<Text as="a" href="/about">링크</Text>; // href 자동 타입 추론
```

### 3. 데이터 로딩 — Render Props 대신 서버 패칭

과거의 `DataFetcher` render-props + `useEffect` 패턴은 **클라이언트 워터폴, 로딩/에러 상태 수동 관리** 문제가 있어 권장하지 않습니다.

```tsx
// ❌ 지양: useEffect 기반 클라이언트 패칭 + render props
export function DataFetcher<T>({ url, children }) {
  const [data, setData] = useState<T | null>(null);
  useEffect(() => { fetch(url).then(...) }, [url]);
  return children(data, loading, error);
}
```

```tsx
// ✅ 권장: Server Component에서 패칭 + Suspense(로딩) + error.tsx(에러)
export default function UsersPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <UserList />
    </Suspense>
  );
}

async function UserList() {
  const users = await getUsers();
  return <UserListView users={users} />;
}
// 에러는 같은 segment의 error.tsx ("use client")가 처리
```

클라이언트에서 반드시 패칭해야 하는 경우(실시간 갱신, 사용자 상호작용 기반 등)에는 직접 `useEffect`를 쓰기보다 SWR/TanStack Query 같은 검증된 라이브러리를 사용하세요.

Render props 패턴 자체는 "렌더링 방식을 호출자가 결정"해야 하는 UI 라이브러리성 컴포넌트(예: 가상화 리스트의 `renderItem`)에서는 여전히 유효합니다.

## 🔄 재사용성 패턴

### 1. 컴포넌트 변형 (Variants)

```tsx
import { cva, type VariantProps } from "class-variance-authority";

// ✅ CVA로 변형 정의
const cardVariants = cva(
  "rounded-lg border bg-card text-card-foreground shadow-sm",
  {
    variants: {
      variant: {
        default: "border-border",
        outline: "border-2",
        ghost: "border-transparent shadow-none",
      },
      size: {
        sm: "p-4",
        md: "p-6",
        lg: "p-8",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  },
);

interface CardProps
  extends ComponentProps<"div">,
    VariantProps<typeof cardVariants> {}

export function Card({ variant, size, className, ...props }: CardProps) {
  return (
    <div className={cn(cardVariants({ variant, size }), className)} {...props} />
  );
}
```

### 2. 컴파운드 컴포넌트 패턴

React 19: `<Context value>`로 Provider를 렌더링하고, `use(Context)`로 읽습니다. 상태를 공유하므로 **Client Component**입니다.

```tsx
"use client";

import { createContext, use, useState, type ReactNode } from "react";

interface AccordionContextType {
  openItems: Set<string>;
  toggle: (value: string) => void;
}

const AccordionContext = createContext<AccordionContextType | null>(null);

function useAccordion() {
  const context = use(AccordionContext);
  if (!context) {
    throw new Error("Accordion 컴포넌트 내부에서만 사용할 수 있습니다.");
  }
  return context;
}

export function Accordion({
  children,
  type = "single",
}: {
  children: ReactNode;
  type?: "single" | "multiple";
}) {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggle = (value: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        if (type === "single") next.clear();
        next.add(value);
      }
      return next;
    });
  };

  return (
    // ✅ <AccordionContext.Provider> 대신 <AccordionContext>
    <AccordionContext value={{ openItems, toggle }}>
      <div className="accordion">{children}</div>
    </AccordionContext>
  );
}

export function AccordionItem({
  value,
  children,
}: {
  value: string;
  children: ReactNode;
}) {
  return <div data-value={value}>{children}</div>;
}

export function AccordionTrigger({
  value,
  children,
}: {
  value: string;
  children: ReactNode;
}) {
  const { openItems, toggle } = useAccordion();
  return (
    <button
      type="button"
      aria-expanded={openItems.has(value)}
      onClick={() => toggle(value)}
      className="accordion-trigger"
    >
      {children}
    </button>
  );
}

export function AccordionContent({
  value,
  children,
}: {
  value: string;
  children: ReactNode;
}) {
  const { openItems } = useAccordion();
  return openItems.has(value) ? (
    <div className="accordion-content">{children}</div>
  ) : null;
}

// 사용법
<Accordion type="multiple">
  <AccordionItem value="item-1">
    <AccordionTrigger value="item-1">질문 1</AccordionTrigger>
    <AccordionContent value="item-1">답변 1</AccordionContent>
  </AccordionItem>
</Accordion>;
```

> 접근성/키보드 처리가 중요한 경우 직접 구현보다 Radix UI(shadcn/ui) 컴포넌트를 우선 사용하세요.

## ⚡ 성능 최적화 패턴

### 1. 메모이제이션 — React Compiler 우선

React Compiler를 켜면 컴포넌트/값/함수가 **빌드 타임에 자동 메모이제이션**되므로 `memo`, `useMemo`, `useCallback`을 일일이 작성할 필요가 없습니다.

```ts
// next.config.ts
// 1) npm install -D babel-plugin-react-compiler
// 2) 설정 (Next 16에서 reactCompiler는 stable이지만 기본값은 꺼져 있음)
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  reactCompiler: true,
  // 점진 도입: reactCompiler: { compilationMode: "annotation" }  → "use memo" 지시자를 쓴 컴포넌트만 컴파일
};

export default nextConfig;
```

```tsx
// ✅ React Compiler 사용 시: 그냥 작성
function ExpensiveChild({ name }: { name: string }) {
  return <div>Hello, {name}!</div>; // memo 없이도 불필요한 리렌더링 방지
}
```

- Compiler를 **사용하지 않는** 경우, 또는 측정으로 병목이 확인된 경우에만 `memo`/`useMemo`/`useCallback`을 수동으로 적용합니다.
- 컴파일러는 React 규칙(순수한 렌더링, Hook 규칙)을 지키는 코드를 전제로 합니다. 렌더링 중 외부 값 변경, prop/state 직접 수정은 금지입니다.
- 빌드 설정 변경은 프로젝트 영향이 크므로 도입 전 팀 합의를 거치세요.

### 2. Effect에서 최신 값 참조: `useEffectEvent`

Effect 내부에서 "이벤트성" 로직이 최신 props/state를 읽어야 하지만 그 값 변경 때문에 Effect를 재실행하고 싶지 않을 때 사용합니다 (React 19.2+).

```tsx
"use client";

import { useEffect, useEffectEvent } from "react";

function ChatRoom({ roomId, theme }: { roomId: string; theme: string }) {
  // theme가 바뀌어도 재연결하지 않지만, 항상 최신 theme를 사용
  const onConnected = useEffectEvent(() => {
    showNotification("연결됨", theme);
  });

  useEffect(() => {
    const conn = createConnection(roomId);
    conn.on("connected", onConnected);
    conn.connect();
    return () => conn.disconnect();
  }, [roomId]); // onConnected는 의존성에 넣지 않음
}
```

> 주의: 의존성 배열 경고를 피하려는 용도로 쓰지 마세요. Effect Event는 Effect(또는 다른 Effect Event) 안에서만 호출하고, 다른 컴포넌트에 prop으로 넘기지 않습니다.

### 3. 지연 로딩 (Lazy Loading)

```tsx
import dynamic from "next/dynamic";

// ✅ next/dynamic: 코드 분할 + 브라우저 전용 컴포넌트에 ssr: false 옵션
const Chart = dynamic(() => import("@/components/charts/chart"), {
  loading: () => <div>차트 로딩 중...</div>,
});
```

```tsx
"use client";

import { lazy, Suspense } from "react";

// ✅ 또는 React.lazy + Suspense
const HeavyComponent = lazy(() => import("./heavy-component"));

export function Dashboard() {
  return (
    <Suspense fallback={<div>컴포넌트 로딩 중...</div>}>
      <HeavyComponent />
    </Suspense>
  );
}
```

- `ssr: false`는 **Client Component 안에서만** 사용할 수 있습니다.
- Server Component를 쓰는 경우 가장 좋은 지연 로딩은 `<Suspense>` 스트리밍입니다.

### 4. 상태 보존: `<Activity>` (React 19.2)

탭/사이드 패널처럼 "숨겨도 상태를 유지하고 싶은" UI에 사용합니다. 숨겨진 동안 Effect는 정리되고 업데이트는 낮은 우선순위로 처리됩니다.

```tsx
import { Activity } from "react";

<Activity mode={tab === "settings" ? "visible" : "hidden"}>
  <SettingsPanel />
</Activity>;
```

### 5. 가상화 (Virtualization)

수백 개 이상의 항목이 한 번에 렌더링되는 리스트는 가상화 라이브러리(`@tanstack/react-virtual`, `react-window` 등)를 사용합니다. 이 프로젝트에는 아직 설치되어 있지 않으므로 도입 시 의존성을 추가하고, **해당 라이브러리의 최신 문서(API가 버전별로 다름)** 를 확인한 뒤 적용하세요.

- 가상화 컴포넌트는 스크롤/측정 로직 때문에 Client Component입니다.
- 항목 데이터는 서버에서 패칭해 props로 전달하되, 직렬화 가능한 최소 필드만 넘깁니다.

## 🛡️ 타입 안전성 패턴

### 1. 제네릭 컴포넌트

```tsx
// ✅ 타입 안전한 제네릭 컴포넌트
interface SelectProps<T> {
  options: T[];
  value?: T;
  onChange: (value: T) => void;
  getLabel: (option: T) => string;
  getValue: (option: T) => string;
  className?: string;
}

export function Select<T>({
  options,
  value,
  onChange,
  getLabel,
  getValue,
  className,
}: SelectProps<T>) {
  return (
    <select
      value={value ? getValue(value) : ""}
      onChange={(e) => {
        const selected = options.find((o) => getValue(o) === e.target.value);
        if (selected) onChange(selected);
      }}
      className={className}
    >
      {options.map((option) => (
        <option key={getValue(option)} value={getValue(option)}>
          {getLabel(option)}
        </option>
      ))}
    </select>
  );
}

// 사용법 (완전한 타입 추론)
<Select<User>
  options={users}
  value={selectedUser}
  onChange={setSelectedUser}
  getLabel={(user) => user.name}
  getValue={(user) => user.id}
/>;
```

> 함수 컴포넌트는 `React.FC`를 쓰지 않고 일반 함수 + props 타입을 사용합니다 (제네릭 지원, children 암묵 포함 없음).

### 2. 판별 유니온으로 props 조합 제한

```tsx
// ✅ 상태에 따라 허용되는 props가 달라지는 경우 판별 유니온 사용
type ActionButtonProps =
  | { loading: true; onClick?: never; children: React.ReactNode }
  | { loading?: false; onClick: () => void; children: React.ReactNode };

export function ActionButton(props: ActionButtonProps) {
  const { children, loading, onClick } = props;

  return (
    <button onClick={onClick} disabled={loading} aria-busy={loading}>
      {loading ? <Spinner /> : children}
    </button>
  );
}

<ActionButton onClick={save}>저장</ActionButton>; // ✅
<ActionButton loading>저장</ActionButton>; // ✅
<ActionButton loading onClick={save}>저장</ActionButton>; // ❌ 타입 에러
```

## 🎨 고급 패턴

### 1. Hook 기반 로직 분리

```tsx
"use client";

import { useState } from "react";

// ✅ 커스텀 훅으로 로직 분리
// (React Compiler 사용 시 useCallback 불필요. 미사용 시 안정된 참조가 필요하면 useCallback 적용)
function useToggle(initialValue = false) {
  const [value, setValue] = useState(initialValue);

  const toggle = () => setValue((prev) => !prev);
  const setTrue = () => setValue(true);
  const setFalse = () => setValue(false);

  return { value, toggle, setTrue, setFalse, setValue };
}

export function Modal({ children }: { children: React.ReactNode }) {
  const { value: isOpen, setTrue: open, setFalse: close } = useToggle();

  return (
    <>
      <button onClick={open}>모달 열기</button>
      {isOpen && <Dialog onClose={close}>{children}</Dialog>}
    </>
  );
}
```

### 2. Context + Reducer 패턴

Provider는 Client Component이며, **`layout.tsx`(Server Component)에서 `children`을 감싸는 형태**로 배치합니다. 가능한 한 트리의 낮은 위치에 두어 클라이언트 영역을 최소화합니다.

```tsx
// components/cart-provider.tsx
"use client";

import { createContext, use, useReducer, type Dispatch, type ReactNode } from "react";

interface CartState {
  items: CartItem[];
  total: number;
}

type CartAction =
  | { type: "ADD_ITEM"; payload: CartItem }
  | { type: "REMOVE_ITEM"; payload: string }
  | { type: "UPDATE_QUANTITY"; payload: { id: string; quantity: number } }
  | { type: "CLEAR_CART" };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM": {
      const items = [...state.items, action.payload];
      return { items, total: calculateTotal(items) };
    }
    // 다른 케이스들...
    default:
      return state;
  }
}

const CartContext = createContext<{
  state: CartState;
  dispatch: Dispatch<CartAction>;
} | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [], total: 0 });

  return <CartContext value={{ state, dispatch }}>{children}</CartContext>;
}

export function useCart() {
  const context = use(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}
```

```tsx
// app/layout.tsx (Server Component)
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
```

## 🚫 안티패턴 및 금지사항

### ❌ 피해야 할 패턴

```tsx
// 1. 너무 많은 props / 너무 많은 책임
function OverloadedComponent({ prop1, prop2, /* ... */ prop10 }) {}

// 2. 깊은 props drilling → 컴포지션(children) 또는 Context 사용
function App() {
  const user = useUser();
  return <Level1 user={user} />;
}

// 3. 거대한 컴포넌트 (300줄 초과) → 분리

// 4. 의미 없는 래핑
function UnnecessaryWrapper({ children }) {
  return <div>{children}</div>;
}

// 5. 페이지 전체에 "use client" 선언
//    → 상호작용이 필요한 리프 컴포넌트만 Client Component로 분리

// 6. 데이터 패칭용 useEffect + useState
//    → Server Component에서 await, 또는 Promise + use()

// 7. params / searchParams 동기 접근
const { id } = props.params; // ❌ Promise
const { id } = await props.params; // ✅

// 8. forwardRef / Context.Provider 신규 사용 (React 19 이전 방식)

// 9. Suspense 경계 밖에서 캐시되지 않은 동적 데이터 접근 (cacheComponents 활성화 시 오류)

// 10. Client Component 안에서 Server Component 직접 import
//     → children/props로 주입

// 11. 파일 중간에 "use client" 선언 (반드시 파일 최상단, import보다 위)
```

### ⚠️ 조건부 최적화 (React Compiler 없이 사용할 때만)

```tsx
// React Compiler 미사용 + ExpensiveComponent가 memo로 감싸져 있을 때만 의미 있음
<ExpensiveComponent
  config={{ option: "value" }} // 매 렌더링마다 새 객체 → memo 무효화
  onUpdate={() => {}} // 매 렌더링마다 새 함수 → memo 무효화
/>
```

React Compiler를 켜면 위와 같은 인라인 객체/함수도 자동으로 안정화됩니다. 그렇지 않은 경우 상수 분리, `useMemo`, `useCallback`으로 대응하세요.

## ✅ 컴포넌트 작성 체크리스트

새 컴포넌트 작성 시 확인사항:

### 설계

- [ ] 단일 책임 원칙 준수
- [ ] 적절한 컴포지션 활용 (`children`, `asChild`, 컴파운드 컴포넌트)
- [ ] 재사용 가능성 고려

### 타입 안전성

- [ ] Props 인터페이스 정의 (`ComponentProps<"tag">` 활용)
- [ ] `ref`는 일반 prop으로 처리 (`forwardRef` 미사용)
- [ ] 동적 라우트는 `PageProps<'/route'>` + `await params`
- [ ] 제네릭 / 판별 유니온 활용 (필요시)

### Server/Client 분리

- [ ] Server Component 우선 고려
- [ ] `"use client"`는 파일 최상단, 리프 컴포넌트에만 최소한으로
- [ ] Server → Client props는 직렬화 가능한 값만
- [ ] 비동기 컴포넌트는 `<Suspense>`로 감싸기 (Cache Components)
- [ ] 캐시 가능한 데이터는 `"use cache"` + `cacheLife()` 검토

### 성능

- [ ] 데이터 패칭은 서버에서 (클라이언트 `useEffect` 패칭 지양)
- [ ] React Compiler 사용 여부 확인 후 수동 메모이제이션 결정
- [ ] 무거운 클라이언트 컴포넌트는 `next/dynamic` 또는 `lazy` 로딩
- [ ] 큰 리스트 가상화 고려

### 접근성

- [ ] 의미있는 HTML 태그 사용
- [ ] ARIA 속성 추가 (`aria-expanded`, `aria-busy`, `aria-live` 등)
- [ ] 키보드 네비게이션 지원

### 코드 품질

- [ ] ESLint 규칙 준수
- [ ] 300줄 이하 유지
- [ ] 명확한 네이밍

이 패턴들을 활용하여 유지보수하기 쉽고 확장 가능한 컴포넌트를 작성해보세요!
