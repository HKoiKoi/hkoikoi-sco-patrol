# 컴포넌트 패턴 가이드

이 문서는 Next.js 16 + React 19.3 환경에서 재사용 가능한 컴포넌트를 작성하는 패턴을 정리합니다.
서버/클라이언트 경계와 캐싱 규칙은 `nextjs-16.md`, 스타일은 `styling-guide.md`를 함께 참고하세요.

## 기본 설계 원칙

### 단일 책임

한 컴포넌트는 하나의 명확한 역할만 맡습니다. 아바타 + 상태 + 통계 + 액션이 한 곳에 섞이면 분리합니다.

```tsx
export function UserStatus({ isOnline }: { isOnline: boolean }) {
  return (
    <span
      role="status"
      aria-label={isOnline ? "온라인" : "오프라인"}
      className={cn(
        "size-3 rounded-full",
        isOnline ? "bg-chart-2" : "bg-muted-foreground",
      )}
    />
  );
}
```

### 컴포지션 우선

상속 대신 `children`과 슬롯 컴포넌트로 조합합니다. `components/ui/card.tsx`가 기준 예시입니다.

```tsx
<Card>
  <CardHeader>
    <CardTitle>제목</CardTitle>
    <CardDescription>설명</CardDescription>
  </CardHeader>
  <CardContent>내용</CardContent>
</Card>
```

## Server vs Client Components

### 기본은 Server Component

데이터 패칭, 서버 전용 모듈(Supabase 서버 클라이언트), SEO가 필요한 UI는 Server Component로 둡니다.
`cacheComponents`가 켜져 있으므로 **요청 시점 데이터를 읽는 컴포넌트는 `<Suspense>`로 감싸고, 데이터를 읽는 쪽을 Suspense 안쪽 컴포넌트로 분리**합니다.

```tsx
// app/instruments/page.tsx
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";

async function InstrumentList() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("instruments").select();
  if (error) return <p>불러오지 못했습니다: {error.message}</p>;
  return (
    <ul className="grid gap-2">
      {data.map((item) => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <InstrumentList />
    </Suspense>
  );
}
```

페이지 컴포넌트 안에서 `await`한 뒤 그 결과를 `<Suspense>` 안의 자식에게 넘기면 Suspense가 의미가 없고, 경계 밖의 동적 접근은 에러가 됩니다.

### 필요한 곳만 Client Component

상태, 이벤트 핸들러, 브라우저 API, Context 소비가 필요한 말단 컴포넌트에만 `'use client'`를 붙입니다. 파일 최상단에 선언하고, 서버에서 받은 데이터는 props로 전달합니다.

```tsx
// components/like-button.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function LikeButton({ initialLiked }: { initialLiked: boolean }) {
  const [liked, setLiked] = useState(initialLiked);
  return (
    <Button
      variant="outline"
      aria-pressed={liked}
      onClick={() => setLiked((v) => !v)}
    >
      {liked ? "좋아요 취소" : "좋아요"}
    </Button>
  );
}
```

- Client Component에서 `lib/supabase/server.ts`를 import하지 않는다 (브라우저에서는 `lib/supabase/client.ts`).
- 서버 전용 코드가 클라이언트로 새는 것이 걱정되면 해당 모듈 상단에 `import "server-only"`를 둔다.
- `'use client'` 컴포넌트가 import하는 모듈은 모두 클라이언트 번들에 포함된다. 서버 컴포넌트는 `children`/props로 끼워 넣을 수 있다.

### 동적 라우트 컴포넌트의 params

`params`와 `searchParams`는 Promise입니다. `PageProps` 헬퍼를 사용합니다 (`npx next typegen`).

```tsx
export default async function Page(props: PageProps<"/products/[id]">) {
  const { id } = await props.params;
  return (
    <Suspense fallback={<ProductSkeleton />}>
      <ProductInfo id={id} />
    </Suspense>
  );
}
```

## React 19 패턴

### 폼 상태: `useActionState`와 `useFormStatus`

```tsx
"use client";

import { useActionState } from "react";
import { updateName } from "./actions";

export function NameForm() {
  const [state, formAction, isPending] = useActionState(updateName, {
    message: "",
  });
  return (
    <form action={formAction} className="grid gap-3">
      <Input name="name" required />
      <Button type="submit" disabled={isPending}>
        {isPending ? "저장 중..." : "저장"}
      </Button>
      {state.message && <p role="status">{state.message}</p>}
    </form>
  );
}
```

React Hook Form과 조합하는 방법은 `forms-react-hook-form.md`를 참고하세요.

### 낙관적 업데이트: `useOptimistic`

```tsx
"use client";

import { useOptimistic, useTransition } from "react";

export function TodoList({
  todos,
  addTodo,
}: {
  todos: Todo[];
  addTodo: (title: string) => Promise<void>;
}) {
  const [optimistic, addOptimistic] = useOptimistic(
    todos,
    (current, title: string) => [
      ...current,
      { id: crypto.randomUUID(), title, pending: true },
    ],
  );
  const [, startTransition] = useTransition();

  return (
    <>
      <ul>
        {optimistic.map((t) => (
          <li key={t.id} className={cn(t.pending && "opacity-50")}>
            {t.title}
          </li>
        ))}
      </ul>
      <button
        onClick={() =>
          startTransition(async () => {
            addOptimistic("새 항목");
            await addTodo("새 항목");
          })
        }
      >
        추가
      </button>
    </>
  );
}
```

### `ref`는 일반 prop

React 19에서는 함수 컴포넌트가 `ref`를 prop으로 직접 받습니다. 새 컴포넌트에서는 `forwardRef`가 필요 없습니다. 기존 `components/ui/*`의 `forwardRef`는 동작에 문제가 없으므로 일괄 변환하지 않습니다.

```tsx
function TextField({
  ref,
  className,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      ref={ref}
      className={cn("h-9 rounded-md border px-3", className)}
      {...props}
    />
  );
}
```

### 그 외

- `use(promise)` / `use(context)`: Client Component에서 서버가 넘긴 Promise를 읽을 때 사용 (Suspense 필요).
- `<Context value={...}>`: React 19에서는 `<Context.Provider>` 대신 Context를 직접 Provider로 쓸 수 있다.
- `useEffectEvent`: Effect 안에서 최신 props/state를 읽되 의존성에는 넣고 싶지 않은 로직에 사용.
- `<Activity>`: Cache Components 네비게이션에서 라우트가 숨겨져도 상태가 유지된다. Effect cleanup을 반드시 작성한다.
- 메타데이터 태그(`<title>`, `<meta>`)는 컴포넌트에서 직접 렌더링할 수 있지만, 이 프로젝트에서는 `metadata` / `generateMetadata`를 사용한다.

## Props 설계

### Props 타입은 DOM 타입을 확장

```tsx
type AlertProps = React.ComponentProps<"div"> & {
  tone?: "info" | "danger";
};

export function Alert({ tone = "info", className, ...props }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-md border p-4 text-sm",
        tone === "danger" && "border-destructive text-destructive",
        className,
      )}
      {...props}
    />
  );
}
```

- 네이티브 속성(`onClick`, `disabled`, `aria-*`)을 직접 선언하지 말고 `React.ComponentProps<"tag">`로 받는다.
- prop이 7~8개를 넘거나 boolean prop이 여럿이면 컴포지션으로 나눈다.
- 기본값은 구조 분해에서 지정한다.

### `asChild` (Radix Slot)

DOM 구조를 바꾸지 않고 다른 요소(예: `Link`)에 스타일/동작을 입히려면 `asChild`를 사용합니다. `components/ui/button.tsx`가 이를 지원합니다.

```tsx
<Button asChild>
  <Link href="/auth/login">로그인</Link>
</Button>
```

### 다형성 컴포넌트

`as` prop 방식은 타입이 복잡해집니다. 대부분의 경우 `asChild`로 충분하며, 필요한 곳에서만 제네릭 `as`를 구현합니다.

## 재사용 패턴

### 변형: cva

```tsx
import { cva, type VariantProps } from "class-variance-authority";

const panelVariants = cva("rounded-lg border bg-card text-card-foreground", {
  variants: {
    size: { sm: "p-4", md: "p-6", lg: "p-8" },
    tone: { default: "border-border", ghost: "border-transparent shadow-none" },
  },
  defaultVariants: { size: "md", tone: "default" },
});

type PanelProps = React.ComponentProps<"div"> &
  VariantProps<typeof panelVariants>;

export function Panel({ size, tone, className, ...props }: PanelProps) {
  return (
    <div className={cn(panelVariants({ size, tone }), className)} {...props} />
  );
}
```

### 컴파운드 컴포넌트

상태를 공유하는 컴포넌트 묶음은 Context로 연결합니다. 소비 훅에서 Provider 유무를 검사합니다.

```tsx
"use client";

import { createContext, use, useState } from "react";

type TabsContextValue = { value: string; setValue: (v: string) => void };
const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs() {
  const ctx = use(TabsContext);
  if (!ctx) throw new Error("Tabs 컴포넌트 안에서만 사용할 수 있습니다");
  return ctx;
}

export function Tabs({
  defaultValue,
  children,
}: {
  defaultValue: string;
  children: React.ReactNode;
}) {
  const [value, setValue] = useState(defaultValue);
  return <TabsContext value={{ value, setValue }}>{children}</TabsContext>;
}

export function TabsTrigger({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) {
  const tabs = useTabs();
  return (
    <button
      role="tab"
      aria-selected={tabs.value === value}
      onClick={() => tabs.setValue(value)}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) {
  return useTabs().value === value ? (
    <div role="tabpanel">{children}</div>
  ) : null;
}
```

접근성이 중요한 복합 위젯(Tabs, Dialog, Accordion 등)은 직접 만들지 말고 Radix 기반 shadcn 컴포넌트를 추가합니다 (`npx shadcn@latest add tabs`).

### 커스텀 훅

```tsx
function useToggle(initial = false) {
  const [value, setValue] = useState(initial);
  return {
    value,
    toggle: () => setValue((v) => !v),
    setTrue: () => setValue(true),
    setFalse: () => setValue(false),
  };
}
```

`useCallback`으로 모든 함수를 감쌀 필요는 없습니다 (아래 성능 절 참고).

## 데이터 패칭 위치

| 상황                           | 방법                                                                |
| ------------------------------ | ------------------------------------------------------------------- |
| 초기 렌더에 필요한 데이터      | Server Component에서 직접 조회 + `Suspense`                         |
| 사용자 변경 (폼 제출)          | Server Action + `useActionState`                                    |
| 브라우저 전용 실시간/반복 조회 | Client Component + `lib/supabase/client.ts` 또는 SWR/TanStack Query |

`useEffect` 안에서 `fetch` + `useState`로 로딩/에러를 직접 관리하는 `DataFetcher` 류의 render-props 컴포넌트는 만들지 않습니다. 서버 패칭 또는 Suspense + `use()`를 사용하세요.

## 성능

- **React Compiler**: 현재 `reactCompiler` 옵션은 꺼져 있습니다. 켜면 컴파일러가 메모이제이션을 자동화하므로 수동 `memo`/`useMemo`/`useCallback`은 대부분 불필요합니다. 켜기 전에는 측정으로 병목이 확인된 곳에만 사용합니다.
- **지연 로딩**: 클라이언트 전용 무거운 컴포넌트는 `next/dynamic`을 사용합니다.

```tsx
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("@/components/chart"), {
  loading: () => <div className="h-64 animate-pulse rounded-md bg-muted" />,
});
```

- **긴 리스트**: 수백 개 이상이면 가상화 라이브러리(`@tanstack/react-virtual` 등)를 검토합니다. 라이브러리 API는 버전마다 다르므로 도입 시 최신 문서를 확인합니다.
- **props 안정성**: 컴파일러가 꺼진 상태에서 `memo`된 자식에게 인라인 객체/함수를 넘기면 메모이제이션이 무효화됩니다.

## 타입 안전성

### 제네릭 컴포넌트

```tsx
type SelectProps<T> = {
  options: T[];
  value?: T;
  onChange: (value: T) => void;
  getLabel: (option: T) => string;
  getKey: (option: T) => string;
};

export function Select<T>({
  options,
  value,
  onChange,
  getLabel,
  getKey,
}: SelectProps<T>) {
  return (
    <select
      value={value ? getKey(value) : ""}
      onChange={(e) => {
        const next = options.find((o) => getKey(o) === e.target.value);
        if (next) onChange(next);
      }}
    >
      {options.map((o) => (
        <option key={getKey(o)} value={getKey(o)}>
          {getLabel(o)}
        </option>
      ))}
    </select>
  );
}
```

### 판별 유니온 props

서로 배타적인 props는 조건부 제네릭보다 판별 유니온이 단순합니다.

```tsx
type ActionProps =
  { loading: true; onClick?: never } | { loading?: false; onClick: () => void };
```

### Supabase 타입

DB 타입은 `supabase gen types typescript` 또는 MCP의 `generate_typescript_types`로 생성하고 `createClient<Database>()`에 연결합니다. 수동 타입 선언은 피합니다.

## 안티패턴

```tsx
// props drilling이 3단계 이상 → Context 또는 컴포지션으로 해소
// 500줄이 넘는 컴포넌트 → 분리
// 의미 없는 래퍼 <div>만 반환하는 컴포넌트
// 이벤트 핸들러/상태가 없는데 'use client'
// any 타입 props
// 배열 index를 key로 사용 (순서가 바뀌는 리스트)
// useEffect로 파생 상태 계산 (렌더 중 계산하거나 useMemo 사용)
// Effect 안에서 동기 setState로 mounted 플래그 설정 (useSyncExternalStore 사용)
```

## 체크리스트

**설계**

- [ ] 단일 책임, 컴포지션 활용
- [ ] 네이티브 props는 `React.ComponentProps<"tag">`로 확장

**Server/Client**

- [ ] Server Component 우선, `'use client'`는 말단에만
- [ ] 요청 시점 데이터는 `Suspense` 경계 안에서 읽기
- [ ] `params`/`searchParams`는 `await`

**타입 / 성능**

- [ ] Props 타입 정의, `any` 없음
- [ ] 수동 메모이제이션은 측정 후에만
- [ ] 무거운 클라이언트 컴포넌트는 `next/dynamic`

**접근성 / 품질**

- [ ] 의미 있는 HTML 태그, 필요한 ARIA 속성, 키보드 조작
- [ ] Effect cleanup 작성 (`<Activity>`로 숨겨질 때 정리됨)
- [ ] `npm run lint`, `npx tsc --noEmit` 통과
