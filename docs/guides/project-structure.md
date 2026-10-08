# 프로젝트 구조 가이드

이 문서는 **Next.js 16 (App Router)** 프로젝트의 폴더 구조, 파일 조직 및 네이밍 컨벤션을 정의합니다.

> 이 문서는 **프로젝트의 실제 구조**(루트 직하 `app/`, `components/`, `lib/` — `src/` 폴더 없음)를 기준으로 합니다.
> 관련 가이드: [nextjs-16.md](./nextjs-16.md), [component-patterns.md](./component-patterns.md), [styling-guide.md](./styling-guide.md), [forms-react-hook-form.md](./forms-react-hook-form.md)

## 🏗️ 전체 프로젝트 구조

```text
hkoikoi-sco-patrol/
├── app/                    # 🚀 Next.js App Router (라우팅, 페이지, 레이아웃)
├── components/             # 🧩 React 컴포넌트
├── lib/                    # 🛠️ 유틸리티 및 외부 서비스 설정
├── docs/                   # 📚 프로젝트 문서
│   └── guides/             #    개발 가이드 모음
├── public/                 # 🌍 정적 파일 (필요 시 생성)
├── proxy.ts                # 🔀 요청 프록시 (구 middleware.ts) — Supabase 세션 갱신
├── components.json         # shadcn/ui 설정
├── next.config.ts          # Next.js 설정 (cacheComponents 등)
├── postcss.config.mjs      # PostCSS 설정 (@tailwindcss/postcss)
├── eslint.config.mjs       # ESLint flat config
├── tsconfig.json           # TypeScript 설정 (경로 별칭 "@/*" → "./*")
├── package.json            # 의존성 및 스크립트
├── .env.example            # 환경변수 템플릿 (.env는 커밋 금지)
├── CLAUDE.md               # 🤖 Claude Code 프로젝트 지침 (AGENTS.md를 import)
├── AGENTS.md               # 🤖 next dev가 자동 생성하는 Next.js 에이전트 규칙 (직접 편집 금지)
├── .claude/ , .agents/     # Claude Code 설정 / 스킬
└── .mcp.json               # MCP 서버 설정
```

## 📁 세부 폴더 구조

### app/ - App Router

```text
app/
├── layout.tsx              # 🎨 루트 레이아웃 (전역 설정, 테마 Provider)
├── page.tsx                # 🏠 홈페이지 (/)
├── globals.css             # 🎨 전역 CSS + Tailwind v4 설정 (@theme, 색상 변수)
├── favicon.ico
├── opengraph-image.png
├── twitter-image.png
├── auth/                   # 🔐 인증 관련 라우트
│   ├── login/page.tsx
│   ├── sign-up/page.tsx
│   ├── sign-up-success/page.tsx
│   ├── forgot-password/page.tsx
│   ├── update-password/page.tsx
│   ├── confirm/            #    이메일 확인 (Route Handler)
│   └── error/page.tsx
└── protected/              # 🔒 로그인 필요 영역
    ├── layout.tsx
    └── page.tsx
```

**🚀 App Router 특수 파일:**

| 파일                       | 역할                                                     |
| -------------------------- | -------------------------------------------------------- |
| `page.tsx`                 | 해당 경로의 UI (이 파일이 있어야 URL로 접근 가능)        |
| `layout.tsx`               | 하위 라우트를 감싸는 공유 레이아웃                       |
| `loading.tsx`              | 로딩 UI (자동으로 `<Suspense>` 경계 생성)                |
| `error.tsx`                | 에러 UI (`"use client"` 필수)                            |
| `not-found.tsx`            | 404 UI                                                   |
| `route.ts`                 | Route Handler (API 엔드포인트)                           |
| `default.tsx`              | Parallel Routes slot의 fallback (**Next 16에서 필수**)   |
| `unauthorized.tsx` / `forbidden.tsx` | 401 / 403 UI (`authInterrupts` 활성화 시)      |

**루트 레벨 파일:**

- `proxy.ts`: 요청 가로채기. Next.js 16에서 `middleware.ts`가 `proxy.ts`로 변경되었습니다 (`app/`과 같은 레벨, 런타임은 `nodejs` 고정).

### 라우트 조직 기법

```text
app/
├── (marketing)/            # Route Group: URL에 포함되지 않고 레이아웃만 분리
│   ├── layout.tsx
│   └── about/page.tsx      # → /about
├── (dashboard)/
│   └── analytics/page.tsx  # → /analytics
├── users/
│   ├── [id]/page.tsx       # 동적 라우트 → /users/123
│   └── _components/        # Private Folder: 라우팅에서 제외, 해당 라우트 전용 코드
│       └── user-table.tsx
└── @modal/                 # Parallel Route slot (default.tsx 필수)
```

- **Route Group** `(name)`: URL 영향 없이 레이아웃/그룹 분리
- **Private Folder** `_name`: 라우팅에서 제외. **특정 페이지에서만 쓰는 컴포넌트는 이 안에 코로케이션**
- **Dynamic Segment** `[id]`: `params`는 **Promise** (`await props.params`)

### components/ - 컴포넌트 조직

```text
components/
├── ui/                     # 🎛️ 기본 UI 컴포넌트 (shadcn/ui)
│   ├── button.tsx
│   ├── card.tsx
│   ├── input.tsx
│   ├── label.tsx
│   ├── checkbox.tsx
│   ├── badge.tsx
│   └── dropdown-menu.tsx
├── tutorial/               # 📘 Supabase 스타터 튜토리얼 (불필요 시 삭제 가능)
├── login-form.tsx          # 🔐 로그인 폼
├── sign-up-form.tsx        # ✍️ 회원가입 폼
├── forgot-password-form.tsx
├── update-password-form.tsx
├── auth-button.tsx         # 로그인 상태에 따른 버튼
├── logout-button.tsx
├── theme-switcher.tsx      # 🌓 테마 전환
└── hero.tsx                # 🏠 홈 섹션
```

**🧩 컴포넌트 분류 규칙:**

1. **`ui/`** — shadcn/ui 기반 재사용 기본 컴포넌트
   - 순수 UI만 포함, 비즈니스 로직 없음, props로 동작 제어
   - `npx shadcn@latest add <name>`으로 추가 (직접 수정 가능)
2. **루트(`components/*.tsx`)** — 여러 페이지에서 쓰는 기능 단위 컴포넌트 (폼, 버튼 등)
3. **규모가 커지면** 기능별 하위 폴더로 분리합니다.

   ```text
   components/
   ├── ui/
   ├── layout/        # header, footer, container
   ├── navigation/    # main-nav, mobile-nav
   ├── forms/         # 폼 컴포넌트 모음
   └── providers/     # Context Provider ("use client")
   ```

4. **한 페이지에서만 쓰는 컴포넌트**는 `components/`가 아니라 해당 라우트의 `_components/`에 둡니다.

### lib/ - 유틸리티 및 설정

```text
lib/
├── utils.ts                # 🛠️ cn() 등 공통 유틸리티
└── supabase/               # 🗄️ Supabase 클라이언트
    ├── client.ts           #    브라우저용 (Client Component)
    ├── server.ts           #    서버용 (Server Component / Action / Route Handler)
    └── proxy.ts            #    proxy.ts에서 호출하는 세션 갱신 로직
```

**📚 lib/ 확장 가이드:**

```text
lib/
├── utils.ts
├── constants.ts           # 상수 정의
├── types/                 # 공통 TypeScript 타입
├── hooks/                 # 커스텀 훅 ("use client" 필요한 것만)
├── schemas/               # Zod 스키마 (클라이언트/서버 공유)
├── actions/               # Server Actions ("use server")
└── data/                  # 서버 데이터 접근 함수 (DAL)
```

**서버 전용 코드 보호:** DB/비밀키를 다루는 모듈에는 `import "server-only"`를 추가하면 Client Component에서 import할 때 빌드 오류로 막아줍니다.

> Supabase 클라이언트는 **함수 호출마다 새로 생성**합니다 (`lib/supabase/server.ts`의 주석 참고). 전역 변수에 보관하지 마세요.

## 🏷️ 파일 네이밍 컨벤션

### 파일명 규칙

```bash
# ✅ 올바른 파일명: kebab-case
user-profile.tsx
login-form.tsx
use-local-storage.ts

# ❌ 잘못된 파일명
UserProfile.tsx         # PascalCase 파일명 (이 프로젝트에서는 사용하지 않음)
user_profile.tsx        # snake_case
userprofile.tsx         # 단어 구분 없음
```

> 이 프로젝트의 기존 파일은 모두 kebab-case입니다 (`login-form.tsx`, `theme-switcher.tsx`). 일관성을 위해 따르세요.

### 컴포넌트 / 함수 네이밍

```typescript
// ✅ 올바른 네이밍
export function UserProfile() {} // 컴포넌트: PascalCase
export function useUserProfile() {} // 훅: use 접두사 + camelCase
export async function updateUserAction() {} // Server Action: 동사 + Action 접미사
export const loginSchema = z.object({}); // 스키마: camelCase + Schema 접미사

// ❌ 잘못된 네이밍
export function userProfile() {} // 컴포넌트가 camelCase
export function login_form() {} // snake_case
```

### 폴더 네이밍

```bash
# ✅ 올바른 폴더명
components/             # 소문자
user-settings/          # kebab-case
(marketing)/            # Route Group
_components/            # Private Folder
[id]/                   # Dynamic Segment

# ❌ 잘못된 폴더명
Components/             # PascalCase
user_settings/          # snake_case
```

## 🔗 경로 별칭 (Path Aliases)

`tsconfig.json`의 `"@/*": ["./*"]`가 프로젝트 루트를 가리키고, `components.json`이 shadcn 별칭을 정의합니다.

```typescript
// ✅ 경로 별칭 사용 (권장)
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LoginForm } from "@/components/login-form";
import { createClient } from "@/lib/supabase/server";

// ❌ 상대 경로로 먼 디렉터리 접근 (금지)
import { Button } from "../../../components/ui/button";
```

**📍 정의된 별칭 (`components.json` 기준):**

| 별칭             | 경로               |
| ---------------- | ------------------ |
| `@/components`   | `./components`     |
| `@/components/ui`| `./components/ui`  |
| `@/lib`          | `./lib`            |
| `@/lib/utils`    | `./lib/utils`      |
| `@/hooks`        | `./hooks` (폴더 생성 시) |

> `@/ui`, `@/utils` 같은 단축 별칭은 정의되어 있지 않습니다.
> 같은 폴더 또는 바로 인접한 파일(`./user-table`)은 상대 경로를 써도 됩니다.

## 📝 새 파일/폴더 추가 규칙

### 1. 새 UI 컴포넌트 추가

```bash
# shadcn/ui 컴포넌트 추가 → components/ui/ 에 생성됨
npx shadcn@latest add dialog

# 커스텀 UI 컴포넌트
components/ui/custom-component.tsx
```

### 2. 새 페이지 추가

```bash
# 정적 페이지
app/about/page.tsx

# 동적 페이지
app/users/[id]/page.tsx

# 그룹 라우트
app/(auth)/login/page.tsx

# 해당 페이지 전용 컴포넌트
app/users/_components/user-table.tsx
```

### 3. 새 비즈니스 컴포넌트 추가

```text
위치 결정 기준:
1. 특정 라우트에서만 사용      → 해당 라우트의 _components/
2. 여러 페이지에서 사용        → components/ (필요 시 기능별 하위 폴더)
3. 레이아웃 관련              → components/layout/
4. 네비게이션 관련            → components/navigation/
5. Context Provider           → components/providers/ (또는 기능 폴더)
```

### 4. 새 Server Action / 데이터 함수 추가

```bash
# Server Action: 파일 최상단에 "use server"
lib/actions/auth.ts

# 라우트 전용이면 코로케이션
app/users/actions.ts
```

### 5. 새 유틸리티 추가

```bash
lib/utils.ts            # 범용 헬퍼는 기존 파일에 추가
lib/date-utils.ts       # 특화된 유틸리티는 새 파일
```

## 🎯 코드 조직 베스트 프랙티스

### 1. 단일 책임 원칙

- 하나의 파일은 하나의 주요 기능만 담당
- 관련된 타입과 유틸리티는 같은 파일에 포함 가능

### 2. 의존성(import) 순서

```typescript
// 1. 외부 라이브러리
import Link from "next/link";
import { useState } from "react";

// 2. 내부 모듈 (@/ 경로)
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// 3. 상대 경로
import { UserTable } from "./_components/user-table";

// 4. 타입 전용 import는 `import type` 사용
import type { User } from "@/lib/types";
```

### 3. Export 규칙

```typescript
// ✅ Named export (컴포넌트, 유틸리티 — 권장)
export function LoginForm() {}

// ✅ Default export (Next.js가 요구하는 특수 파일: page, layout, error, loading, not-found 등)
export default function LoginPage() {}

// ❌ 같은 컴포넌트를 두 방식으로 모두 export
export function LoginForm() {}
export default LoginForm;
```

> `page.tsx`, `layout.tsx`, `error.tsx` 등 특수 파일은 **default export가 필수**이고, 그 외 컴포넌트는 named export를 사용합니다.

### 4. Server / Client 구분

- 기본은 **Server Component**. 상태/이벤트/브라우저 API가 필요한 파일에만 `"use client"`를 최상단에 선언합니다.
- Client Component는 가능한 리프(leaf)로 분리하고, 서버 데이터는 props로 전달합니다.
- 자세한 패턴은 [component-patterns.md](./component-patterns.md) 참고.

### 5. 파일 크기 관리

- 단일 파일: 300줄 이하 권장
- 300줄 초과 시 분할 고려 (관련 기능별로 분리)

## 🚫 금지사항

### ❌ 피해야 할 구조

```bash
# 깊은 중첩 구조 (4단계 이상)
components/pages/auth/forms/login/login-form.tsx

# 의미 없는 폴더명
components/misc/
components/common/
components/shared/

# 혼재된 케이스
components/UserProfile/Login_Form.tsx

# Pages Router 디렉터리
pages/
```

### ❌ 피해야 할 패턴

```typescript
// 거대한 파일 (500줄 이상)
export function SuperMegaComponent() {}

// 깊은 상대 경로
import { utils } from "../../../../../lib/utils";

// 서버 전용 모듈을 Client Component에서 import
"use client";
import { createClient } from "@/lib/supabase/server"; // ❌ → client.ts 사용

// 비밀키를 NEXT_PUBLIC_ 접두사로 노출
NEXT_PUBLIC_SECRET_KEY=...  # ❌ 브라우저 번들에 포함됨
```

## ✅ 체크리스트

새 파일/폴더 추가 시 확인사항:

- [ ] 적절한 위치에 배치 (라우트 전용이면 `_components/`, 공용이면 `components/`)
- [ ] kebab-case 파일명 사용
- [ ] PascalCase 컴포넌트명 사용
- [ ] `@/` 경로 별칭 사용
- [ ] 특수 파일은 default export, 그 외는 named export
- [ ] `"use client"`는 필요한 파일에만, 파일 최상단에 선언
- [ ] 서버 전용 코드는 Client Component에서 import하지 않음
- [ ] 의존성 import 순서 준수
- [ ] 파일 크기 300줄 이하 유지

이 가이드를 따라 일관성 있고 유지보수하기 쉬운 프로젝트 구조를 만들어보세요!
