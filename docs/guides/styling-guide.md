# 스타일링 가이드

이 문서는 **Tailwind CSS + shadcn/ui + next-themes** 기반 스타일링 규칙과 모범 사례를 제공합니다.

> ✅ **버전 현황: 이 프로젝트는 Tailwind CSS v4로 전환되어 있습니다.**
>
> | 항목              | 현재 상태 (v4)                                                      |
> | ----------------- | ------------------------------------------------------------------- |
> | Tailwind CSS      | **v4.x** — CSS-first 설정 (`app/globals.css`), `tailwind.config.ts` 없음 |
> | 애니메이션        | `tw-animate-css` (`@import "tw-animate-css"`)                       |
> | 색상 변수         | `:root`/`.dark`에 `hsl(...)` **전체 값** 저장 → `@theme inline`으로 토큰 연결 (OKLCH 변환은 선택) |
> | PostCSS 플러그인  | `@tailwindcss/postcss` (`autoprefixer` 불필요)                      |
> | 다크모드          | `@custom-variant dark (&:is(.dark *))` + next-themes `attribute="class"` |
> | shadcn/ui         | `components.json`의 `tailwind.config`는 `""` (v4 방식)              |
>
> v4 전환 이력과 주의사항은 **"Tailwind v4 마이그레이션"** 절을 참고하세요.
> `components/ui/*`는 최신 shadcn(v4 + React 19) 버전으로 갱신되어 있습니다: `forwardRef` 제거, `data-slot` 속성, Radix 통합 패키지(`radix-ui`) 사용. 컴포넌트를 추가·갱신할 때는 `npx shadcn@latest add <name>` (덮어쓰기는 `--overwrite`)를 사용하세요. 변경 여부는 `--diff`로 먼저 확인할 수 있습니다.
> ⚠️ CLI(v4.21)가 생성한 파일에 `import { cn } from "cn"`처럼 잘못된 경로가 들어간 적이 있습니다. 추가 후 `@/lib/utils`로 import되어 있는지 확인하세요.

## 🎨 기술 스택 개요

- **Tailwind CSS**: 유틸리티 기반 CSS 프레임워크
- **shadcn/ui**: Radix UI 기반 컴포넌트 (new-york 스타일, `components/ui/`에 소스 복사 방식)
- **class-variance-authority (cva)**: 컴포넌트 변형(variants) 정의
- **tailwind-merge + clsx**: `cn()` 헬퍼로 클래스 병합
- **next-themes**: 다크모드 (`attribute="class"`)
- **lucide-react**: 아이콘
- **Prettier 플러그인 `prettier-plugin-tailwindcss`**: 클래스 자동 정렬 (현재 프로젝트에는 미설치 — 도입 시 추가)

## 🚀 Tailwind 사용 규칙

### 기본 원칙

```tsx
// ✅ 올바른 Tailwind 클래스 사용
<div className="flex items-center justify-between rounded-lg bg-background p-4 shadow-md">
  <h2 className="text-lg font-semibold text-foreground">제목</h2>
  <Button variant="outline" size="sm">버튼</Button>
</div>

// ❌ 인라인 스타일 사용 금지
<div style={{ display: 'flex', padding: '16px' }}>
  <h2 style={{ fontSize: '18px' }}>제목</h2>
</div>
```

### 클래스 작성 순서

Prettier 플러그인이 자동 정렬하지만, 수동 작성 시 다음 순서를 따르세요:

```tsx
<div
  className={cn(
    // 1. 레이아웃 (display, position)
    "absolute flex",
    // 2. 크기 (width, height, padding, margin)
    "m-2 h-auto w-full p-4",
    // 3. 타이포그래피
    "text-center text-lg font-medium",
    // 4. 배경 및 테두리
    "rounded-md border border-border bg-background",
    // 5. 효과 (shadow, opacity, transform)
    "opacity-90 shadow-lg",
    // 6. 상호작용 (hover, focus, active)
    "hover:bg-accent focus-visible:ring-2 active:scale-95",
    // 조건부 클래스
    isActive && "bg-primary text-primary-foreground",
    className,
  )}
/>
```

### 반응형 디자인 (모바일 우선)

```tsx
// ✅ 모바일 우선: 기본값이 모바일, 큰 화면으로 갈수록 덮어쓰기
<div
  className={cn(
    "flex flex-col gap-4 p-4", // 기본 (모바일)
    "md:flex-row md:gap-6 md:p-6", // 태블릿 (768px+)
    "lg:mx-auto lg:max-w-6xl lg:p-8", // 데스크톱 (1024px+)
    "xl:max-w-7xl", // 대형 (1280px+)
  )}
/>

// ❌ 데스크톱 우선 접근 지양
<div className="hidden lg:block md:hidden">
```

- 요소 간 간격은 `space-x/y-*`보다 **`gap-*`** (flex/grid)을 우선 사용합니다.
- 정사각형 크기는 `h-4 w-4` 대신 **`size-4`** 를 사용할 수 있습니다.

### 커스텀 CSS 최소화

```tsx
// ✅ Tailwind 유틸리티 우선
<button className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90">

// ❌ 커스텀 CSS 클래스 지양
<button className="custom-button">
```

### 동적 클래스명 주의

Tailwind는 소스에서 **완전한 클래스 문자열**을 스캔합니다. 문자열을 조립하면 스타일이 생성되지 않습니다.

```tsx
// ❌ 동작하지 않음: 클래스가 빌드 시 감지되지 않음
<div className={`text-${color}-500`} />

// ✅ 완전한 클래스명을 매핑
const colorMap = {
  red: "text-red-500",
  blue: "text-blue-500",
} as const;
<div className={colorMap[color]} />
```

## 🎭 shadcn/ui 컴포넌트 활용

### 기본 사용법

```tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ✅ shadcn/ui 컴포넌트 활용 (Server Component에서도 사용 가능)
export function UserCard({ user }: { user: { name: string } }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{user.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <Button variant="outline">프로필 보기</Button>
      </CardContent>
    </Card>
  );
}
```

### 컴포넌트 변형 (Variants)

```tsx
// variant
<Button variant="default">기본</Button>
<Button variant="destructive">삭제</Button>
<Button variant="outline">아웃라인</Button>
<Button variant="secondary">보조</Button>
<Button variant="ghost">고스트</Button>
<Button variant="link">링크</Button>

// size
<Button size="default">기본</Button>
<Button size="sm">작게</Button>
<Button size="lg">크게</Button>
<Button size="icon">아이콘</Button>

// asChild: 스타일은 Button, 렌더링 요소는 Link
<Button asChild>
  <Link href="/dashboard">대시보드</Link>
</Button>
```

### 컴포넌트 커스터마이징

```tsx
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ✅ 기존 컴포넌트 확장: className을 cn()으로 병합
export function LiftButton({ className, ...props }: ComponentProps<typeof Button>) {
  return (
    <Button
      className={cn(
        "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg",
        className,
      )}
      {...props}
    />
  );
}

// ❌ 처음부터 새로 만들기 (긴 클래스 나열)
export function MyButton(props: ComponentProps<"button">) {
  return <button className="rounded bg-blue-500 px-4 py-2 ..." {...props} />;
}
```

- shadcn/ui 컴포넌트는 **프로젝트 소스로 복사**되므로 `components/ui/*`를 직접 수정해도 됩니다. 다만 업데이트 시 덮어써질 수 있으니 큰 변경은 래퍼 컴포넌트로 분리하세요.
- 재사용 변형이 필요하면 `cva`로 variants를 정의합니다 ([component-patterns.md](./component-patterns.md) 참고).
- `ref`는 일반 prop입니다 (React 19). 새 컴포넌트에 `forwardRef`를 쓰지 마세요.

### 새 shadcn/ui 컴포넌트 추가

```bash
npx shadcn@latest add dialog
npx shadcn@latest add select textarea field
```

- 폼 컴포넌트: shadcn 공식 RHF 가이드는 `Controller` + **`Field`** (`FieldLabel`, `FieldError`, `FieldGroup`) 조합을 사용합니다. 자세한 내용은 [forms-react-hook-form.md](./forms-react-hook-form.md) 참고.
- `toast` 컴포넌트는 deprecated이며 **`sonner`** 를 사용합니다.

## 🌓 다크모드 구현

### next-themes 설정

이 프로젝트는 이미 `app/layout.tsx`에 적용되어 있습니다.

```tsx
// app/layout.tsx (Server Component)
import { ThemeProvider } from "next-themes";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // ✅ suppressHydrationWarning 필수: next-themes가 <html>의 class를 변경함
    <html lang="ko" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class" // Tailwind의 .dark 클래스 방식
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

> `ThemeProvider`는 Client Component이지만 Server Component인 layout에서 `children`을 감싸는 형태로 그대로 사용할 수 있습니다.

### 테마 토글 컴포넌트

서버에서는 현재 테마를 알 수 없으므로, `theme` 값에 의존하는 UI는 **마운트 후**에 렌더링해 hydration 불일치를 피합니다. (`components/theme-switcher.tsx`가 이 방식입니다.)

> `useEffect(() => setMounted(true), [])` 패턴은 `eslint-config-next` 16의 `react-hooks/set-state-in-effect` 규칙에 걸립니다. **`useSyncExternalStore`** 로 마운트 여부를 판단하세요.

```tsx
"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

const subscribe = () => () => {};

export function ThemeToggle() {
  // 서버/hydration: false → 클라이언트 마운트 후: true
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const { resolvedTheme, setTheme } = useTheme();

  if (!mounted) return <Button variant="outline" size="icon" disabled />;

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {resolvedTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
      <span className="sr-only">테마 전환</span>
    </Button>
  );
}
```

> CSS만으로 아이콘을 전환(`dark:rotate-0` 등)하면 mounted 체크 없이도 hydration 오류가 없습니다. `theme` 값을 JS에서 읽어 분기할 때만 mounted 체크가 필요합니다.

### 다크모드 대응 스타일링

```tsx
// ✅ 시맨틱 색상 변수 사용: 라이트/다크 자동 대응
<div className="bg-background text-foreground">
  <h1 className="text-primary">제목</h1>
  <p className="text-muted-foreground">설명</p>
</div>

// ❌ 하드코딩된 색상: 모든 곳에 dark: 변형을 직접 써야 함
<div className="bg-white text-black dark:bg-black dark:text-white">
  <h1 className="text-blue-600 dark:text-blue-400">제목</h1>
</div>
```

## 🎨 색상 시스템

### CSS 변수 기반 색상 (현재 프로젝트: Tailwind v4 방식)

`app/globals.css`에서 `:root`/`.dark`에 **`hsl()`을 포함한 전체 색상값**을 저장하고, `@theme inline`이 Tailwind 색상 토큰(`--color-*`)에 연결합니다. (`@layer base` 밖에 둡니다.)

```css
/* app/globals.css (현재) */
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  /* ... card, popover, secondary, muted, accent, destructive, border, input, ring, chart-1~5 */
  --radius-lg: var(--radius);
  --radius-md: calc(var(--radius) - 2px);
  --radius-sm: calc(var(--radius) - 4px);
}

:root {
  --background: hsl(0 0% 100%);
  --foreground: hsl(0 0% 3.9%);
  --primary: hsl(0 0% 9%);
  --primary-foreground: hsl(0 0% 98%);
  --radius: 0.5rem;
  /* ... */
}

.dark {
  --background: hsl(0 0% 3.9%);
  --foreground: hsl(0 0% 98%);
  /* ... */
}
```

- `tailwind.config.ts`는 더 이상 없습니다. 색상/반경 등 테마 토큰은 모두 CSS의 `@theme`에서 관리합니다.
- `@theme inline`을 쓰는 이유: 토큰이 `var(--background)`를 **참조 그대로** 유지해야 `.dark`에서 변수 값이 바뀔 때 색이 따라 바뀝니다. (`@theme`만 쓰면 `:root` 값이 빌드 시점에 고정될 수 있습니다.)

### 색상 사용 예시

```tsx
// ✅ 시맨틱 색상 클래스
<div className="border-border bg-background">
  <h1 className="text-foreground">메인 텍스트</h1>
  <p className="text-muted-foreground">보조 텍스트</p>
  <Button className="bg-primary text-primary-foreground">버튼</Button>
</div>

// ❌ 직접 색상 지정
<div className="border-gray-200 bg-white">
  <h1 className="text-gray-900">메인 텍스트</h1>
</div>
```

새 시맨틱 색상을 추가할 때는 ① `:root`/`.dark`에 `--success: hsl(...)` 변수 정의 → ② `@theme inline`에 `--color-success: var(--success);` 매핑 순서로 진행합니다. 이후 `bg-success`, `text-success` 등을 바로 쓸 수 있습니다.

## ✨ 애니메이션 가이드

### 현재 프로젝트 (`tw-animate-css`)

`app/globals.css`의 `@import "tw-animate-css";`로 로드되며, shadcn 컴포넌트(Dialog, Dropdown 등)가 쓰는 `animate-in`, `fade-in-0`, `zoom-in-95`, `slide-in-from-top-2` 등을 제공합니다. (v3의 `tailwindcss-animate`와 클래스 이름이 호환됩니다.)

```tsx
// ✅ tw-animate-css 제공 유틸리티
<div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300">나타남</div>

// ✅ Tailwind 기본 유틸리티
<div className="animate-spin" />
<div className="animate-pulse" />
<button className="transition-all duration-200 hover:scale-105 hover:shadow-lg">호버 효과</button>
```

> `tw-animate-css`는 **CSS 파일에서** 불러옵니다. TSX 안에서 `import 'tw-animate-css'` 하지 마세요.
> `animate-fadeIn`, `animate-slideUp` 같은 클래스는 기본 제공되지 않으며, 필요하면 직접 정의해야 합니다.

### 접근성: 움직임 줄이기

```tsx
// ✅ 사용자가 모션 감소를 설정한 경우 비활성화
<div className="animate-bounce motion-reduce:animate-none" />
<button className="transition-transform hover:scale-105 motion-reduce:transition-none motion-reduce:hover:scale-100" />
```

### 성능 고려사항

```tsx
// ✅ 변경이 잦은 속성은 transform/opacity 위주로 애니메이션
<div className="transition-transform hover:scale-105" />

// ⚠️ will-change는 꼭 필요한 요소에만 (남용하면 오히려 메모리 증가)
<div className="will-change-transform" />
```

## 📱 반응형 디자인 패턴

### 컨테이너 패턴

```tsx
// ✅ 반응형 컨테이너
<div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">{/* 컨텐츠 */}</div>

// ✅ 그리드 레이아웃
<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
  {items.map((item) => (
    <Card key={item.id}>...</Card>
  ))}
</div>
```

### 네비게이션 패턴

```tsx
// ✅ 반응형 네비게이션
<nav className="flex items-center justify-between p-4">
  <div className="flex items-center gap-4">
    <Logo />
    <div className="hidden gap-6 md:flex">
      <NavLink href="/about">소개</NavLink>
      <NavLink href="/contact">연락처</NavLink>
    </div>
  </div>

  {/* 모바일 메뉴 */}
  <div className="md:hidden">
    <MobileMenu />
  </div>
</nav>
```

- 링크 이동은 `next/link`의 `<Link>`, 이미지는 `next/image`의 `<Image>`를 사용합니다.
- 폰트는 `next/font`를 사용합니다 (`app/layout.tsx`의 Geist 참고).

## 🛠️ 유틸리티 함수

### cn() 헬퍼 함수

`lib/utils.ts`의 `cn()`은 `clsx` + `tailwind-merge` 조합입니다. 충돌하는 Tailwind 클래스는 **뒤에 오는 값이 이깁니다**.

```tsx
import { cn } from "@/lib/utils";

// ✅ cn()으로 클래스 조합 (className은 항상 마지막)
<div
  className={cn(
    "base-classes",
    condition && "conditional-classes",
    variant === "primary" && "primary-classes",
    className,
  )}
/>

// ❌ 수동 문자열 조합: 충돌 클래스(p-2 + p-4)가 정리되지 않음
<div className={`base-classes ${condition ? "conditional-classes" : ""} ${className || ""}`} />
```

### 조건부 스타일링

```tsx
// ✅ 단순 조건은 cn(), 변형이 많으면 cva
<Button
  className={cn(
    "base-button-styles",
    isLoading && "cursor-not-allowed opacity-50",
    size === "sm" && "px-2 py-1 text-sm",
  )}
  disabled={isLoading}
/>

// ❌ 중첩 삼항 연산자
<Button
  className={
    isLoading
      ? "opacity-50"
      : variant === "destructive"
        ? "bg-red-500 text-white"
        : "bg-blue-500 text-white"
  }
/>
```

## 🔄 Tailwind v4 마이그레이션

> 이 프로젝트는 v3.4 → v4로 **전환 완료**되었습니다. 아래는 적용한 내용의 기록이며, 다른 프로젝트나 추가 작업에서 참고할 수 있습니다.
> (v4는 최신 브라우저 기준: Safari 16.4+, Chrome 111+, Firefox 128+)

### 적용 이력 (이 프로젝트)

| 단계 | 내용 |
| ---- | ---- |
| 1 | `npx @tailwindcss/upgrade --force` 실행 (설정·CSS·템플릿 자동 변환, `autoprefixer` 제거, `@tailwindcss/postcss` 설치) |
| 2 | `tailwind.config.ts` 삭제 → 색상/반경 토큰을 `app/globals.css`의 `@theme inline`으로 이동 |
| 3 | `:root`/`.dark` 변수를 `hsl(...)` 전체 값으로 변경 (색상 값은 그대로 → 시각적 변화 없음) |
| 4 | `tailwindcss-animate` 제거 → `tw-animate-css` 설치, `@import "tw-animate-css"` |
| 5 | 업그레이드 도구가 넣은 border 호환 CSS(`border-color: gray-200`) 제거 — `* { @apply border-border }`가 이미 색을 지정하므로 불필요 |
| 6 | `npm run build` 통과, 라이트/다크 로그인 화면 육안 확인 |

> 같은 방식으로 다른 프로젝트를 전환할 때는 **새 브랜치**에서 `npx @tailwindcss/upgrade`를 실행하고 diff를 검토하세요.

### 1. 자동 업그레이드 도구

```bash
npx @tailwindcss/upgrade
```

설정 파일과 템플릿의 변경된 유틸리티를 자동으로 변환합니다. 작업 트리가 깨끗해야 실행되며, 그렇지 않으면 `--force`가 필요합니다.

### 2. 설정 변경 요약

```diff
# postcss.config.mjs
 const config = {
   plugins: {
-    tailwindcss: {},
-    autoprefixer: {},
+    "@tailwindcss/postcss": {},   // autoprefixer, postcss-import 불필요
   },
 };
```

```diff
# app/globals.css
-@tailwind base;
-@tailwind components;
-@tailwind utilities;
+@import "tailwindcss";
+@import "tw-animate-css";                 /* tailwindcss-animate 대체 (shadcn 권장) */
+
+@custom-variant dark (&:is(.dark *));     /* next-themes attribute="class" 대응 */
```

```css
/* 색상 변수는 전체 값으로 저장하고, @theme inline으로 Tailwind 색상에 연결 */
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --radius: 0.625rem;
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --radius-lg: var(--radius);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-sm: calc(var(--radius) * 0.6);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

- `tailwind.config.ts`는 삭제하거나, 꼭 필요한 경우에만 CSS의 `@config`로 참조합니다.
- `:root`/`.dark`는 `@layer base` 밖으로 꺼내고, 값은 `hsl()`/`oklch()`로 **완전한 색상값**으로 저장합니다.
- 기존 HSL 값을 그대로 유지하려면 `--primary: hsl(0 0% 9%);`처럼 `hsl()`로 감싸면 됩니다 (OKLCH 변환은 선택).

### 3. 변경된 유틸리티 (자주 만나는 항목)

| v3                         | v4                                   |
| -------------------------- | ------------------------------------ |
| `shadow-sm` / `shadow`     | `shadow-xs` / `shadow-sm`            |
| `rounded-sm` / `rounded`   | `rounded-xs` / `rounded-sm`          |
| `outline-none`             | `outline-hidden`                     |
| `ring` (3px, blue-500)     | `ring-3` (기본 `ring`은 1px, currentColor) |
| `bg-gradient-to-r`         | `bg-linear-to-r`                     |
| `!text-red-500` (앞에 `!`) | `text-red-500!` (**뒤에 `!`**)       |
| `bg-[--my-var]`            | `bg-(--my-var)`                      |
| `border` (기본 gray-200)   | 기본색이 `currentColor` → 색상 명시 (`border-border`) |
| `bg-opacity-50` 등         | 제거됨 → `bg-black/50`               |

> 시맨틱 색상(`border-border`)을 항상 명시하면 기본 border 색상 변경의 영향을 받지 않습니다. 이 가이드의 모든 예시가 그 방식입니다.

### 4. shadcn/ui 컴포넌트 업데이트

- v4 + React 19 대응 컴포넌트는 `forwardRef`가 제거되고, 각 요소에 `data-slot` 속성이 붙으며, 스타일링 시 `data-slot`을 선택자로 쓸 수 있습니다.
- 기존 컴포넌트는 `npx shadcn@latest add <name> --overwrite`로 덮어쓰거나, diff를 확인하며 수동 적용합니다. **직접 수정한 컴포넌트는 덮어쓰기 전에 백업**하세요.

### 5. 전환 후 확인

```bash
npm run build          # 빌드 오류
npx eslint app components lib   # 소스만 린트 (아래 참고)
```

> `npm run lint`(`eslint .`)는 `.next/` 빌드 산출물까지 검사해서 수천 건의 오류가 나옵니다. 이는 Tailwind와 무관한 기존 설정 문제이며, `eslint.config.mjs`에 `.next/**`를 `ignores`로 추가하면 해결됩니다.

그리고 브라우저에서 라이트/다크 전환, Dialog/Dropdown 애니메이션, focus ring 두께, 기본 border 색상을 눈으로 확인합니다.

## 🚫 금지사항

### ❌ 피해야 할 패턴

```tsx
// 인라인 스타일 사용
<div style={{ backgroundColor: 'red' }}>

// 긴 클래스 문자열 하드코딩 → 컴포넌트/cva로 추출
<div className="flex h-screen w-full items-center justify-center rounded-lg border-4 border-white bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-2xl font-bold text-white shadow-2xl">

// 충돌/중복 클래스
<div className="p-4 pt-4 pb-4 pl-4 pr-4">

// !important 남용
<div className="!text-red-500 !bg-blue-500">

// Tailwind와 CSS 모듈 혼재
<div className={`${styles.customClass} flex items-center`}>

// 동적 클래스명 조립
<div className={`text-${color}-500`}>
```

### ❌ 잘못된 색상 사용

```tsx
// 하드코딩된 색상 (시맨틱 변수 사용)
<div className="bg-gray-100 text-gray-900">

// 다크모드 미고려
<div className="bg-white text-black">

// 접근성 미고려 (저대비)
<button className="bg-red-200 text-red-300">저대비 버튼</button>
```

## ✅ 스타일링 체크리스트

새 컴포넌트 작성 시 확인사항:

### 기본 사항

- [ ] Tailwind 유틸리티 클래스 우선 사용
- [ ] `cn()` 함수로 클래스 조합 (`className`은 마지막 인자)
- [ ] 시맨틱 색상 변수 사용 (`bg-background`, `text-muted-foreground` 등)
- [ ] 모바일 우선 반응형 적용
- [ ] 완전한 클래스명 사용 (동적 조립 금지)

### 다크모드

- [ ] 하드코딩된 색상 없음
- [ ] 라이트/다크 전환 시 깨짐 없음
- [ ] `theme` 값을 JS로 읽는 UI는 마운트 후 렌더링

### 성능

- [ ] 불필요한 애니메이션 없음
- [ ] `motion-reduce` 대응
- [ ] 인라인 스타일 없음

### 접근성

- [ ] 충분한 색상 대비
- [ ] 포커스 상태 스타일 (`focus-visible:ring-*`)
- [ ] 아이콘 버튼에 `sr-only` 텍스트 또는 `aria-label`

### 유지보수

- [ ] 일관된 클래스 순서
- [ ] 재사용 가능한 컴포넌트/variants(cva) 활용
- [ ] v3 전용 문법(`!` 앞붙임, `bg-opacity-*`, `bg-gradient-to-*`, `outline-none`, `shadow-sm` 의미 혼동) 사용하지 않기 — v4 문법 사용

이 가이드를 따라 일관성 있고 아름다운 UI를 구현해보세요!
