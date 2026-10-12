# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## 기술 스택

- **프레임워크**: Next.js 16 (App Router, `proxy.ts`), React 19, TypeScript 5
- **백엔드/인증**: Supabase (`@supabase/ssr`, `@supabase/supabase-js`) — 쿠키 기반 세션
- **스타일링**: Tailwind CSS v4 (`@tailwindcss/postcss`), `tailwindcss-animate`, `tailwind-merge`, `clsx`, `class-variance-authority`
- **UI**: shadcn/ui + Radix UI(checkbox, dropdown-menu, label, slot), `lucide-react` 아이콘, `next-themes`(다크 모드)
- **린트**: ESLint 9 flat config + `eslint-config-next` 16

## 명령어

```bash
npm run dev     # 개발 서버
npm run build   # 프로덕션 빌드
npm run start   # 빌드 결과 실행
npm run lint    # eslint . (flat config, eslint.config.mjs)
npm run lint:fix      # eslint . --fix
npm run typecheck     # tsc --noEmit
npm run format        # prettier --write . (format:check는 검사만)
npm run check         # typecheck + lint + format:check
```

### 자동 검증 (Husky)

- `pre-commit`: `lint-staged`가 staged 파일에 `eslint --fix --max-warnings=0`과 `prettier --write`를 실행한다.
- `pre-push`: `npm run typecheck`를 실행한다.
- `.claude/hooks/format-hook.sh`(PostToolUse)가 Claude가 Edit/Write한 파일에 Prettier를 자동 적용한다.
- hook이 실패하면 원인을 고쳐서 다시 커밋한다. `--no-verify`로 우회하지 않는다.

테스트 러너는 설정되어 있지 않다. 환경 변수는 `.env.example`을 `.env`로 복사해 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`를 채운다. (`DATA_DIR`, `TEMPLATES_USE`, `ENABLE_GUI`는 shrimp-task-manager MCP용이다.)

## 아키텍처

Next.js 16 App Router + Supabase Auth(`@supabase/ssr`) 스타터 기반 프로젝트다. `src/` 없이 루트에 `app/`, `components/`, `lib/`를 두며 import alias는 `@/*` → `./*`이다. Tailwind CSS v4(`tailwind.config.ts` 없음, 테마는 `app/globals.css`의 `@theme`)와 shadcn/ui(`components/ui`, `components.json`)를 쓴다.

### 인증/세션 흐름

- `middleware.ts`가 아니라 **`proxy.ts`**(Next.js 16 규약)가 모든 요청에서 `lib/supabase/proxy.ts`의 `updateSession()`을 호출해 세션 쿠키를 갱신한다.
- `updateSession()`은 `createServerClient`와 `supabase.auth.getClaims()` 사이에 다른 코드를 넣으면 안 되고, 반환하는 `supabaseResponse`를 그대로 돌려줘야 한다(깨지면 사용자가 무작위로 로그아웃됨). 비로그인 사용자는 `/`, `/auth/*`, `/login*`, `/instruments*` 외 경로 접근 시 `/auth/login`으로 리다이렉트된다. 공개 경로를 추가하려면 이 조건문을 수정한다.
- Supabase 클라이언트는 `lib/supabase/client.ts`(브라우저)와 `lib/supabase/server.ts`(서버)로 나뉜다. 서버 클라이언트는 전역 변수에 보관하지 말고 요청마다 `await createClient()`로 만든다.
- `lib/utils.ts`의 `hasEnvVars`는 env 미설정 시 proxy 검사와 일부 UI를 건너뛰는 튜토리얼용 플래그다.
- 이메일 확인은 `app/auth/confirm/route.ts`, 인증 화면은 `app/auth/*`, 로그인 후 영역은 `app/protected/*`다.

### 현재 상태

`components/tutorial/*`, `hero`, `deploy-button`, `app/instruments` 등은 스타터 템플릿 잔재이며 점차 실제 기능으로 교체 예정이다(`.claude/agents/dev/starter-cleaner.md` 참고). 템플릿 코드를 기준 패턴으로 간주하지 말 것.

## 참고 문서 / 도구

- `docs/guides/` — 프로젝트 구조, 컴포넌트 패턴, 스타일링, Next.js 16, react-hook-form 가이드. 해당 영역 작업 전에 먼저 읽는다.
- `.claude/agents/`(code-reviewer, ui-markup-specialist, development-planner, prd-* 등)와 `.claude/skills/`(git-branch, git-commit, git-pr, supabase)에 프로젝트 전용 에이전트·스킬이 있다. 커밋/PR은 한국어 컨벤셔널 형식(`타입: 제목`)이며, 기본 브랜치는 `main`, 작업 브랜치는 `develop`이다.
- `.mcp.json`에 context7, playwright, sequential-thinking, shrimp-task-manager, supabase MCP 서버가 설정되어 있다.
- 스키마 변경은 `supabase/migrations/`에 `타임스탬프_설명.sql`로 둔다.
