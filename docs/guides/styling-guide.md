# 스타일링 가이드

이 문서는 Tailwind CSS v4 + shadcn/ui(new-york) + next-themes 기반 스타일링 규칙입니다.

## 기술 스택

| 도구                                           | 버전     | 비고                                                         |
| ---------------------------------------------- | -------- | ------------------------------------------------------------ |
| Tailwind CSS                                   | 4.3      | CSS-first 설정. `tailwind.config.ts` 없음                    |
| `@tailwindcss/postcss`                         | 4.3      | `postcss.config.mjs`의 유일한 플러그인 (autoprefixer 불필요) |
| shadcn/ui                                      | new-york | `components.json`, Radix UI 기반                             |
| tailwindcss-animate                            | 1.x      | `@plugin 'tailwindcss-animate'`로 로드                       |
| next-themes                                    | 0.4      | `class` 전략 다크모드                                        |
| class-variance-authority, clsx, tailwind-merge |          | 변형 정의와 `cn()`                                           |
| lucide-react                                   | 1.x      | 아이콘                                                       |

## Tailwind v4 설정 구조

모든 설정은 `app/globals.css`에 있습니다.

```css
@import "tailwindcss";

@plugin "tailwindcss-animate";

/* 다크모드: <html class="dark"> 기준 */
@custom-variant dark (&:is(.dark *));

/* 유틸리티가 참조할 토큰 등록 */
@theme {
  --color-background: hsl(var(--background));
  --color-foreground: hsl(var(--foreground));
  --color-primary: hsl(var(--primary));
  /* ... card, popover, secondary, muted, accent, destructive, border, input, ring, chart-1~5 */
  --radius-lg: var(--radius);
  --radius-md: calc(var(--radius) - 2px);
  --radius-sm: calc(var(--radius) - 4px);
}

/* 실제 색상 값은 :root / .dark 에서 HSL 채널로 정의 */
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 0 0% 3.9%; /* ... */
  }
  .dark {
    --background: 0 0% 3.9%;
    --foreground: 0 0% 98%; /* ... */
  }
}
```

규칙:

- `@tailwind base/components/utilities`와 `tailwind.config.ts`는 쓰지 않는다.
- 새 색상/토큰은 `:root`와 `.dark`에 값을 정의하고, `@theme`에 `--color-*`로 등록해야 `bg-*`/`text-*` 유틸리티로 쓸 수 있다.
- 임의 값은 `[]` 대신 v4 문법을 쓴다: `origin-(--my-var)`, `max-h-(--my-var)`.
- 프로젝트 토큰은 HSL 채널(`0 0% 100%`) 방식이다. 최신 shadcn 템플릿은 `oklch`를 쓰므로, `shadcn add`로 받은 컴포넌트에 색상 변수가 어긋나면 이 방식에 맞춰 수정한다.
- 기본 테두리 색이 `currentcolor`로 바뀐 것을 `globals.css`의 호환 스타일과 `@apply border-border`가 보정한다. 새 요소는 `border-border`를 명시하는 습관을 들인다.

## v3 → v4 클래스 변경점

| v3                             | v4                                                 |
| ------------------------------ | -------------------------------------------------- |
| `shadow-sm`                    | `shadow-xs`                                        |
| `shadow`                       | `shadow-sm`                                        |
| `rounded-sm`                   | `rounded-xs` (`rounded`는 `rounded-sm`)            |
| `outline-none`                 | `outline-hidden`                                   |
| `ring` (3px)                   | `ring-3` (`ring`은 1px)                            |
| `bg-gradient-to-r`             | `bg-linear-to-r`                                   |
| `data-[disabled]:`             | `data-disabled:`                                   |
| `min-w-[8rem]`                 | `min-w-32`                                         |
| `bg-opacity-50` 등             | `bg-black/50`                                      |
| `flex-shrink-*`, `flex-grow-*` | `shrink-*`, `grow-*`                               |
| `!p-4` (접두 important)        | `p-4!` (접미)                                      |
| `space-x-*`, `space-y-*`       | 동작하지만 레이아웃은 `flex`/`grid` + `gap-*` 권장 |

CSS 변수를 클래스에서 참조할 때는 `bg-(--color)` 형태입니다.

## 기본 원칙

```tsx
// 권장: 유틸리티 + 시맨틱 색상
<div className="flex items-center justify-between rounded-lg border border-border bg-card p-4 shadow-sm">
  <h2 className="text-lg font-semibold text-foreground">제목</h2>
  <Button variant="outline" size="sm">버튼</Button>
</div>

// 금지: 인라인 스타일, 하드코딩 색상
<div style={{ display: "flex", padding: 16 }}>
<div className="bg-white text-black dark:bg-black dark:text-white">
```

- 다크모드는 시맨틱 토큰(`bg-background`, `text-muted-foreground` 등)으로 처리하고, `dark:` 접두사는 토큰으로 해결되지 않을 때만 쓴다.
- 클래스 정렬은 `prettier-plugin-tailwindcss`가 저장/커밋 시 자동으로 처리한다(`cn()`, `cva()`, `clsx()`, `twMerge()` 인자 포함). 순서를 수동으로 맞추지 않는다.
- 커스텀 CSS 클래스와 CSS Modules는 만들지 않는다. 반복되면 컴포넌트로 추출한다.
- `!important`(`p-4!`)는 서드파티 스타일을 덮어쓸 때만 쓴다.

### 반응형

모바일 우선으로 작성하고 `sm:`, `md:`, `lg:`, `xl:`로 확장합니다.

```tsx
<div className="flex flex-col gap-4 p-4 md:flex-row md:gap-6 md:p-6 lg:mx-auto lg:max-w-6xl lg:p-8">
```

```tsx
<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
```

v4의 `container`는 기본으로 가운데 정렬/패딩이 없으므로 `mx-auto px-4`를 직접 붙이거나 `max-w-*`와 함께 씁니다. 부모 크기 기준 반응형이 필요하면 컨테이너 쿼리(`@container`, `@md:`)를 사용합니다.

## cn()과 cva

`lib/utils.ts`의 `cn()`은 `clsx` + `tailwind-merge`입니다. 조건부 클래스와 `className` prop 병합은 항상 `cn()`을 씁니다.

```tsx
<div className={cn("rounded-md border p-4", isActive && "bg-primary text-primary-foreground", className)}>
```

변형이 있는 컴포넌트는 `cva`로 정의합니다 (`components/ui/button.tsx` 참고).

```tsx
const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-0.5 text-xs",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        outline: "border",
      },
    },
    defaultVariants: { variant: "default" },
  },
);
```

## shadcn/ui

현재 `components/ui/`에는 badge, button, card, checkbox, dropdown-menu, input, label이 있습니다.

```bash
npx shadcn@latest add dialog
```

- 추가한 컴포넌트는 코드가 프로젝트 소유입니다. 직접 수정해도 되지만, `shadcn add`를 다시 실행하면 덮어쓰이므로 변경 사항을 확인하세요.
- v3용 클래스(`outline-none`, `shadow-sm` 등)가 섞여 들어오면 위 변경점 표에 맞춰 정리합니다.
- 기존 컴포넌트는 `React.forwardRef`를 쓰고 있습니다. React 19에서는 `ref`를 일반 prop으로 받을 수 있으므로 새 컴포넌트는 `forwardRef` 없이 `ref`를 prop으로 받아도 됩니다. 기존 코드를 일괄 변환할 필요는 없습니다.
- 확장은 래핑으로 합니다.

```tsx
export function LiftButton({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      className={cn(
        "transition-all hover:-translate-y-0.5 hover:shadow-lg",
        className,
      )}
      {...props}
    />
  );
}
```

## 다크모드

`app/layout.tsx`에서 `next-themes`의 `ThemeProvider`를 `attribute="class"`로 설정하고 `<html suppressHydrationWarning>`을 둡니다. Tailwind의 `@custom-variant dark`가 `.dark` 클래스를 기준으로 동작합니다.

```tsx
<ThemeProvider
  attribute="class"
  defaultTheme="system"
  enableSystem
  disableTransitionOnChange
>
  {children}
</ThemeProvider>
```

테마 값(`useTheme`)은 서버에서 알 수 없으므로 마운트 후에만 UI에 반영해야 합니다. `components/theme-switcher.tsx`는 `useSyncExternalStore`로 hydration 여부를 판별합니다. `useEffect` + `setState`로 `mounted`를 만드는 방식은 React 19 lint 규칙(`react-hooks/set-state-in-effect`)에 걸릴 수 있어 쓰지 않습니다.

```tsx
const mounted = useSyncExternalStore(
  () => () => {},
  () => true,
  () => false,
);
```

## 색상 시스템

| 토큰                                     | 용도                           |
| ---------------------------------------- | ------------------------------ |
| `background` / `foreground`              | 페이지 배경 / 기본 텍스트      |
| `card`, `popover` (+ `-foreground`)      | 카드, 팝오버 표면              |
| `primary`, `secondary` (+ `-foreground`) | 주요/보조 액션                 |
| `muted` / `muted-foreground`             | 약한 배경 / 보조 텍스트        |
| `accent` (+ `-foreground`)               | hover, 선택 상태               |
| `destructive`                            | 삭제, 오류                     |
| `border`, `input`, `ring`                | 테두리, 입력 테두리, 포커스 링 |
| `chart-1` ~ `chart-5`                    | 차트 계열 색상                 |

```tsx
<div className="border-border bg-background">
  <h1 className="text-foreground">메인 텍스트</h1>
  <p className="text-muted-foreground">보조 텍스트</p>
</div>
```

오류 메시지처럼 의미가 있는 색은 `text-destructive`를 사용하고 `text-red-600`을 하드코딩하지 않습니다. 성공 색상이 필요하면 토큰을 먼저 추가합니다.

## 애니메이션

`tailwindcss-animate` 유틸리티(`animate-in`, `fade-in-0`, `zoom-in-95`, `slide-in-from-top-2` 등)는 Radix 컴포넌트의 `data-[state=open]:` 변형과 함께 쓰입니다. 기본 제공 `animate-spin`, `animate-pulse`, `animate-bounce`도 사용할 수 있습니다.

```tsx
<Loader2 className="size-4 animate-spin" />
<button className="transition-all duration-200 hover:scale-105">hover</button>
```

- `animate-fadeIn`, `animate-slideUp` 같은 클래스는 존재하지 않는다.
- `tw-animate-css`는 설치되어 있지 않다. shadcn 최신 템플릿이 이를 가정한 코드를 줄 때는 `tailwindcss-animate` 기준으로 맞추거나, 패키지를 교체한다면 `@plugin` 대신 `@import "tw-animate-css"`로 함께 변경한다.
- 움직임이 큰 애니메이션은 `motion-reduce:` 변형으로 비활성화를 고려한다.

## 금지 사항

```tsx
<div style={{ backgroundColor: "red" }}>                 // 인라인 스타일
<div className={`${styles.custom} flex`}>                // CSS Module 혼용
<div className="bg-gray-100 text-gray-900">              // 하드코딩 색상 (토큰 사용)
<button className="bg-red-200 text-red-300">             // 저대비
<div className="outline-none shadow-sm rounded-sm">      // v3 의미로 쓴 클래스 (v4에서 의미가 달라짐)
<div className="bg-gradient-to-r">                       // v4: bg-linear-to-r
```

## 체크리스트

- [ ] 유틸리티 클래스와 시맨틱 토큰 사용, 하드코딩 색상 없음
- [ ] 조건부/외부 클래스는 `cn()`으로 병합
- [ ] 라이트/다크 모두 확인
- [ ] 모바일 우선 반응형
- [ ] v3 클래스(`outline-none`, `shadow-sm`, `bg-gradient-*`) 미사용
- [ ] 포커스 스타일(`focus-visible:ring-*`)과 충분한 색상 대비
- [ ] 새 토큰은 `:root`, `.dark`, `@theme` 세 곳에 모두 추가
