# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## 프로젝트 개요

SCO 관리형 독서실의 30분 간격 순찰을 스마트폰/태블릿에서 최소 터치로 기록하고, 결과를 구글 시트에 한 줄씩 붙여넣게 하는 MVP다. 요구사항은 `docs/PRD.md`, 단계별 개발 계획은 `docs/ROADMAP.md`가 기준이다. 코드와 문서가 충돌하면 PRD를 먼저 확인한다.

- **역할**: 비로그인·`pending`은 일지 조회만, `manager`는 순찰 기록 작성과 본인 기록 수정·삭제, `admin`은 타인 기록 수정·삭제와 퀵 태그 관리까지 가능하다. 신규 가입자는 모두 `pending`이며 승격은 Supabase 대시보드에서 수동 처리한다. `role`은 앱에서 변경할 수 없다.
- **주요 경로**: `/logs`(일지 조회, 공개, 앱 기본 진입), `/protected/patrol`(순찰 기록, 매니저·관리자), `/protected/admin/tags`(퀵 태그 관리, 관리자), `/auth/*`(인증).
- **DB 접근 규칙**: 모든 권한 판정은 DB(RLS, 컬럼 GRANT, RPC 본문의 역할 검사)가 최종 방어선이고 화면의 버튼 숨김은 편의일 뿐이다. 초안 저장·순찰 완료는 `save_patrol_draft` / `complete_patrol` RPC로만 하며 브라우저 Supabase 클라이언트에서 직접 호출한다(`revision` 기반 충돌 감지, 요청 ID 멱등, 응답 `status`는 `ok` / `duplicate` / `conflict`). 기록 수정·삭제, 자리비움 처리, 퀵 태그 관리는 Server Action에서 `requireStaff()` / `requireAdmin()`을 호출하고, 갱신 결과가 0행이면 권한 없음으로 처리한다. `patrol_logs` / `patrol_drafts`는 테이블 직접 insert를 하지 않는다. 자세한 규칙은 PRD의 "자동 저장 규칙"과 "데이터 접근 규칙"을 따른다.
- **영업일·시각**: 영업일은 완료 시각 기준 매일 04:00(KST) 경계이며 DB(`private.business_date_of()`)가 기준이다. TypeScript(`lib/business-date.ts`)는 화면 표시와 기본 날짜 전용이고 `HH:mm` 표시와 함께 항상 `timeZone: 'Asia/Seoul'`을 명시한다. 잘못된 `?date`는 리디렉션 없이 현재 영업일을 보여 준다.
- **방치 초안 정리**: `pg_cron`이 30분마다 2시간 이상 지난 **비어 있지 않은** 초안만 빈 값 + `revision + 1`로 초기화한다(행 삭제 없음).
- **복사 문구**: `lib/patrol-format.ts`의 순수 함수가 개행·탭 없는 한 줄을 만든다. 복사는 클릭 핸들러 안에서 `await` 없이 즉시 `navigator.clipboard.writeText`를 호출한다.

## 기술 스택

- **프레임워크**: Next.js 16.4.0 (App Router, `proxy.ts`, `cacheComponents: true`), React 19, TypeScript 5. `next`, `@supabase/ssr`, `@supabase/supabase-js`는 정확한 버전으로 고정하며 업그레이드는 의도적으로 진행한다.
- **백엔드/인증**: Supabase (`@supabase/ssr`, `@supabase/supabase-js`) — 쿠키 기반 세션, Google 로그인과 이메일 가입
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
- `updateSession()`은 `createServerClient`와 `supabase.auth.getClaims()` 사이에 다른 코드를 넣으면 안 되고, 반환하는 `supabaseResponse`를 그대로 돌려줘야 한다(깨지면 사용자가 무작위로 로그아웃됨). 비로그인 사용자는 `/`, `/auth/*`, `/login*` 외 경로 접근 시 `/auth/login`으로 리다이렉트된다. 일지 조회 `/logs*`는 공개 경로로 추가해야 하고, 로그인 리디렉션 시 `next=<pathname+search>`를 붙인다(ROADMAP Task 005, 반영되면 이 설명을 갱신). 공개 경로를 추가하려면 이 조건문을 수정한다. `proxy.ts`는 로그인 여부만 판단하고, 역할 검증은 `lib/auth/dal.ts`의 `requireStaff()` / `requireAdmin()`이 서버에서 하며 순찰 기록·태그 관리 페이지와 모든 Server Action에서 호출한다(레이아웃 검사만으로 끝내지 않는다). 권한이 부족하면 `/logs?notice=<login-required|pending|admin-required>`로 보내고 공통 배너가 문구를 표시한다(`lib/auth/notice.ts`).
- 로그인 후·로그아웃 후 이동 경로는 `/logs`다. 원래 화면으로 돌아가는 `next` 파라미터는 사이트 내부 경로만 허용하는 `getSafeNextPath()`(`lib/auth/safe-next.ts`)로 검증하고 로그인 폼, Google 버튼, `/auth/callback`, `/auth/confirm`이 모두 이 함수를 쓴다. 로그아웃 시 `localStorage`의 `draft:` 백업 키를 모두 지운다.
- Cache Components 환경이므로 쿠키·DB를 읽는 컴포넌트는 `<Suspense>` 경계 안에 두고 로딩 표시를 제공한다. 현재 시각을 읽기 전에는 `await io()`를 호출한다(`node_modules/next/dist/docs` 참고).
- Supabase 클라이언트는 `lib/supabase/client.ts`(브라우저)와 `lib/supabase/server.ts`(서버)로 나뉜다. 서버 클라이언트는 전역 변수에 보관하지 말고 요청마다 `await createClient()`로 만든다.
- `lib/utils.ts`의 `hasEnvVars`는 env 미설정 시 proxy 검사와 일부 UI를 건너뛰는 튜토리얼용 플래그다.
- 이메일 확인은 `app/auth/confirm/route.ts`, 인증 화면은 `app/auth/*`, 로그인 후 영역은 `app/protected/*`다.

### 현재 상태

`components/tutorial/*`, `hero`, `deploy-button` 등은 스타터 템플릿 잔재이며 점차 실제 기능으로 교체 예정이다(`.claude/agents/dev/starter-cleaner.md` 참고). 템플릿 코드를 기준 패턴으로 간주하지 말 것.

## 참고 문서 / 도구

- `docs/PRD.md`(요구사항·데이터 모델·RLS 규칙), `docs/ROADMAP.md`(Phase 0~6, Task 000~026 진행 현황) — 기능 구현 전에 해당 Task와 PRD 절을 먼저 읽는다. PRD와 ROADMAP은 서로 맞춰 유지하며, 한쪽을 바꾸면 다른 쪽도 갱신한다.
  - 별도 `tasks/` 파일은 만들지 않고 ROADMAP의 Task 항목에 직접 기록한다. 완료한 Task만 ✅ 표시와 테스트 결과를 반영하고, 한 Task를 마치면 멈추고 다음 지시를 기다린다.
  - 모든 Task의 완료 조건: `npm run check` 통과, 관련 화면의 Playwright MCP 시나리오 통과, 콘솔 에러·hydration 경고 없음.
  - 테스트 러너가 없으므로 순수 함수는 커밋하지 않는 임시 스크립트(Node 24 `node check.ts`), DB는 Supabase MCP `execute_sql`(트랜잭션 안에서 `set local role` / `request.jwt.claims`로 사용자 흉내 후 `rollback`)과 `get_advisors`, 화면은 Playwright MCP로 검증한다.
  - QA 계정: `qa-admin`, `qa-manager`, `qa-manager2`, `qa-pending`(Task 015에서 준비), 비로그인.
  - 컴포넌트 배치: shadcn은 `components/ui/`(추가는 `npx shadcn@latest add <name>`만 사용), 여러 페이지 공용은 `components/<domain>/`, 한 페이지 전용은 라우트의 `_components/`. import는 `components/ui` ← `components/<domain>` ← `app/` 단방향이다. Phase 3의 더미 데이터(`lib/dummy/*`)는 Phase 5(Task 018·020)에서 삭제한다.
- `docs/guides/` — 프로젝트 구조, 컴포넌트 패턴, 스타일링, Next.js 16, react-hook-form 가이드. 해당 영역 작업 전에 먼저 읽는다.
- `.claude/agents/`(code-reviewer, ui-markup-specialist, development-planner, prd-* 등)와 `.claude/skills/`(git-branch, git-commit, git-pr, supabase)에 프로젝트 전용 에이전트·스킬이 있다. 커밋/PR은 한국어 컨벤셔널 형식(`타입: 제목`)이며, 기본 브랜치는 `main`, 작업 브랜치는 `develop`이다.
- `.mcp.json`에 context7, playwright, sequential-thinking, shrimp-task-manager, supabase MCP 서버가 설정되어 있다.
- 스키마 변경은 `supabase/migrations/`에 `타임스탬프_설명.sql`로 둔다.
