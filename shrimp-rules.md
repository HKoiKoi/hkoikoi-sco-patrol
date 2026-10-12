# Development Guidelines

AI Agent 전용 규칙이다. 일반 개발 지식은 제외하고 이 프로젝트에 한정된 규칙만 적는다.

## 프로젝트 개요

- SCO 순찰 일지 MVP: 30분 간격 순찰을 모바일에서 기록하고 결과를 구글 시트에 한 줄로 붙여넣는 앱.
- 스택: Next.js 16.4.0(App Router, `proxy.ts`, `cacheComponents: true`), React 19, TypeScript 5, Supabase(`@supabase/ssr`), Tailwind v4, shadcn/ui.
- 기준 문서: `docs/PRD.md`(요구사항), `docs/ROADMAP.md`(Task 000~026). **코드와 문서가 충돌하면 PRD를 먼저 확인한다.**
- 모든 사용자 대상 문구, 커밋, PR, 문서는 한국어로 쓴다.

## 작업 시작 전 필수 확인

- 기능 구현 전에 ROADMAP의 해당 Task와 PRD의 해당 절을 읽는다.
- Next.js 코드를 작성하기 전에 `node_modules/next/dist/docs/`의 관련 문서를 읽는다. **기억에 의존하지 않는다.**
- 영역별 가이드를 먼저 읽는다: `docs/guides/project-structure.md`, `component-patterns.md`, `styling-guide.md`, `nextjs-16.md`, `forms-react-hook-form.md`.
- 한 Task를 마치면 **멈추고 다음 지시를 기다린다.** 다음 Task를 자동으로 시작하지 않는다.

## 디렉터리 구조

| 경로                       | 용도                                                                  |
| -------------------------- | --------------------------------------------------------------------- |
| `app/`                     | 라우트. `src/` 없음. alias는 `@/*` → `./*`                            |
| `app/logs`                 | 일지 조회(공개, 기본 진입)                                            |
| `app/protected/patrol`     | 순찰 기록(manager, admin)                                             |
| `app/protected/admin/tags` | 퀵 태그 관리(admin)                                                   |
| `app/auth/*`               | 인증 화면과 `callback`, `confirm` 라우트                              |
| `components/ui/`           | shadcn 기본 컴포넌트                                                  |
| `components/<domain>/`     | 여러 페이지 공용 도메인 컴포넌트                                      |
| `<route>/_components/`     | 한 페이지 전용 컴포넌트                                               |
| `lib/supabase/`            | `client.ts`(브라우저), `server.ts`(서버), `proxy.ts`(세션)            |
| `lib/auth/`                | `dal.ts`(`requireStaff`, `requireAdmin`), `safe-next.ts`, `notice.ts` |
| `lib/business-date.ts`     | 영업일 표시·기본 날짜 전용                                            |
| `lib/patrol-format.ts`     | 복사 문구 순수 함수                                                   |
| `lib/dummy/*`              | Phase 3 더미 데이터. Task 018·020에서 삭제                            |
| `supabase/migrations/`     | 스키마 변경 전용                                                      |

- import 방향은 `components/ui` ← `components/<domain>` ← `app/` 단방향이다. **역방향 import 금지.**
- `components/tutorial/*`, `hero`, `deploy-button`, `next-logo`, `supabase-logo` 등은 스타터 잔재다. **기준 패턴으로 삼지 않고 새 코드에서 import하지 않는다.**

## 코드 규칙

- 경로는 `@/` alias를 쓴다.
- shadcn 컴포넌트는 `npx shadcn@latest add <name>`으로만 추가한다. **`components/ui/`에 직접 새 파일을 작성하지 않는다.**
- Tailwind v4: `tailwind.config.ts`를 만들지 않는다. 테마는 `app/globals.css`의 `@theme`에서 수정한다.
- 클래스 병합은 `lib/utils.ts`의 `cn()`을 쓴다.
- 세그먼트 설정 `dynamic` / `revalidate` / `runtime`을 쓰지 않는다.
- `next`, `@supabase/ssr`, `@supabase/supabase-js`는 정확한 버전으로 고정되어 있다. **`^`, `~`를 붙이거나 임의로 업그레이드하지 않는다.**
- `--no-verify`로 hook을 우회하지 않는다. hook 실패 시 원인을 고친다.

## Cache Components 규칙

- 쿠키, DB, `searchParams`, 현재 시각을 읽는 컴포넌트는 `<Suspense>` 안에 두고 fallback을 제공한다.
- 현재 시각을 읽기 전에 `await io()`를 호출한다.
- 서버 Supabase 클라이언트는 전역에 보관하지 않고 요청마다 `await createClient()`로 만든다.

## 인증·세션 규칙

- 세션 갱신은 `proxy.ts` → `lib/supabase/proxy.ts`의 `updateSession()`이 한다. `middleware.ts`를 만들지 않는다.
- `updateSession()`에서 `createServerClient`와 `supabase.auth.getClaims()` 사이에 코드를 넣지 않는다. 반환하는 `supabaseResponse`를 그대로 돌려준다.
- 비로그인 허용 경로: `/`, `/auth/*`, `/login*`, 그리고 `/logs*`(Task 005에서 추가). 공개 경로 추가는 `lib/supabase/proxy.ts`의 조건문만 수정한다. 로그인 리디렉션에는 `next=<pathname+search>`를 붙인다.
- `proxy.ts`는 로그인 여부만 판단한다. **역할 검증은 `requireStaff()` / `requireAdmin()`이 서버에서 한다.** 순찰 기록·태그 관리 페이지와 모든 Server Action에서 호출하고 레이아웃 검사만으로 끝내지 않는다.
- 권한 부족 시 `/logs?notice=<login-required|pending|admin-required>`로 보낸다. 문구는 `lib/auth/notice.ts`에서만 관리한다.
- `next` 파라미터는 반드시 `getSafeNextPath()`(`lib/auth/safe-next.ts`)로 검증한다. 로그인 폼, Google 버튼, `/auth/callback`, `/auth/confirm` 모두 이 함수를 쓴다.
- 로그인·로그아웃 후 이동 경로는 `/logs`다. 로그아웃 시 `localStorage`의 `draft:` 키를 모두 지운다.
- `role`은 앱에서 변경할 수 없다. 신규 가입자는 모두 `pending`이고 승격은 Supabase 대시보드에서 수동 처리한다. **역할 변경 UI/API를 만들지 않는다.**

## 권한·DB 접근 규칙

- 최종 방어선은 DB(RLS, 컬럼 GRANT, RPC 내부 역할 검사)다. 화면의 버튼 숨김은 편의일 뿐이다.
- 버튼 노출 판정은 `lib/permissions.ts`의 함수 하나로만 한다. UI 컴포넌트는 `viewer` prop만 받고 역할을 직접 비교하지 않는다.
- 초안 저장·순찰 완료: `save_patrol_draft` / `complete_patrol` RPC만 사용하고 **브라우저 Supabase 클라이언트에서 직접 호출**한다.
  - 응답 `status`는 `ok` / `duplicate` / `conflict`. `revision` 기반 충돌 감지, 요청 ID 멱등.
  - `patrol_logs` / `patrol_drafts`에 테이블 직접 insert를 하지 않는다.
- 기록 수정·삭제, 자리비움 처리, 퀵 태그 관리: Server Action에서 `requireStaff()` / `requireAdmin()`을 호출한다. 갱신 결과가 0행이면 권한 없음으로 처리한다.
- 역할 요약: 비로그인·`pending`은 조회만, `manager`는 작성과 본인 기록 수정·삭제, `admin`은 타인 기록 수정·삭제와 퀵 태그 관리.
- 스키마 변경은 `supabase/migrations/타임스탬프_설명.sql`로만 한다. 기존 마이그레이션 파일을 수정하지 않는다.
- 기존 `profiles` 마이그레이션은 스타터 구조(`username`, `website`, 전체 공개 조회)이며 Task 012에서 재정비한다. 이 구조를 확장 기준으로 삼지 않는다.
- 새 테이블·함수 작성 전에 `supabase` 스킬과 `supabase-postgres-best-practices` 스킬을 읽는다. 변경 후 `get_advisors`로 보안 경고를 확인한다.

## 영업일·시각 규칙

- 영업일 경계는 완료 시각 기준 매일 04:00 KST이며 **DB의 `private.business_date_of()`가 기준**이다.
- `lib/business-date.ts`는 화면 표시와 기본 날짜 전용이다. 영업일을 TypeScript에서 판정해 DB에 저장하지 않는다.
- 시각 포맷(`HH:mm`, 날짜)은 항상 `timeZone: 'Asia/Seoul'`을 명시한다. 서버·클라이언트 모두 동일하다.
- 잘못된 `?date`는 리디렉션 없이 현재 영업일을 보여 준다.

## 자동 저장·복사 규칙

- 자동 저장은 약 1초 디바운스 후 `save_patrol_draft`를 호출한다. `revision`을 항상 전달하고 `conflict` 응답을 처리한다.
- `pg_cron`이 30분마다 2시간 이상 지난 **비어 있지 않은** 초안만 빈 값 + `revision + 1`로 초기화한다. **초안 행을 삭제하지 않는다.**
- 복사 문구는 `lib/patrol-format.ts`의 순수 함수로만 만든다. 개행·탭이 없는 한 줄이어야 한다. 형식: `HH:mm 순찰 → 완료 (상세)`.
- 복사는 클릭 핸들러 안에서 **`await` 없이 즉시** `navigator.clipboard.writeText`를 호출한다.
- `localStorage` 백업 키는 `draft:` 접두사를 쓴다.

## 파일 연동 규칙

| 변경 대상                       | 함께 수정할 파일                                                  |
| ------------------------------- | ----------------------------------------------------------------- |
| `docs/PRD.md`                   | `docs/ROADMAP.md` (둘을 항상 맞춘다)                              |
| `docs/ROADMAP.md`의 요구사항    | `docs/PRD.md`                                                     |
| 공개/보호 경로 추가             | `lib/supabase/proxy.ts`, `CLAUDE.md`의 인증 흐름 설명             |
| 권한 문구/notice 추가           | `lib/auth/notice.ts`, 공통 배너 컴포넌트                          |
| 새 `package.json` 스크립트·도구 | `CLAUDE.md`의 명령어 절                                           |
| DB 스키마·RPC 변경              | `supabase/migrations/`, 생성 타입(Task 015 이후), PRD 데이터 모델 |
| 로그인 이동 로직                | 로그인 폼, Google 버튼, `/auth/callback`, `/auth/confirm` 모두    |
| Task 완료                       | ROADMAP에 ✅와 테스트 결과 반영                                   |

- 별도 `tasks/` 파일을 만들지 않는다. Task는 ROADMAP의 항목에 직접 기록한다.
- 새 Task의 체크박스는 비워 두고 `테스트 결과`는 `(미수행)`으로 둔다. 완료한 Task만 ✅를 표시한다.
- API/비즈니스 로직 Task에는 정상/오류/엣지로 나눈 테스트 체크리스트를 `도구 → 입력 → 기대 결과` 형식으로 포함한다.

## 검증 규칙

- 테스트 러너는 없다. 도구를 새로 설치하지 않는다.
  - 순수 함수: 커밋하지 않는 임시 스크립트(Node 24 `node check.ts`)로 확인한다. 임시 파일은 scratchpad에 둔다.
  - DB: Supabase MCP `execute_sql`을 트랜잭션 안에서 `set local role` / `request.jwt.claims`로 사용자 흉내를 낸 뒤 `rollback`한다. `get_advisors`를 함께 실행한다.
  - 화면: Playwright MCP로 시나리오를 실행한다.
- 모든 Task 완료 조건: `npm run check` 통과, 관련 화면의 Playwright 시나리오 통과, 콘솔 에러·hydration 경고 없음.
- QA 계정: `qa-admin`, `qa-manager`, `qa-manager2`, `qa-pending`, 비로그인. Task 015 이전에는 존재하지 않는다. Task 012~014의 SQL 시나리오에서는 트랜잭션 안에서 만든 임시 사용자를 쓴다.
- Prettier는 `.claude/hooks/format-hook.sh`가 Edit/Write 후 자동 적용한다. 수동 포맷으로 충돌시키지 않는다.

## Git 규칙

- 커밋·PR 제목은 한국어 컨벤셔널 형식 `타입: 제목`. 커밋/PR은 `git-commit`, `git-pr` 스킬을 쓴다.
- 기본 브랜치 `main`, 작업 브랜치 `develop`. 브랜치 작업은 `git-branch` 스킬을 쓴다.
- 사용자가 요청하지 않으면 커밋·푸시하지 않는다.

## AI 의사결정 기준

- 요구사항이 모호하다 → PRD → ROADMAP 순으로 확인하고, 그래도 불명확하면 PRD 기준으로 구현하고 가정을 보고한다.
- 권한 판정을 어디에 둘지 고민된다 → DB(RLS/GRANT/RPC)에 먼저 두고 UI는 `lib/permissions.ts`로 반영한다.
- 컴포넌트를 어디에 둘지 고민된다 → 한 페이지 전용이면 `_components/`, 여러 페이지면 `components/<domain>/`, shadcn 기본이면 `components/ui/`.
- 시각·영업일이 필요하다 → 저장·판정은 DB, 표시는 `lib/business-date.ts`.
- 스타터 템플릿 코드와 PRD가 충돌한다 → PRD를 따르고 템플릿 코드는 교체 대상으로 취급한다.

## 금지 사항

- ❌ `middleware.ts` 생성
- ❌ `updateSession()` 내부 순서 변경, `supabaseResponse` 대체 반환
- ❌ 페이지/Server Action에서 `requireStaff()` / `requireAdmin()` 생략
- ❌ `patrol_logs` / `patrol_drafts` 직접 insert, `role` 컬럼 앱에서 수정
- ❌ Server Action으로 초안 저장·순찰 완료 구현
- ❌ 복사 핸들러에서 `await` 후 `clipboard.writeText` 호출
- ❌ `timeZone` 없는 `toLocaleTimeString` / `Intl.DateTimeFormat`
- ❌ `<Suspense>` 없이 쿠키·DB·시각 읽기
- ❌ 방치 초안 정리에서 행 삭제
- ❌ 의존성 버전 범위 지정 또는 임의 업그레이드
- ❌ `tailwind.config.ts`, `tasks/` 디렉터리 생성
- ❌ 한 Task 완료 후 지시 없이 다음 Task 진행
- ❌ `--no-verify` 사용
