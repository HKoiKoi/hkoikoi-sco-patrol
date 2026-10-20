# 프로젝트 구조 가이드

이 문서는 Next.js 16 + Supabase 프로젝트의 실제 폴더 구조와 네이밍 컨벤션을 정의합니다.
이 프로젝트는 `src/` 디렉터리를 쓰지 않고 루트에 `app/`, `components/`, `lib/`를 둡니다.

## 전체 구조

```
hkoikoi-sco-patrol/
├── app/                    # Next.js App Router
├── components/             # React 컴포넌트
├── lib/                    # 유틸리티, Supabase 클라이언트
├── supabase/
│   └── migrations/         # SQL 마이그레이션 (타임스탬프_설명.sql)
├── docs/guides/            # 개발 가이드
├── proxy.ts                # 요청 전처리 (Supabase 세션 갱신)
├── next.config.ts          # Next.js 설정 (cacheComponents)
├── postcss.config.mjs      # Tailwind CSS v4 (@tailwindcss/postcss)
├── eslint.config.mjs       # ESLint flat config (eslint-config-prettier 포함)
├── .prettierrc.json        # Prettier (Tailwind 클래스 정렬 플러그인)
├── .husky/                 # Git hooks (pre-commit: lint-staged, pre-push: typecheck)
├── components.json         # shadcn/ui 설정
├── tsconfig.json           # TypeScript 설정 (@/* → ./*)
├── AGENTS.md / CLAUDE.md   # 에이전트 지침 (Next.js 번들 문서 안내 포함)
└── .env / .env.example     # 환경 변수
```

- `tailwind.config.ts`는 없습니다. 테마는 `app/globals.css`의 `@theme`에서 정의합니다.
- `middleware.ts`는 없습니다. 같은 역할은 `proxy.ts`가 합니다.
- `public/`, `hooks/`, `src/`는 현재 없으며 필요할 때 루트에 추가합니다.

## app/ — 라우트

```
app/
├── layout.tsx                # 루트 레이아웃 (폰트, ThemeProvider, 헤더/푸터, 공통 안내 배너)
├── page.tsx                  # / (일지 조회로 이동)
├── globals.css               # Tailwind v4 + 테마 변수
├── icon.svg
├── error.tsx                 # 전역 오류 경계 (한국어, retry)
├── global-error.tsx          # 루트 레이아웃 오류 경계 (자체 html/body)
├── not-found.tsx             # 전역 404 (한국어)
├── auth/                     # 인증 흐름
│   ├── login/, sign-up/, sign-up-success/
│   ├── forgot-password/, update-password/, error/
│   ├── callback/route.ts     # OAuth 콜백 Route Handler
│   └── confirm/route.ts      # 이메일 확인 Route Handler
├── logs/                     # 일지 조회 (공개, 앱 기본 진입)
│   ├── page.tsx, actions.ts, error.tsx
│   └── _components/
└── protected/                # 로그인 필요 영역 (역할 검증은 lib/auth/dal.ts)
    ├── layout.tsx, page.tsx
    ├── patrol/               # 순찰 기록 (매니저·관리자)
    └── admin/tags/           # 퀵 태그 관리 (관리자)
```

파일 규칙:

- `page.tsx` 라우트의 UI, `layout.tsx` 공유 레이아웃, `route.ts` Route Handler
- `loading.tsx`, `error.tsx`, `not-found.tsx`는 필요할 때만 추가
- `params`, `searchParams`는 Promise이므로 `await` 하거나 `PageProps<'/경로'>` 헬퍼를 사용 (`npx next typegen`)
- Cache Components가 켜져 있으므로 요청 시점 데이터(`cookies()`, DB 조회 등)를 읽는 컴포넌트는 `<Suspense>`로 감싼다
- 라우트 세그먼트 설정 `dynamic`, `revalidate`, `fetchCache`, `runtime = 'edge'`는 사용하지 않는다 (자세한 내용은 `nextjs-16.md`)
- 특정 라우트에서만 쓰는 컴포넌트는 해당 라우트 폴더에 둘 수 있다. 앞에 `_`를 붙인 폴더(`_components`)는 라우팅에서 제외된다
- URL에 영향을 주지 않고 레이아웃만 나누려면 Route Group `(group)`을 사용한다

## components/ — 컴포넌트

```
components/
├── ui/                       # shadcn/ui 기본 컴포넌트 (alert-dialog, badge, button, card,
│                             #   checkbox, dialog, dropdown-menu, input, label, separator,
│                             #   skeleton, sonner, switch, textarea)
├── layout/                   # 앱 공통 레이아웃 (app-chrome, app-header, app-footer,
│                             #   nav-menu, notice-banner, pending-banner)
├── patrol/                   # 여러 페이지 공용 순찰 컴포넌트 (copy-button, seat-chips)
├── auth-button.tsx, logout-button.tsx, google-login-button.tsx
├── login-form.tsx, sign-up-form.tsx
├── forgot-password-form.tsx, update-password-form.tsx
├── auth-error-message.tsx, in-app-browser-notice.tsx
└── theme-switcher.tsx
```

분류 규칙:

1. **ui/**: shadcn/ui 기반 순수 UI 컴포넌트. 비즈니스 로직 없이 props로 동작을 제어한다. 추가는 `npx shadcn@latest add <name>`.
2. **`components/<domain>/`**: 여러 페이지가 쓰는 도메인 컴포넌트(`layout/`, `patrol/`). 한 페이지에서만 쓰면 라우트의 `_components/`에 둔다.
3. **루트(`components/*.tsx`)**: 인증 폼·버튼 같은 기능 컴포넌트. 기능이 늘어 5개 이상 묶이면 `components/<domain>/` 폴더로 분리한다.
4. import 방향은 `components/ui` ← `components/<domain>` ← `app/` 단방향이다.

## lib/ — 유틸리티와 Supabase

```
lib/
├── utils.ts                  # cn()
├── auth/                     # dal.ts(requireStaff/requireAdmin), notice.ts, safe-next.ts
├── queries/                  # 서버 조회 함수 (patrol-logs, patrol-draft, quick-tags)
├── types/                    # auth.ts, patrol.ts (화면용 도메인 타입)
├── business-date.ts          # 영업일 표시·기본값 (기준은 DB private.business_date_of)
├── patrol-format.ts          # 복사 문구 순수 함수
├── patrol-form-reducer.ts, patrol-draft-rpc.ts, draft-backup.ts   # 순찰 입력·자동 저장
├── permissions.ts, seat-numbers.ts, quick-tag-label.ts, quick-tag-list.ts
└── supabase/
    ├── client.ts             # 브라우저용 클라이언트 (Client Component)
    ├── server.ts             # 서버용 클라이언트 (Server Component/Action/Route Handler)
    ├── proxy.ts              # proxy.ts에서 호출하는 세션 갱신 로직
    ├── database.types.ts     # 생성된 DB 타입
    └── mappers.ts            # DB 행 → 도메인 타입 변환
```

- 서버 클라이언트(`server.ts`)는 `cookies()`를 쓰므로 **요청마다** `await createClient()`로 생성한다. 전역 변수에 저장하지 않는다.
- 클라이언트 컴포넌트에서는 `client.ts`만 import한다. `server.ts`와 `proxy.ts`는 서버 전용이다.
- 스키마, 타입, 훅이 생기면 `lib/schemas/`, `lib/types/`, `hooks/`(루트)를 추가한다.

## 파일/폴더 네이밍

```bash
# 파일: kebab-case
login-form.tsx        # O
LoginForm.tsx         # X
login_form.tsx        # X

# 폴더: 소문자 kebab-case
sign-up-success/      # O
signUpSuccess/        # X
```

컴포넌트 이름은 PascalCase(`LoginForm`), 훅은 `use` 접두사 camelCase(`useToggle`)입니다.

## 경로 별칭

`tsconfig.json`의 `"@/*": ["./*"]`, `components.json`의 aliases를 따릅니다. 루트 기준이므로 `src`가 붙지 않습니다.

| 별칭              | 실제 경로                |
| ----------------- | ------------------------ |
| `@/components`    | `./components`           |
| `@/components/ui` | `./components/ui`        |
| `@/lib`           | `./lib`                  |
| `@/lib/utils`     | `./lib/utils.ts`         |
| `@/hooks`         | `./hooks` (필요 시 생성) |

```tsx
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
```

같은 폴더 안의 파일 외에는 상대 경로(`../../`) 대신 별칭을 사용합니다.

## 새 파일 추가 규칙

| 대상                      | 위치                                                    |
| ------------------------- | ------------------------------------------------------- |
| 새 페이지                 | `app/<경로>/page.tsx` (동적: `app/users/[id]/page.tsx`) |
| 인증이 필요한 페이지      | `app/protected/` 아래                                   |
| Route Handler             | `app/<경로>/route.ts`                                   |
| Server Action             | 기능 옆 `actions.ts` (파일 최상단에 `"use server"`)     |
| 공통 UI                   | `components/ui/` (shadcn CLI)                           |
| 한 페이지 전용 컴포넌트   | 해당 라우트 폴더의 `_components/`                       |
| 여러 페이지 공용 컴포넌트 | `components/`                                           |
| DB 스키마 변경            | `supabase/migrations/<timestamp>_<설명>.sql`            |

DB 변경은 마이그레이션으로만 합니다. 새 테이블에는 RLS를 켜고 필요한 권한만 grant 합니다 (`profiles` 마이그레이션 참고).

## 코드 조직 원칙

### import 순서

```tsx
// 1. 외부 라이브러리
import { Suspense } from "react";
import Link from "next/link";

// 2. 내부 모듈 (@/ 별칭)
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// 3. 상대 경로
import { helper } from "./helper";
```

### export 규칙

- `page.tsx`, `layout.tsx`, `route.ts` 등 Next.js 파일 규칙은 default export(또는 지정된 이름) 필수
- 그 외 컴포넌트는 named export를 사용하고, 같은 컴포넌트를 default와 named로 동시에 내보내지 않는다

### 크기와 책임

- 한 파일은 하나의 주요 책임만 가진다. 300줄을 넘으면 분리를 고려한다.
- 4단계 이상 깊은 중첩, `misc/`·`common/`·`shared/` 같은 모호한 폴더명은 피한다.

## 체크리스트

- [ ] 기능에 맞는 위치(`app/`, `components/`, `lib/`)에 배치
- [ ] kebab-case 파일명, PascalCase 컴포넌트명
- [ ] `@/` 별칭 사용, `src/` 경로 쓰지 않기
- [ ] 서버 전용 모듈(`lib/supabase/server.ts`)을 Client Component에서 import하지 않기
- [ ] 요청 시점 데이터를 읽는 컴포넌트에 `Suspense` 경계 설정
- [ ] DB 변경은 마이그레이션 파일로 추가
