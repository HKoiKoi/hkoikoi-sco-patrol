# SCO 순찰 일지 MVP 개발 로드맵

30분 간격 순찰을 스마트폰/태블릿에서 최소 터치로 기록하고, 결과를 구글 스프레드시트에 한 줄로 붙여넣게 하는 순찰 일지 웹앱.

## 개요

SCO 순찰 일지는 SCO 관리형 독서실에서 순찰하는 매니저와 이를 관리하는 관리자를 위한 앱입니다. 순찰 입력, 자동 저장, 확정, 복사를 한 화면에서 처리하며 다음 기능을 제공합니다.

- **순찰 기록 작성 (F02, F03, F04)**: 좌석 상태 4종(스탠딩/카페존/졸음·딴짓/자리비움)을 숫자 키패드와 칩으로 입력하고, 퀵 태그와 자유 메모를 함께 기록
- **자동 저장과 순찰 완료 (F05, F07)**: 약 1초 디바운스로 서버 초안에 저장(`revision` 기반 충돌 방지)하고, 멱등 완료 RPC로 서버 시각 기준 확정 기록 생성(영업일 경계 04:00 KST)
- **결과 복사 (F06)**: `HH:mm 순찰 → 완료 (상세)` 형식의 한 줄 문자열을 클립보드에 복사
- **일지 조회와 사후 정정 (F08, F09, F10)**: 로그인 없이 영업일별 전체 타임라인을 열람하고, 권한자는 기록 수정/삭제와 자리비움 번호 이동/삭제
- **인증과 역할 (F01)**: Google/이메일 로그인, `pending` → `manager`/`admin` 승인 기반 운영
- **퀵 태그 관리 (F11)**: 관리자가 태그 추가/수정/순서 변경/노출 전환/삭제

### 기술 스택 요약

- Next.js 16.4.0 (App Router, `proxy.ts`, `cacheComponents: true`), React 19, TypeScript 5
- Supabase (`@supabase/ssr` 0.12.7, `@supabase/supabase-js` 2.117.3) — Auth, Postgres(RLS, RPC, `pg_cron`)
- Tailwind CSS v4, shadcn/ui + Radix UI, lucide-react, next-themes
- 검증 도구: `npm run typecheck`, `npm run lint`, `npm run check`, `npm run build`, Playwright MCP, Supabase MCP(`execute_sql`, `get_advisors`). 테스트 러너는 없다.

## 개발 워크플로우

1. **작업 계획**
   - 기존 코드베이스를 학습하고 현재 상태를 파악
   - 새로운 작업을 포함하도록 `ROADMAP.md` 업데이트
   - 우선순위 작업은 마지막 완료된 작업 다음에 삽입

2. **작업 생성**
   - 기존 코드베이스를 학습하고 현재 상태를 파악
   - 별도 작업 파일(`tasks/`)은 만들지 않고 ROADMAP.md의 Task 항목에 직접 작성(추후 shrimp task manager로 이관)
   - 고수준 명세서, 관련 파일, 수락 기준, 구현 사항 포함
   - **API/비즈니스 로직 작업 시 "테스트 체크리스트"를 정상/오류/엣지로 나눠 필수 포함 (Playwright MCP 테스트 시나리오를 `도구 → 입력 → 기대 결과` 형식으로 작성)**
   - 새 작업의 체크박스는 비워 두고 `테스트 결과` 줄은 `(미수행)`으로 둔다. 완료된 작업만 체크 표시와 결과 요약을 반영한다.

3. **작업 구현**
   - ROADMAP.md의 Task 명세를 따름
   - 기능과 기능성 구현
   - **API 연동 및 비즈니스 로직 구현 시 Playwright MCP로 테스트 수행 필수**
   - 각 단계 후 ROADMAP.md의 Task 진행 상황 업데이트
   - 구현 완료 후 Playwright MCP를 사용한 E2E 테스트 실행
   - 테스트 통과 확인 후 다음 단계로 진행
   - 각 단계 완료 후 중단하고 추가 지시를 기다림

4. **로드맵 업데이트**
   - 로드맵에서 완료된 작업을 ✅로 표시

### 공통 규약 (모든 Task에 적용)

- **Next.js 16**: 구현 전 `node_modules/next/dist/docs/`의 관련 문서를 먼저 읽는다(특히 `authentication-with-cache-components.md`, `04-functions/io.md`, `server-actions.md`, `16-proxy.md`). 세그먼트 설정 `dynamic`/`revalidate`/`runtime`은 쓰지 않는다.
- **Cache Components**: 쿠키·DB·`searchParams`·현재 시각을 읽는 컴포넌트는 `<Suspense>` 안에 두고 로딩 표시(fallback)를 제공한다.
- **컴포넌트 배치**: `docs/guides/project-structure.md`를 따른다. shadcn 기본 컴포넌트는 `components/ui/`(추가는 `npx shadcn@latest add <name>`만 사용, 직접 작성 금지), 여러 페이지 공용 도메인 컴포넌트는 `components/<domain>/`, 한 페이지 전용은 라우트의 `_components/`. import 방향은 `components/ui` ← `components/<domain>` ← `app/`의 단방향으로 유지한다(역방향 import 금지).
- **Supabase**: 서버 클라이언트는 요청마다 `await createClient()`. `lib/supabase/proxy.ts`의 `createServerClient`와 `getClaims()` 사이에 코드를 넣지 않고 `supabaseResponse`를 그대로 반환한다. 스키마 변경은 `supabase/migrations/타임스탬프_설명.sql`로만 한다.
- **권한**: 화면의 버튼 숨김은 편의일 뿐이며 최종 방어선은 RLS/GRANT와 RPC 내부 역할 검사다. 페이지와 **모든 Server Action**에서 `requireStaff()`/`requireAdmin()`을 호출한다. 화면의 버튼 노출 판정은 `lib/permissions.ts`(Task 004)의 함수 하나로만 하고, UI 컴포넌트는 `viewer` prop만 받는다.
- **시각**: 서버·클라이언트 모두 `timeZone: "Asia/Seoul"`을 명시한다. 영업일의 기준은 DB(완료 RPC)다.
- **완료 판정 공통 조건**: `npm run check`(typecheck + lint + format:check) 통과, 관련 화면의 Playwright MCP 시나리오 통과, 콘솔 에러/hydration 경고 없음.

### 테스트 계정 (Task 015에서 준비)

| 계정          | 역할      | 용도                                  |
| ------------- | --------- | ------------------------------------- |
| `qa-admin`    | `admin`   | 퀵 태그 관리, 타인 기록 수정/삭제     |
| `qa-manager`  | `manager` | 순찰 작성, 본인 기록 수정/삭제        |
| `qa-manager2` | `manager` | 타인 기록 권한 거부 확인, 다기기 충돌 |
| `qa-pending`  | `pending` | 승인 대기 안내, 작성/관리 차단        |
| (비로그인)    | -         | 공개 열람, 로그인 안내, 리디렉션 확인 |

- Task 015 이전(Phase 1~3, Task 012~014)에는 QA 계정이 없다. Phase 1~3은 임의 로그인 계정이나 더미 viewer로 확인하고, Task 012~014의 SQL 시나리오에 나오는 `qa-*`는 트랜잭션 안에서 만든 같은 역할의 임시 사용자를 뜻한다.

## 기능 ID ↔ Task 매핑

| 기능 ID | 기능명              | 관련 Task                                                  |
| ------- | ------------------- | ---------------------------------------------------------- |
| F01     | 인증 및 역할        | 000, 001, 005, 006, 010, 011, 012, 016, 017, 018, 023, 024 |
| F02     | 좌석 상태 입력      | 002, 004, 008, 011, 013, 020                               |
| F03     | 퀵 태그             | 008, 011, 013, 020, 022                                    |
| F04     | 특이사항 메모       | 004, 008, 011, 013, 020                                    |
| F05     | 순찰 완료           | 003, 008, 011, 014, 021, 023                               |
| F06     | 결과 복사           | 004, 007, 008, 011, 018, 021, 023, 024                     |
| F07     | 자동 저장/초안 복원 | 002, 008, 011, 013, 014, 015, 020, 023, 024                |
| F08     | 일지 타임라인 조회  | 003, 007, 011, 012, 013, 018, 023                          |
| F09     | 기록 수정/삭제      | 004, 007, 011, 013, 019, 023                               |
| F10     | 자리비움 사후 처리  | 004, 007, 011, 013, 019, 023                               |
| F11     | 퀵 태그 관리        | 004, 009, 011, 013, 014, 022, 023                          |

## Task 의존성 요약

```
Phase 0 (완료)
  └─ Phase 1: 001 골격 → 002 타입(RPC 응답 유니온 포함)
                        │
  Phase 2 (공통 모듈, DB 독립): 003 영업일 · 004 문구/좌석/태그/권한 판정 · 005 safe-next·notice·/logs 공개   (002 이후 병렬)
                        │
  Phase 3 (UI, 더미): 006 레이아웃 → 007 /logs · 008 /patrol(가짜 어댑터) · 009 /admin/tags · 010 로그인  (병렬)
                        → 011 UI 검토·보완, PRD·데이터 모델 확정  (Phase 4 진입 관문)
                        │
  Phase 4 (DB): 012 profiles·역할 → 013 테이블·RLS → 014 RPC → 015 cron·타입 생성·QA 계정 → 016 DAL
                        │
  Phase 5 (기능): 017 인증 흐름 → 018 조회 → 019 수정/자리비움
                                → 020 자동 저장(가짜 어댑터 교체, lib/dummy 삭제) → 021 완료/복사
                                → 022 태그 관리 → 023 통합 테스트
                        │
  Phase 6: 024 실기기·환경 검증 · 025 품질/성능/보안 · 026 배포
```

- Phase 2·3은 DB 없이 Task 002의 타입 계약만으로 진행한다. Phase 2의 세 Task는 서로 병렬로 진행할 수 있고, Phase 3의 Task 007~010은 Task 006 이후 병렬로 진행할 수 있다.
- Phase 4는 Task 011에서 UI 검토가 끝나고 PRD·데이터 모델이 확정된 뒤 시작한다. 확정 과정에서 요구사항이 바뀌면 PRD를 먼저 고치고 Task 012~016 명세를 갱신한다.
- Phase 5는 Phase 4가 끝난 뒤 시작한다. Task 017은 Task 016 직후 바로 시작해도 된다.

## 개발 단계

### Phase 0: 기반 환경 구축 ✅

- **Task 000: 스타터 기반 환경 및 Google 로그인 구축** ✅ - 완료
  - 관련 기능: F01(일부)
  - ✅ Next.js 16 + Supabase 스타터 생성, `proxy.ts` 기반 세션 갱신, `cacheComponents: true`
  - ✅ `profiles` 테이블 마이그레이션(`20261012060813_create_profiles_table.sql`, `20261012060832_restrict_profiles_grants.sql`) — 스타터 구조(`username`, `website`, 전체 공개 조회 정책)이며 Task 012에서 재정비
  - ✅ Google 소셜 로그인(`components/google-login-button.tsx`, `app/auth/callback/route.ts`의 내부 경로 검증) 및 이메일 로그인/가입(스타터 폼)
  - ✅ ESLint 9 flat config, Prettier, Husky(pre-commit lint-staged, pre-push typecheck), Claude 포맷 hook
  - ✅ MCP 설정(context7, playwright, sequential-thinking, shrimp-task-manager, supabase), 개발 가이드(`docs/guides/`)
  - ✅ `next` 16.4.0, `@supabase/ssr` 0.12.7, `@supabase/supabase-js` 2.117.3 정확한 버전 고정(작업 트리 반영, 커밋 필요)
  - 테스트 결과: Google 로그인 후 `/protected` 진입 확인(기존 PR #2). 이후 리디렉션 대상은 Task 017에서 `/logs`로 변경

### Phase 1: 애플리케이션 골격 구축

- **Task 001: 스타터 잔재 정리 및 라우트 골격 생성** ✅ - 완료
  - 관련 기능: F01, F08 (구조)
  - 설명: 스타터 데모 화면을 걷어내고 PRD의 4개 페이지 라우트를 빈 껍데기로 만든다. `.claude/agents/dev/starter-cleaner.md` 지침을 참고한다.
  - 관련 파일: `app/page.tsx`, `app/protected/page.tsx`, `app/protected/layout.tsx`, `app/layout.tsx`, `app/logs/page.tsx`(신규), `app/protected/patrol/page.tsx`(신규), `app/protected/admin/tags/page.tsx`(신규), `components/tutorial/*`, `components/hero.tsx`, `components/deploy-button.tsx`, `components/next-logo.tsx`, `components/supabase-logo.tsx`
  - 구현 사항:
    - ✅ `components/tutorial/*`, `hero`, `deploy-button`, `next-logo`, `supabase-logo` 삭제 및 참조 제거(`env-var-warning`은 개발 편의용으로 유지 여부 판단)
    - ✅ `app/page.tsx`(`/`)와 `app/protected/page.tsx`(`/protected`)를 `redirect("/logs")`로 교체
    - ✅ `app/logs/page.tsx`, `app/protected/patrol/page.tsx`, `app/protected/admin/tags/page.tsx` 빈 페이지 생성(제목과 `<Suspense>` 자리만)
    - ✅ `app/protected/layout.tsx`의 스타터 nav/footer 제거(공통 레이아웃은 Task 006에서 구현)
    - ✅ `app/layout.tsx`: `lang="ko"`, 메타데이터(`title: "SCO 순찰 일지"`, 설명), 모바일 viewport 확인
  - 완료 기준: 4개 경로가 빈 페이지로 렌더링되고 `/`, `/protected`가 `/logs`로 이동한다. 스타터 컴포넌트 import가 남아 있지 않다(`grep -r "tutorial\|DeployButton\|Hero" app components` 결과 없음). `npm run check`, `npm run build` 통과.
  - 테스트 체크리스트:
    - 정상: `browser_navigate → / → URL이 /logs로 바뀜`
    - 정상: `browser_navigate → /protected (임의 로그인 계정) → /logs로 이동`
    - 오류: `browser_navigate → /protected/patrol (비로그인) → /auth/login으로 이동(현 proxy 동작 유지)`
    - 엣지: `browser_console_messages → 각 페이지 로드 → 에러·hydration 경고 없음`
  - 테스트 결과: 구현 완료(커밋 `2a0fe02`). Phase 1 통합 검증(2026-10-12): `npm run check` 통과(기존 `components/google-login-button.tsx`의 Prettier 줄바꿈 1건만 수정), `npm run build` 통과, `grep -r "tutorial\|DeployButton\|Hero" app components` 결과 없음. Playwright: `/` → `/logs` 이동, 비로그인 `/protected/patrol` → `/auth/login` 이동, `/logs` 렌더링 확인, 세 페이지 콘솔 에러·경고 0. 로그인 계정으로 `/protected` → `/logs` 이동은 사용자가 직접 확인(통과)

- **Task 002: 도메인 타입 및 인터페이스 정의** ✅ - 완료
  - 관련 기능: F01~F11 (타입 계약)
  - 설명: DB 스키마와 RPC 응답을 TypeScript 타입으로 먼저 정의해 UI 작업(Phase 3)과 DB 작업(Phase 4)이 같은 계약을 쓰도록 한다. Phase 3의 더미 데이터와 가짜 어댑터는 이 타입으로만 작성하고, Task 015에서 생성한 DB 타입과 교차 확인한다.
  - 관련 파일: `lib/types/patrol.ts`(신규), `lib/types/auth.ts`(신규)
  - 구현 사항:
    - ✅ `Role = "pending" | "manager" | "admin"`, `Viewer`(비로그인 | `{ userId, fullName, role }`) 타입
    - ✅ `SeatCategory = "standing" | "cafe_zone" | "drowsy" | "away"`, `SeatSet`(카테고리별 `number[]`), `PatrolContent = SeatSet & { memo: string }`
    - ✅ `PatrolLog`(id, businessDate, patrolledAt, authorId, authorName, 좌석 4종, memo), `PatrolDraft`(revision, updatedAt, content), `QuickTag`(id, label, sortOrder, isActive)
    - ✅ RPC 응답 판별 유니온: `SaveDraftResult = { status: "ok"; revision } | { status: "conflict"; serverRevision; serverDraft }`, `CompletePatrolResult = { status: "ok" | "duplicate"; logId; patrolledAt; revision } | { status: "conflict"; serverRevision }`
    - ✅ Server Action 공통 결과 타입 `ActionResult<T> = { ok: true; data: T } | { ok: false; error: string }`
    - ✅ 로컬 백업 타입 `DraftBackup = { revision; savedAt; payload: PatrolContent }`
  - 완료 기준: 타입 파일이 런타임 코드 없이 export되고 `npm run typecheck` 통과. PRD 데이터 모델의 모든 필드가 타입에 대응된다.
  - 테스트 체크리스트:
    - 정상: `npm run typecheck → 타입 파일 추가 → 에러 0`
    - 엣지: 유니온 분기에서 `switch (result.status)`의 `never` 검사로 누락 분기 컴파일 에러 확인
  - 테스트 결과: `npm run typecheck` 에러 0, `npm run lint` 통과. 임시 파일에서 `switch (result.status)` + `never` 검사로 `SaveDraftResult`의 `conflict` 분기를 빼면 TS2322 컴파일 에러가 나는 것을 확인하고 파일 삭제. 비로그인 `Viewer`는 `null`로 표현, `client_request_id`는 `PatrolLog`에서 제외(요청 입력 타입은 RPC 호출 Task에서 추가). Phase 1 통합 검증(2026-10-12): `npm run check`·`npm run build` 통과, 코드 리뷰에서 PRD 데이터 모델·RPC 응답과 일치, `lib/types`에 런타임 코드 없음 확인

### Phase 2: 공통 모듈 구현 (DB 독립)

> 순수 함수 검증은 테스트 러너 대신 스크래치 디렉터리의 임시 스크립트(Node 24 타입 스트리핑, `node check.ts`)로 PRD 표의 케이스를 assert 한 뒤 삭제한다. 스크립트는 커밋하지 않는다. 이 Phase의 Task는 DB 스키마에 의존하지 않는다.

- ✅ **Task 003: 영업일·시각 유틸리티 구현 (`lib/business-date.ts`)**
  - 관련 기능: F05, F08
  - 설명: 화면 표시와 날짜 이동 기본값용 영업일 계산. 서버 기본 시간대에 의존하지 않고 `Asia/Seoul`을 명시한다(최종 기준은 DB).
  - 관련 파일: `lib/business-date.ts`
  - 구현 사항:
    - [x] `getBusinessDate(at: Date): string` — `Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" })`로 `at - 4h`의 KST 날짜를 `YYYY-MM-DD`로 반환
    - [x] `parseBusinessDateParam(value: string | string[] | undefined): string | null` — `^\d{4}-\d{2}-\d{2}$` 형식과 실제 존재 날짜(2월 30일 등 거부) 검증
    - [x] `shiftBusinessDate(date: string, days: number): string` — UTC 기준 날짜 산술로 월말·연말 처리
    - [x] `formatKstTime(iso: string): string` — `HH:mm`, `hourCycle: "h23"`, `timeZone: "Asia/Seoul"`(서버·클라이언트 동일 결과)
    - [x] `formatBusinessDateLabel(date)` — 화면용 `YYYY. MM. DD (요일)` 표기
  - 완료 기준: PRD 영업일 경계표 7건과 날짜 파싱/이동 케이스를 임시 스크립트로 모두 통과. `TZ=UTC`와 `TZ=America/New_York` 환경에서 같은 결과.
  - 테스트 체크리스트:
    - 정상: 경계표 7건 (예: `2026-10-12T03:59:59+09:00 → 2026-10-11`, `04:00:00 → 2026-10-12`)
    - 오류: `parseBusinessDateParam("2026-13-40") → null`, `"2026-02-30" → null`, `"20261012" → null`, 배열 입력 → null
    - 엣지: `shiftBusinessDate("2026-12-31", 1) → "2027-01-01"`, `("2028-03-01", -1) → "2028-02-29"`
    - 엣지: `formatKstTime("2026-10-11T15:05:00Z") → "00:05"`(`24:05` 아님)
  - 테스트 결과: 임시 스크립트(Node 24 `node check.ts`, 커밋 안 함) 21케이스 통과 — 경계표 7건, 파싱 6건(정상 2·오류 4), 이동 3건, formatKstTime 2건, 라벨 2건 + `TZ=UTC`·`TZ=America/New_York` 2종 모두 동일 결과. `npm run check`(typecheck·lint·format:check) 통과.

- ✅ **Task 004: 복사 문구·좌석·태그 문구·권한 판정 순수 함수 구현**
  - 관련 기능: F02, F04, F06, F09, F10, F11
  - 설명: 복사 문구 생성(`lib/patrol-format.ts`)과 클라이언트·서버가 공유하는 입력 정규화 함수, 화면의 버튼 노출에 쓰는 권한 판정 함수를 만든다.
  - 관련 파일: `lib/patrol-format.ts`, `lib/seat-numbers.ts`, `lib/quick-tag-label.ts`, `lib/permissions.ts`
  - 구현 사항:
    - [x] `formatPatrolLine({ patrolledAt, memo, drowsy }): string` — `HH:mm 순찰 → 완료[ (상세)]`. 메모를 `\r\n`/`\n`으로 분리, 탭·전각 공백(U+3000)을 공백 한 칸으로, 각 줄 트림, 빈 줄 제거 후 `", "` 연결. 졸음/딴짓 오름차순 `", "` 연결 + `"번 졸아서 깨움"`. 스탠딩·카페존·자리비움 미포함. 결과에 개행·탭 없음 보장
    - [x] `lib/seat-numbers.ts`: `parseSeatInput(text): number | null`(양의 정수만, 상한 없음), `addSeat(list, n)`(카테고리 내 중복 거부 결과 반환), `removeSeat`, `normalizeSeats(list)`(정렬·중복 제거), `moveAwaySeat(seats, n, target)`(대상에 이미 있으면 자리비움에서 제거만)
    - [x] `lib/quick-tag-label.ts`: `normalizeTagLabel`(트림, 연속 공백 한 칸), `tagLabelKey`(소문자화), `validateTagLabel`(필수, 개행 불가) — DB 유일 인덱스 규칙과 일치
    - [x] 메모 최대 길이 상수 `MEMO_MAX_LENGTH = 2000` 공유
    - [x] `lib/permissions.ts`: `canEdit(log, viewer)`(로그인 + 역할이 `manager`/`admin`이고 `log.authorId === viewer.userId`, 또는 `admin`이면 true. `pending`·비로그인은 false), `canWrite(viewer)`(`manager`/`admin`), `isAdmin(viewer)`. Task 002 `PatrolLog`·`Viewer` 타입만 사용하며 화면의 버튼 노출 판정은 이 함수들로만 한다(최종 방어선은 RLS)
  - 완료 기준: PRD "복사 문구 형식" 표 6건이 정확히 일치. 좌석·태그·권한 규칙 케이스 통과.
  - 테스트 체크리스트:
    - 정상: PRD 표 #1~#6 입력 → 기대 출력과 문자열 완전 일치
    - 엣지: 메모 `"  a\t b \r\n\r\n　c  "` → `a b, c`(탭·전각 공백 처리, 빈 줄 제거)
    - 엣지: 졸음/딴짓 `[35, 12]` → `12, 35번 졸아서 깨움`
    - 오류: `parseSeatInput("0")`, `("-3")`, `("1.5")`, `("")` → null / `("0012") → 12`
    - 엣지: `moveAwaySeat({away:[5], standing:[5]}, 5, "standing") → away [], standing [5]`
    - 오류: `validateTagLabel("  ")` 실패, `("a\nb")` 실패 / `tagLabelKey(" 화장실  정리 ") === tagLabelKey("화장실 정리")`
    - 정상: `canEdit(본인 기록, manager) → true`, `canEdit(타인 기록, admin) → true`
    - 오류: `canEdit(타인 기록, manager) → false`, `canEdit(본인 기록, pending) → false`, `canEdit(기록, null) → false`
  - 테스트 결과: 임시 스크립트(Node 24 `node check.ts`, 커밋 안 함) 44케이스 통과 — PRD 복사 문구 표 6건, 메모 공백·탭·전각 공백·줄바꿈 엣지, 좌석 파싱·추가·이동, 태그 문구, 권한 판정 + `TZ=UTC`·`TZ=America/New_York` 동일 결과. `npm run check`(typecheck·lint·format:check) 통과.

- ✅ **Task 005: 내부 경로 검증·안내 문구·`/logs` 공개 경로 설정**
  - 관련 기능: F01
  - 설명: 공통 `next` 검증 함수와 권한 안내(`notice`) 문구 매핑을 만들고, `proxy`의 공개 경로에 `/logs*`를 추가한다. 역할 조회가 필요한 DAL(`getViewer`/`requireStaff`/`requireAdmin`)은 DB 이후 Task 016에서 만든다.
  - 관련 파일: `lib/auth/safe-next.ts`(신규), `lib/auth/notice.ts`(신규), `lib/supabase/proxy.ts`, `app/auth/callback/route.ts`
  - 구현 사항:
    - [x] `getSafeNextPath(value, fallback = "/logs")`: `/`로 시작하고 `//`, `/\`, 스킴(`:`) 포함 경로 거부, 기존 callback의 인라인 검증을 이 함수로 교체
    - [x] `lib/auth/notice.ts`: `notice` 코드(`login-required`, `pending`, `admin-required`)와 한국어 문구 매핑("관리자 승인이 완료되지 않아 작성할 수 없습니다", "관리자 권한이 필요합니다" 등), 알 수 없는 코드는 `null`
    - [x] `lib/supabase/proxy.ts`: 공개 경로 조건에 `/logs` 추가, 로그인 리디렉션 시 `next=<pathname+search>` 부여(`getClaims()` 이후 위치에서만 수정, `supabaseResponse` 반환 규칙 유지). `CLAUDE.md`의 공개 경로 설명 갱신
  - 완료 기준: 비로그인으로 `/logs`가 열리고, `/protected/*` 접근 시 `next`가 붙은 로그인 URL로 이동. `npm run check` 통과.
  - 테스트 체크리스트:
    - 정상: `browser_navigate → /logs (비로그인) → 200, 리디렉션 없음`
    - 정상: `browser_navigate → /protected/patrol (비로그인) → /auth/login?next=%2Fprotected%2Fpatrol`
    - 오류: `browser_navigate → /auth/callback?code=x&next=//evil.com → 외부 이동 없이 /auth/error 또는 /logs`
    - 엣지: `getSafeNextPath("/\\evil.com")`, `("https://evil.com")`, `("javascript:alert(1)")` → `/logs` (임시 스크립트)
    - 엣지: `getNoticeMessage("unknown") → null` (임시 스크립트)
  - 테스트 결과: 임시 스크립트(Node 24 `node check.ts`, 커밋 안 함)로 `getSafeNextPath`(`/\evil.com`, `https://evil.com`, `javascript:alert(1)`, `//evil.com`, 개행 포함, 비문자열 → `/logs` / `/protected/patrol?x=1` 통과)와 `getNoticeMessage("unknown")`·`undefined` → `null` 확인. Playwright MCP: 비로그인 `/logs` 200(리디렉션 없음), `/protected/patrol` → `/auth/login?next=%2Fprotected%2Fpatrol`, `/auth/callback?code=x&next=//evil.com` → 외부 이동 없이 `/auth/error`, 콘솔 에러·경고 0건. curl: `/logsfoo` → `/auth/login?next=%2Flogsfoo`. `npm run check` 통과.
  - 후속 과제: `app/auth/confirm/route.ts`는 `getSafeNextPath`로 교체 완료(open redirect 차단). `components/login-form.tsx`(`/protected` 고정 이동), `components/google-login-button.tsx`(`next=/protected` 고정)는 아직 `getSafeNextPath`를 쓰지 않는다(CLAUDE.md 서술과 불일치, 인증 UI Task에서 처리).

### Phase 3: UI/UX 완성 (더미 데이터 활용)

> 이 Phase의 화면은 `lib/dummy/*.ts`의 하드코딩 데이터를 사용하며 DB에 접근하지 않는다. 더미 데이터와 가짜 어댑터는 Task 002 타입(`Viewer`, `PatrolLog`, `QuickTag`, `PatrolDraft`, `SaveDraftResult`, `CompletePatrolResult`)으로만 작성하고(`as` 단언 금지) 다음 엣지 데이터를 포함한다: 빈 배열(기록 없는 날짜, 좌석 4종이 모두 빈 기록, 퀵 태그 0개), 여러 줄 메모, 2,000자 메모, 03:59·04:00(KST) 완료 기록(각각 전일·당일 영업일), 강등된 작성자(현재 `pending`이지만 이름이 표시되는 기록). 더미 viewer는 `lib/dummy/viewers.ts`의 4종 상수(admin/manager/pending/비로그인)를 바꿔 가며 확인한다. 컴포넌트는 Task 002 타입과 `viewer` prop을 받고 버튼 노출은 Task 004의 `lib/permissions.ts`로만 판정한다. 더미는 Phase 5의 Task 018(조회)과 Task 020(자동 저장)에서 삭제한다. 모바일 우선, 터치 타깃 48px 이상, 다크 모드 확인.

- **Task 006: 공통 레이아웃·내비게이션·안내 배너 구현** ✅ - 완료
  - 관련 기능: F01
  - 설명: 모든 페이지가 공유하는 상단 내비게이션과 역할별 메뉴, 승인 대기 배너, `notice` 안내 표시를 만든다. 필요한 shadcn 컴포넌트를 추가한다.
  - 관련 파일: `app/layout.tsx`, `components/layout/app-header.tsx`, `components/layout/nav-menu.tsx`, `components/layout/notice-banner.tsx`, `components/layout/pending-banner.tsx`, `components/auth-button.tsx`, `components/logout-button.tsx`, `components/ui/*`, `lib/dummy/viewers.ts`(신규)
  - 구현 사항:
    - ✅ `npx shadcn@latest add sonner skeleton separator` (textarea, dialog, alert-dialog, switch는 사용 시점인 Task 007 이후에 추가)
    - ✅ 헤더: 앱 이름, "일지 조회"(항상), "순찰 기록"(항상 노출, 권한 처리는 클릭 시), "퀵 태그 관리"(`isAdmin(viewer)`일 때만), 로그인/로그아웃 버튼, 테마 전환. 모바일에서는 드롭다운 메뉴
    - ✅ 헤더의 사용자 영역은 `<Suspense fallback={<Skeleton/>}>` 안에서 `viewer` prop을 받는 구조. 이 Task에서는 `lib/dummy/viewers.ts`의 더미 viewer 4종 상수 중 하나를 넘기고, 실제 `getViewer()` 연결은 Task 018에서 한다
    - ✅ `notice` 쿼리 파라미터 배너(`login-required`/`pending`/`admin-required`, 문구는 Task 005의 `lib/auth/notice.ts`)와 pending 사용자용 상단 승인 대기 배너
    - ✅ 전역 토스트(`sonner`) 설치, 한국어 문구로 통일
  - 완료 기준: 더미 viewer 4종(비로그인/pending/manager/admin)에서 메뉴 노출 규칙이 PRD "메뉴 구조"와 일치. 375px·768px 폭에서 레이아웃이 깨지지 않음.
  - 테스트 체크리스트:
    - 정상: 더미 viewer를 admin/manager/pending/비로그인으로 바꿔 가며 `browser_snapshot` → "퀵 태그 관리"는 admin에서만, 승인 대기 배너는 pending에서만 표시
    - 정상: `browser_resize → 375x812 → browser_snapshot → 메뉴가 드롭다운으로 접힘`
    - 정상: `browser_navigate → /logs?notice=pending → 승인 대기 문구 배너 표시`
    - 엣지: `browser_navigate → /logs?notice=unknown → 배너 없음`
  - 테스트 결과: `npm run check`·`npm run build` 통과. Playwright(dev 서버, 더미 viewer 교체): admin은 일지 조회·순찰 기록·퀵 태그 관리 노출, manager·pending·비로그인은 퀵 태그 관리 없음. 승인 대기 배너는 pending에서만 표시, 비로그인은 로그인·가입 링크 표시. 375x812에서 햄버거 드롭다운(admin: 3개 항목)으로 접힘, 768px에서 가로 링크 표시. `/logs?notice=pending` 문구 배너 표시, `?notice=unknown` 배너 없음. 콘솔 에러·경고 0(hydration 경고 없음). `ACTIVE_DUMMY_VIEWER`는 검증 후 기본값 admin으로 원복. 순찰 기록 클릭 시 권한 안내 처리는 Task 007·018 범위

- **Task 007: 일지 조회 페이지 UI 구현 (더미 데이터)**
  - 관련 기능: F06, F08, F09, F10, F01
  - 설명: `/logs` 타임라인, 날짜 이동, 항목별 복사·수정·삭제·자리비움 액션, [순찰 기록 작성] 버튼의 UI를 완성한다.
  - 관련 파일: `app/logs/page.tsx`, `app/logs/_components/date-nav.tsx`, `app/logs/_components/patrol-log-list.tsx`, `app/logs/_components/patrol-log-item.tsx`, `app/logs/_components/edit-log-dialog.tsx`, `app/logs/_components/away-seat-actions.tsx`, `app/logs/_components/write-patrol-button.tsx`, `components/patrol/copy-button.tsx`, `components/patrol/seat-chips.tsx`, `lib/dummy/patrol-logs.ts`
  - 구현 사항:
    - [ ] 날짜 표시와 이전/다음 이동(`?date=YYYY-MM-DD` 링크), 기본값 현재 영업일, 형식이 틀리면 현재 영업일로 대체
    - [ ] 기록 카드: 시각(`HH:mm`), 작성자 이름, 4종 좌석 칩(라벨 구분), 메모(줄바꿈 유지), 빈 상태 문구("이 영업일에는 순찰 기록이 없습니다")
    - [ ] `lib/dummy/patrol-logs.ts`: Task 002 `PatrolLog[]`로 작성하고 Phase 3 공통 엣지 데이터(빈 배열, 여러 줄 메모, 2,000자 메모, 03:59·04:00 완료 기록, 강등된 작성자)를 포함
    - [ ] `components/patrol/copy-button.tsx`: 클릭 핸들러에서 `await` 없이 즉시 `navigator.clipboard.writeText` 호출, 실패/미지원 시 문구가 전체 선택된 읽기 전용 입력란을 다이얼로그로 표시
    - [ ] 권한별 버튼 노출: `canEdit(log, viewer)`가 true인 기록만 수정/삭제와 자리비움 칩별 "스탠딩으로 이동 / 카페존으로 이동 / 삭제" 메뉴 표시. 컴포넌트는 `viewer` prop만 받고 역할 문자열을 직접 비교하지 않음
    - [ ] 수정 다이얼로그(좌석 4종 칩 편집 + 메모), 삭제 확인(`alert-dialog`)
    - [ ] [순찰 기록 작성] 버튼: 비로그인 → "로그인이 필요합니다" 안내 후 `/auth/login?next=/protected/patrol`, pending → 승인 대기 메시지(이동 없음), 매니저·관리자 → `/protected/patrol`
  - 완료 기준: 더미 데이터로 모든 상호작용이 화면상 동작(저장은 토스트로 흉내). 복사 버튼이 PRD 형식 문자열을 클립보드에 넣는다. 엣지 데이터가 레이아웃을 깨지 않는다.
  - 테스트 체크리스트:
    - 정상: `browser_click → 첫 기록 [복사] → browser_evaluate(navigator.clipboard.readText()) → "22:57 순찰 → 완료 (퇴실자 탭 디스플레이 종료)"`
    - 정상: `browser_click → [순찰 기록 작성] (더미 pending) → 승인 대기 메시지, URL 변화 없음`
    - 정상: 더미 manager → 본인 기록에만 수정/삭제 표시, 더미 admin → 모든 기록에 표시, 더미 pending·비로그인 → 표시 없음
    - 오류: `browser_evaluate(navigator.clipboard.writeText = () => Promise.reject()) → [복사] → 전체 선택된 입력란 다이얼로그 표시`
    - 엣지: `browser_navigate → /logs?date=2026-02-30 → 현재 영업일로 표시`
    - 엣지: 2,000자 메모·여러 줄 메모 카드 → 줄바꿈 유지, 가로 스크롤 없음 / 기록 없는 날짜 → 빈 상태 문구
    - 엣지: 03:59 완료 더미 기록은 전일 날짜, 04:00 기록은 당일 날짜에서 표시 / 강등된 작성자 이름 표시
    - 엣지: `browser_resize → 375px → 좌석 칩이 줄바꿈되고 버튼 높이 48px 이상`
  - 테스트 결과: (미수행)

- **Task 008: 순찰 기록 페이지 UI 구현 (더미 데이터, 가짜 저장 어댑터)**
  - 관련 기능: F02, F03, F04, F05, F06, F07(표시)
  - 설명: 모바일 우선·태블릿 2열·하단 고정 액션바 구조로 입력 화면을 완성한다. 상태는 처음부터 Phase 5와 같은 형태(`revision` + 저장 상태 6종)의 `useReducer`로 관리하고, 저장·완료는 Task 002 RPC 응답 타입을 그대로 돌려주는 가짜 어댑터로 흉내 낸다. Task 020에서 어댑터만 RPC 호출로 교체한다.
  - 관련 파일: `app/protected/patrol/page.tsx`, `app/protected/patrol/_components/patrol-form.tsx`, `_components/seat-category-input.tsx`, `_components/number-keypad.tsx`, `_components/quick-tag-bar.tsx`, `_components/memo-input.tsx`, `_components/save-status.tsx`, `_components/patrol-action-bar.tsx`, `_components/conflict-dialog.tsx`, `lib/patrol-form-reducer.ts`, `lib/types/patrol.ts`, `lib/dummy/quick-tags.ts`, `lib/dummy/patrol-draft-adapter.ts`(신규)
  - 구현 사항:
    - [ ] `lib/patrol-form-reducer.ts`: 상태에 `content`(Task 002 `PatrolContent`), `revision`, 저장 상태 `clean / dirty / saving / saved / offline / conflict` 6종, 마지막 저장 시각, 완료 결과를 처음부터 포함. 액션(입력 변경, 저장 시작/성공/충돌/실패, 충돌 해결, 완료 성공, 다음 순찰)별 전이를 순수 함수로 정의
    - [ ] 어댑터 인터페이스 `PatrolDraftAdapter { saveDraft(baseRevision, content): Promise<SaveDraftResult>; completePatrol(requestId, expectedRevision): Promise<CompletePatrolResult> }`를 `lib/types/patrol.ts`에 추가하고 폼은 이 인터페이스에만 의존
    - [ ] `lib/dummy/patrol-draft-adapter.ts`: 메모리 내 서버 초안·`revision`을 두고 지연(300~800ms) 후 Task 002 `SaveDraftResult`·`CompletePatrolResult` 형태 그대로 응답. 같은 요청 ID 재호출 시 `duplicate`, 흉내 모드(`ok`/`conflict`/`offline`)는 모듈 상수와 개발 환경 전용 `window.__fakePatrolAdapter.setMode()`로 전환(`offline`은 네트워크 오류 throw)
    - [ ] 카테고리 4종 탭/섹션 + 숫자 키패드(0~9, 지우기, 추가) + 칩(탭하여 삭제). `lib/seat-numbers.ts`로 양의 정수·카테고리 내 중복 거부, 거부 시 짧은 안내
    - [ ] 퀵 태그 버튼(활성 태그만, `lib/dummy/quick-tags.ts`는 Task 002 `QuickTag[]`이며 0개 경우 포함): 탭하면 메모 끝에 새 줄로 추가(같은 태그 반복 허용). 메모 `textarea`(2,000자 카운터), 퀵 태그 문구도 자유 편집
    - [ ] 저장 상태 표시 컴포넌트: `저장 중` / `저장됨 HH:mm` / `오프라인(기기에 임시 저장)` / `충돌`. 입력 후 1초 디바운스로 가짜 어댑터 `saveDraft` 호출(동시 요청 1개 제한·로컬 백업·포커스 재조회는 Task 020)
    - [ ] 하단 고정 액션바: [순찰 완료](처리 중 비활성화, 가짜 어댑터 `completePatrol` 호출), [복사](완료 응답의 `patrolledAt`으로 `formatPatrolLine`, 완료 직후 활성), [다음 순찰]. 충돌 선택 다이얼로그 "다른 기기에서 수정됨, 어느 쪽을 쓸까요?"(이 기기 내용 / 서버 내용)
    - [ ] 페이지와 폼은 `viewer` prop만 받고 권한 판정은 `lib/permissions.ts`로만 한다. 768px 이상에서 좌석 입력 | 태그·메모 2열 배치
  - 완료 기준: reducer가 `revision`과 저장 상태 6종을 모두 표현하고, 가짜 어댑터의 `ok`/`conflict`/`duplicate`/`offline` 응답에 따라 화면이 기대 상태로 전이한다. 입력 → 저장 → 완료 → 복사 → 다음 순찰이 끊김 없이 동작하고 키패드 버튼이 48px 이상이다. 폼 코드에 `lib/dummy` 직접 의존은 어댑터 주입 지점 한 곳뿐이다.
  - 테스트 체크리스트:
    - 정상: `browser_click → 졸음/딴짓 탭, 2·3·[추가] → 칩 "23" 표시 → 1초 뒤 "저장 중" → "저장됨 HH:mm"`
    - 정상: `browser_click → 퀵 태그 "화장실 정리" 2회 → 메모에 두 줄 추가`
    - 정상: `[순찰 완료] → 입력 초기화, [복사] 활성 → [복사] → clipboard가 PRD 형식 한 줄`
    - 오류: 같은 카테고리에 23 재입력 → 거부 안내, 칩 1개 유지 / `0` 입력 → 추가 버튼 비활성 또는 거부
    - 오류: `browser_evaluate(window.__fakePatrolAdapter.setMode("conflict")) → 입력 → 충돌 다이얼로그 표시, 선택 결과대로 반영`
    - 오류: `browser_evaluate(setMode("offline")) → 입력 → "오프라인" 표시 → setMode("ok") 후 입력 → "저장됨"`
    - 엣지: 같은 요청 ID로 완료 2회 → 두 번째 응답 `duplicate`에도 화면은 완료 상태 1회만 반영
    - 엣지: 스탠딩 5와 자리비움 5 동시 입력 → 둘 다 허용 / 퀵 태그 0개 → 태그 영역 빈 상태 표시
    - 엣지: `browser_resize → 1024x768 → 2열 배치, 액션바 하단 고정`
  - 테스트 결과: (미수행)

- **Task 009: 퀵 태그 관리 페이지 UI 구현 (더미 데이터)**
  - 관련 기능: F11
  - 설명: 관리자용 전체 태그 목록(숨김 포함)과 추가/수정/순서/노출/삭제 UI를 만든다.
  - 관련 파일: `app/protected/admin/tags/page.tsx`, `app/protected/admin/tags/_components/tag-list.tsx`, `_components/tag-row.tsx`, `_components/add-tag-form.tsx`, `lib/dummy/quick-tags.ts`
  - 구현 사항:
    - [ ] 목록: 순서, 문구, 노출 스위치, 위/아래 이동 버튼(첫/마지막 항목에서 비활성), 수정, 삭제. 데이터는 Task 002 `QuickTag[]` 더미(숨김 태그, 0개 경우 포함)
    - [ ] 추가 폼: `lib/quick-tag-label.ts`로 필수·개행 불가·중복(공백·대소문자 무시) 클라이언트 검증, Enter 제출
    - [ ] 인라인 문구 수정과 삭제 확인 다이얼로그("과거 기록 메모에는 영향 없음" 안내)
    - [ ] 숨김 태그는 흐리게 표시해 구분
  - 완료 기준: 더미 상태에서 모든 조작이 즉시 화면에 반영되고 검증 메시지가 노출된다.
  - 테스트 체크리스트:
    - 정상: `browser_type → "제빙기 청소" → [추가] → 목록 끝에 추가`
    - 오류: `browser_type → " 화장실  정리 " → [추가] → "이미 있는 문구입니다"`
    - 엣지: 첫 항목의 [위로] 버튼 비활성 / 태그 0개 → 빈 상태 문구
  - 테스트 결과: (미수행)

- **Task 010: 로그인·가입 화면 한국어화 및 이름 입력 추가**
  - 관련 기능: F01
  - 설명: 스타터 인증 폼을 한국어로 정리하고 이메일 가입에 이름 입력과 인앱 브라우저 안내를 추가한다(동작 연결은 Task 017).
  - 관련 파일: `components/login-form.tsx`, `components/sign-up-form.tsx`, `components/google-login-button.tsx`, `components/in-app-browser-notice.tsx`(신규), `app/auth/*/page.tsx`
  - 구현 사항:
    - [ ] 로그인/가입/비밀번호 찾기/재설정/에러/가입 완료 화면 문구 한국어화
    - [ ] 가입 폼에 이름(full_name) 필드 추가(필수, 트림)
    - [ ] 인앱 브라우저 안내 문구 "카카오톡 등 인앱 브라우저에서는 Google 로그인이 차단될 수 있습니다. Chrome/Safari 등 외부 브라우저로 열어주세요" 상시 표시(UA 감지 시 강조)
    - [ ] 에러 메시지 영역 공통화, 로딩 상태 문구 한국어화
  - 완료 기준: 모든 인증 화면에 영어 문구가 남지 않고, 가입 폼에 이름 입력이 있다.
  - 테스트 체크리스트:
    - 정상: `browser_navigate → /auth/login → browser_snapshot → Google 버튼, 이메일 폼, 인앱 안내 문구 존재`
    - 오류: `browser_click → 가입 폼에서 이름 비우고 제출 → 필수 입력 안내(클라이언트 검증, 가입 요청 미전송)`
  - 테스트 결과: (미수행)

- **Task 011: UI 검토·보완 및 PRD·데이터 모델 확정**
  - 관련 기능: F01~F11
  - 설명: Phase 3 화면을 4개 역할과 모바일/태블릿에서 실제로 사용해 보며 보완점을 모으고 반영한다. 요구사항이 바뀌면 PRD를 먼저 고치고 Phase 4 DB Task(012~016) 명세를 그에 맞춰 갱신한다. 스키마가 확정된 뒤에만 Phase 4로 진입한다.
  - 관련 파일: `docs/PRD.md`, `docs/ROADMAP.md`, `lib/types/*`, `lib/dummy/*`, `lib/patrol-form-reducer.ts`, `components/*`, `app/**/_components/*`
  - 구현 사항:
    - [ ] 더미 viewer 4종(admin/manager/pending/비로그인) × 375x812(폰)·768x1024(태블릿 세로)·1024x768(태블릿 가로)에서 `/logs`, `/protected/patrol`, `/protected/admin/tags`, `/auth/*`를 훑고 보완점을 이 Task 아래 "검토 결과" 목록에 기록(분류: UI 수정 / 요구사항 변경 / MVP 이후 보류)
    - [ ] UI 수정 항목을 반영하고 해당 Phase 3 Task의 수락 기준이 여전히 충족되는지 재확인
    - [ ] 요구사항 변경 항목: PRD를 먼저 수정 → Task 002 타입·더미 데이터·가짜 어댑터 반영 → Task 012~016 명세(컬럼, 제약, RLS, RPC 시그니처·응답, 테스트 체크리스트)와 기능 ID 매핑 표 갱신
    - [ ] 데이터 모델 대조: PRD 데이터 모델, Task 002 타입, 가짜 어댑터 응답, Task 012~014 명세의 필드명·nullable·기본값·제약·RPC 응답 키가 일치하는지 대조표로 확인하고 불일치를 해소
    - [ ] 보류 항목은 이 문서의 "MVP 이후" 절에 기록, 확정 결과를 사용자에게 보고하고 Phase 4 진입 확인을 받음
  - 완료 기준: "검토 결과"의 모든 항목이 반영 또는 보류로 처리되고, PRD·타입·Phase 4 명세 대조에서 불일치가 0건이다. 프로젝트 공통 완료 조건(`npm run check` 통과, Playwright MCP 시나리오 통과, 콘솔 에러·hydration 경고 없음)을 만족한다.
  - 테스트 체크리스트:
    - 정상: 더미 viewer 4종 × 각 화면 `browser_snapshot` → 메뉴·버튼 노출이 PRD 권한 규칙과 일치
    - 정상: 375x812와 1024x768에서 순찰 흐름(입력 → 저장 상태 표시 → 완료 → 복사 → 다음 순찰) 끊김 없음
    - 오류: 가짜 어댑터 `conflict`/`offline` 모드와 같은 요청 ID 재완료(`duplicate`) → 다이얼로그·상태 표시가 PRD "자동 저장 규칙"과 일치
    - 엣지: Phase 3 공통 엣지 더미 데이터(빈 배열, 여러 줄 메모, 2,000자 메모, 03:59·04:00 완료 기록, 강등된 작성자)가 모든 화면에서 깨지지 않음, 다크 모드 포함
    - 엣지: `browser_console_messages → 전 화면 에러·hydration 경고 없음`
  - 테스트 결과: (미수행)

### Phase 4: 데이터베이스 스키마·RLS·RPC·DAL

> Task 011에서 PRD·데이터 모델이 확정된 뒤 시작한다. DB 검증은 Supabase MCP `execute_sql`에서 트랜잭션 안에 `set local role authenticated; set local request.jwt.claims = '{"sub":"<uuid>","role":"authenticated"}';`로 사용자를 흉내 내고 `rollback`하는 방식으로 한다. 비로그인은 `set local role anon`. Task 015 이전 시나리오의 `qa-*`는 트랜잭션 안에서 만든 같은 역할의 임시 사용자다. 각 Task 후 `get_advisors`(security)를 확인한다.

- **Task 012: profiles 재정비, 역할 판별 함수, staff_names 동기화 구축**
  - 관련 기능: F01, F08
  - 설명: 스타터 `profiles`를 PRD 모델로 바꾸고 역할 판별 함수와 작성자 이름 공개용 `staff_names`를 만든다.
  - 관련 파일: `supabase/migrations/<ts>_reshape_profiles_roles.sql`, `supabase/migrations/<ts>_create_staff_names.sql`
  - 구현 사항:
    - [ ] `profiles`: `username`(unique)·`website` 컬럼과 `username_length` 제약 제거, `role text not null default 'pending' check (role in ('pending','manager','admin'))` 추가, `updated_at` 기본값/갱신 트리거
    - [ ] `handle_new_user` 재작성: `full_name` ← `raw_user_meta_data->>'full_name'` → 없으면 `->>'name'` → 없으면 이메일 앞부분. `role`은 메타데이터에서 읽지 않고 항상 `pending`. 기존 행 `full_name` 공백 backfill
    - [ ] `profiles` 정책/권한 재설정: "누구나 조회" 정책과 insert 정책 삭제, 본인 행만 select(`authenticated`), `revoke all ... from anon, authenticated` 후 `grant select` + `grant update (full_name)`만 `authenticated`에 부여(컬럼 GRANT로 `role` 변경 차단)
    - [ ] `create schema private` + `private.is_staff()`, `private.is_admin()`(`security definer`, `set search_path = ''`, `stable`, `auth.uid()` 기준). `revoke execute ... from public, anon`, `grant usage on schema private` 및 `grant execute`는 `authenticated`에만. `private` 스키마는 Data API 노출 스키마에 넣지 않는다
    - [ ] `staff_names(id uuid pk references profiles(id), full_name text)`: RLS 켜고 `anon`, `authenticated`에 select만 부여(정책 `using (true)`), 쓰기 권한 없음
    - [ ] 동기화 트리거 `sync_staff_name`(`security definer`): `profiles` insert/update(`role`, `full_name`) 시 역할이 `manager`/`admin`이면 upsert, 강등 시 행 유지(이름 변경은 기존 행이 있으면 반영)
  - 완료 기준: 마이그레이션이 원격 DB에 적용되고 아래 SQL 시나리오가 모두 기대대로 동작한다. `get_advisors(security)`에 신규 경고 없음.
  - 테스트 체크리스트:
    - 정상: `execute_sql → auth.users에 메타데이터 {full_name:"홍길동"}인 사용자 insert(트랜잭션) → profiles.role='pending', full_name='홍길동'`
    - 정상: `execute_sql → profiles.role을 manager로 update → staff_names에 행 생성, 다시 pending으로 → staff_names 행 유지`
    - 오류: `execute_sql(authenticated 흉내) → update profiles set role='admin' where id=본인 → permission denied`
    - 오류: `execute_sql(anon) → select * from profiles → 0행 또는 permission denied`
    - 오류: `execute_sql(authenticated) → select private.is_admin() via REST(/rest/v1/rpc/is_admin) → 404/노출되지 않음`
    - 엣지: 메타데이터에 `role:"admin"`을 넣어 가입 → `pending`으로 생성
    - 엣지: `full_name`·`name` 모두 없음 → 이메일 앞부분으로 생성
  - 테스트 결과: (미수행)

- **Task 013: 핵심 테이블·제약·RLS·초기 데이터 구축**
  - 관련 기능: F02, F03, F04, F07, F08, F09, F10, F11
  - 설명: `quick_tags`, `patrol_logs`, `patrol_drafts`를 PRD의 제약·권한 규칙 그대로 만든다. DB 기본 시간대를 한국으로 설정한다.
  - 관련 파일: `supabase/migrations/<ts>_set_timezone_seoul.sql`, `<ts>_create_quick_tags.sql`, `<ts>_create_patrol_logs.sql`, `<ts>_create_patrol_drafts.sql`
  - 구현 사항:
    - [ ] `alter database postgres set timezone to 'Asia/Seoul'` (SQL 함수에서는 그래도 `at time zone 'Asia/Seoul'`을 명시)
    - [ ] 좌석 배열 검증 함수 `private.is_valid_seats(int[])`(`immutable`): 모든 원소 > 0, 중복 없음, null 원소 없음. 4개 배열 컬럼 `not null default '{}'` + `check`
    - [ ] `quick_tags(id, label, sort_order int, is_active bool default true, created_at)`: `label` check(트림 후 비어 있지 않음, `\r`/`\n` 불포함), 유일 인덱스 `lower(regexp_replace(btrim(label), '\s+', ' ', 'g'))`. 정책: `anon` select `is_active`, `authenticated` select `is_active or private.is_admin()`, insert/update/delete는 `private.is_admin()`. 초기 데이터 5종(퇴실자 탭 디스플레이 종료 / 화장실 정리 / 제빙기 물 보충 / 정수기 및 커피머신 청소 / 전 열람실 에어컨 종료) seed
    - [ ] `patrol_logs(id, client_request_id uuid unique, business_date date, patrolled_at timestamptz, author_id uuid, standing, cafe_zone, drowsy, away int[], memo text check (char_length(memo) <= 2000))`: `author_id`가 `profiles(id)`와 `staff_names(id)`를 모두 참조(작성자 이름 embed용), 인덱스 `(business_date, patrolled_at)`, `(author_id)`
    - [ ] `patrol_logs` 권한: `anon`/`authenticated` select(정책 `using (true)`), insert 권한 없음, `grant update (standing, cafe_zone, drowsy, away, memo)`과 `grant delete`를 `authenticated`에 부여, update/delete 정책 `(author_id = auth.uid() and private.is_staff()) or private.is_admin()`
    - [ ] `patrol_drafts(user_id pk references profiles(id), 좌석 4종, memo, revision bigint not null default 0, updated_at timestamptz default now())`: 본인 행 select만, 쓰기 권한 없음(RPC 전용)
  - 완료 기준: 테이블·제약·정책이 적용되고, PostgREST에서 `patrol_logs?select=*,staff_names(full_name)`이 비로그인 키로 동작한다(구현 전 확인 항목). `get_advisors(security, performance)` 신규 경고 없음.
  - 테스트 체크리스트:
    - 정상: `execute_sql(anon) → select from quick_tags → 활성 태그 5개`
    - 정상: `execute_sql(anon) → select id, staff_names(full_name)에 해당하는 join 쿼리 → 작성자 이름 반환` / `curl(anon key) → /rest/v1/patrol_logs?select=id,staff_names(full_name) → 200`
    - 정상: `execute_sql(qa-manager) → 본인 기록 update memo → 1행 갱신`
    - 오류: `execute_sql(qa-manager) → 타인 기록 update/delete → 0행`
    - 오류: `execute_sql(qa-manager) → update patrol_logs set patrolled_at=... → permission denied`
    - 오류: `execute_sql(authenticated) → insert into patrol_logs/patrol_drafts → permission denied`
    - 오류: `execute_sql → standing='{0}' 또는 '{3,3}' 또는 memo 2001자 → check 제약 위반`
    - 오류: `execute_sql(qa-admin) → insert quick_tags label=' 화장실   정리 ' → unique 위반` / `label=E'a\nb' → check 위반`
    - 엣지: 같은 번호를 서로 다른 카테고리(`standing={5}`, `away={5}`)에 넣기 → 허용
    - 엣지: `qa-manager`를 pending으로 강등 후 본인 기록 update → 0행, 일지 조회 시 작성자 이름 유지
  - 테스트 결과: (미수행)

- **Task 014: 저장·완료·태그 순서 RPC 구현**
  - 관련 기능: F05, F07, F11
  - 설명: `save_patrol_draft`, `complete_patrol`, `swap_quick_tag_order`를 `security definer` 함수로 만들고 함수 본문에서 호출자 역할을 다시 검사한다. 응답 형태는 Task 002 `SaveDraftResult`·`CompletePatrolResult`(Task 008 가짜 어댑터와 동일)와 일치시킨다.
  - 관련 파일: `supabase/migrations/<ts>_create_patrol_rpcs.sql`, `<ts>_create_swap_quick_tag_order.sql`
  - 구현 사항:
    - [ ] 공통: `set search_path = ''`, 본문 첫 줄에서 `private.is_staff()`(태그는 `private.is_admin()`) 검사 후 위반 시 예외, `revoke execute ... from public, anon` + `grant execute ... to authenticated`
    - [ ] `save_patrol_draft(base_revision bigint, standing int[], cafe_zone int[], drowsy int[], away int[], memo text)` → `jsonb`: 행이 없으면 `base_revision = 0`일 때만 생성(그 외 충돌), 있으면 `for update` 잠금 후 `revision = base_revision`일 때만 저장하고 `revision + 1`, `updated_at = now()`. 좌석은 양의 정수만 남기고 카테고리 내 중복 제거·정렬, 메모 2,000자 초과는 오류. 충돌 시 `{status:"conflict", server_revision, server_draft}`
    - [ ] `complete_patrol(client_request_id uuid, expected_revision bigint)` → `jsonb`, PRD 순서 그대로: ① 초안 행 보장 후 `for update` ② 같은 `client_request_id`의 기록(작성자 본인)이 있으면 초안을 건드리지 않고 `{status:"duplicate", log_id, patrolled_at, revision}` ③ `expected_revision` 불일치 시 `{status:"conflict", server_revision}` ④ 서버 초안 내용으로 `patrol_logs` insert(`patrolled_at = now()`, `business_date = ((now() at time zone 'Asia/Seoul') - interval '4 hours')::date`, `author_id = auth.uid()`) ⑤ 초안을 빈 값 + `revision + 1`로 초기화. 응답 `{status:"ok", log_id, patrolled_at, revision}`
    - [ ] 빈 초안이라도 `revision`이 일치하면 완료 허용
    - [ ] `swap_quick_tag_order(tag_a uuid, tag_b uuid)`: 두 행 잠금 후 `sort_order` 맞바꿈(한 트랜잭션), 존재하지 않으면 예외
    - [ ] SQL 영업일 경계값 검증용으로 계산식을 `private.business_date_of(timestamptz)` 함수로 분리해 재사용
  - 완료 기준: 아래 시나리오 전부 통과. `anon`으로 RPC 호출 시 권한 오류. `pending`이 호출하면 함수 내부 검사에서 거부.
  - 테스트 체크리스트:
    - 정상: `execute_sql(qa-manager) → save_patrol_draft(0, '{1}', ...) → status ok, revision 1` → `save_patrol_draft(1, ...) → revision 2`
    - 정상: `execute_sql(qa-manager) → complete_patrol(uuid A, 2) → status ok, patrol_logs 1건, 초안 비고 revision 3`
    - 정상(멱등): `complete_patrol(uuid A, 2) 재호출 → status duplicate, 같은 log_id, 기록 1건 유지, 초안 revision 3 그대로`
    - 오류: `save_patrol_draft(1, ...)`(서버는 3) → `status conflict, server_revision 3`
    - 오류: 초안 행 없음 + `save_patrol_draft(5, ...)` → conflict
    - 오류: `complete_patrol(uuid B, 1)`(서버 3) → conflict, 기록 미생성
    - 오류: `execute_sql(qa-pending) → save_patrol_draft/complete_patrol → 예외` / `execute_sql(anon) → permission denied`
    - 오류: `execute_sql(qa-manager) → swap_quick_tag_order → 예외`
    - 엣지: `private.business_date_of` 경계표 7건(03:59:59 → 전일, 04:00:00 → 당일, 00:00:00 → 전일, 월말 03:59:59 → 말일, 월초 04:00:00 → 1일, 12/31 23:59:59 → 12/31, 1/1 03:59:59 → 12/31) 일치
    - 엣지: 좌석 입력 `{3,3,-1,0,2}` → 저장값 `{2,3}`
  - 테스트 결과: (미수행)

- **Task 015: 방치 초안 정리 스케줄, DB 타입 생성, 테스트 계정 준비**
  - 관련 기능: F07, F01
  - 설명: `pg_cron`으로 방치 초안을 비우고, 생성된 DB 타입을 Supabase 클라이언트에 연결한다. QA용 계정을 만든다.
  - 관련 파일: `supabase/migrations/<ts>_schedule_stale_draft_reset.sql`, `lib/supabase/database.types.ts`(생성), `lib/supabase/client.ts`, `lib/supabase/server.ts`
  - 구현 사항:
    - [ ] `pg_cron` 확장 활성화 여부 확인(구현 전 확인 항목). 비활성 시 대시보드에서 활성화하거나 마이그레이션에 `create extension if not exists pg_cron`
    - [ ] 정리 함수 `private.reset_stale_drafts()`: `updated_at < now() - interval '2 hours'`이고 내용이 비어 있지 않은 초안만 빈 값 + `revision + 1` + `updated_at = now()`(행 삭제 없음, 이미 빈 초안은 제외해 불필요한 revision 증가 방지)
    - [ ] `cron.schedule('reset-stale-patrol-drafts', '*/30 * * * *', 'select private.reset_stale_drafts()')`
    - [ ] Supabase MCP `generate_typescript_types`로 `lib/supabase/database.types.ts` 생성, `createBrowserClient<Database>`/`createServerClient<Database>` 제네릭 적용, Task 002 타입과 매핑 함수(`toPatrolLog` 등) 작성
    - [ ] 테스트 계정 4종 생성 후 대시보드(Table Editor)에서 역할 지정, 첫 관리자 지정 절차를 README 운영 메모에 기록
  - 완료 기준: `cron.job`에 작업이 등록되고 정리 함수를 수동 실행해 규칙대로 동작한다. 타입 생성 후 `npm run typecheck` 통과.
  - 테스트 체크리스트:
    - 정상: `execute_sql → 초안 updated_at을 3시간 전으로 바꾸고 reset_stale_drafts() → 내용 비고 revision +1`
    - 엣지: `updated_at` 1시간 전(영업일 04:00 경계를 넘긴 작성 중 초안) → 유지
    - 엣지: 이미 빈 초안 → revision 변화 없음
    - 정상: `execute_sql → select * from cron.job_run_details order by start_time desc limit 1 → 30분 뒤 succeeded`
  - 테스트 결과: (미수행)

- **Task 016: 서버 권한 검증(DAL) 구현**
  - 관련 기능: F01
  - 설명: Task 012의 `profiles.role`을 읽는 `lib/auth/dal.ts`의 `getViewer()`/`requireStaff()`/`requireAdmin()`을 만들고 보호 페이지에 연결한다. `next`·`notice` 처리는 Task 005의 함수를 쓴다.
  - 관련 파일: `lib/auth/dal.ts`(신규, `import "server-only"`), `app/protected/patrol/page.tsx`, `app/protected/admin/tags/page.tsx`
  - 구현 사항:
    - [ ] `getViewer()`(React `cache`): `getClaims()` → 본인 `profiles`(`full_name`, `role`) 조회 후 Task 002 `Viewer`로 반환, 비로그인은 `null`
    - [ ] `requireStaff()`: 비로그인 → `/auth/login?next=<현재 경로>`(`getSafeNextPath`로 검증), `pending` → `/logs?notice=pending`. `requireAdmin()`: 비로그인 → 로그인, `pending` → `notice=pending`, `manager` → `/logs?notice=admin-required`
    - [ ] `/protected/patrol`은 `requireStaff()`, `/protected/admin/tags`는 `requireAdmin()`을 `<Suspense>` 안의 비동기 컴포넌트에서 호출(레이아웃 검사만으로 끝내지 않음). 화면 데이터는 아직 더미이며 실데이터 연결은 Task 020·022
  - 완료 기준: QA 계정 4종과 비로그인에서 두 보호 페이지의 접근 결과가 PRD 권한 규칙과 일치한다. `npm run check` 통과.
  - 테스트 체크리스트:
    - 정상: `browser_navigate → /protected/patrol (qa-manager) → 200, 페이지 표시`
    - 정상: `browser_navigate → /protected/admin/tags (qa-admin) → 200`
    - 오류: `browser_navigate → /protected/patrol (qa-pending) → /logs?notice=pending, 승인 대기 배너`
    - 오류: `browser_navigate → /protected/admin/tags (qa-manager) → /logs?notice=admin-required`
    - 오류: `browser_navigate → /protected/admin/tags (비로그인) → /auth/login?next=%2Fprotected%2Fadmin%2Ftags`
    - 엣지: `execute_sql → qa-manager를 pending으로 강등 → /protected/patrol 새로고침 → /logs?notice=pending` (확인 후 원복)
    - 엣지: `browser_console_messages → 에러·hydration 경고 없음`
  - 테스트 결과: (미수행)

### Phase 5: 핵심 기능 구현

- **Task 017: 인증 흐름 완성 (리디렉션·원래 화면 복귀·이메일 확인·로그아웃)**
  - 관련 기능: F01
  - 설명: 로그인 후/로그아웃 후 이동을 `/logs`로 통일하고 `next` 복귀를 모든 경로에서 같은 방식으로 처리한다.
  - 관련 파일: `components/login-form.tsx`, `components/sign-up-form.tsx`, `components/google-login-button.tsx`, `components/logout-button.tsx`, `app/auth/callback/route.ts`, `app/auth/confirm/route.ts`, `app/auth/login/page.tsx`
  - 구현 사항:
    - [ ] 로그인 페이지가 `?next`를 읽어(`<Suspense>` 안) 로그인 폼과 Google 버튼에 전달, 성공 시 `getSafeNextPath(next)`(기본 `/logs`)로 이동
    - [ ] Google `redirectTo`: `/auth/callback?next=<검증된 next>`, 콜백 기본값 `/logs`
    - [ ] 이메일 가입: `options.data.full_name`에 이름 전달, `emailRedirectTo`를 `/auth/confirm` 기반으로 변경
    - [ ] `/auth/confirm`: `next`를 `getSafeNextPath`로 검증, 기본값 `/logs`, 에러 메시지 인코딩
    - [ ] Supabase 대시보드 확인 메일 템플릿을 `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/logs`로 변경, Site URL·Redirect URLs(로컬, HTTPS 터널, 운영 도메인) 등록 (수동 작업, 체크리스트로 기록)
    - [ ] 로그아웃: `signOut` 후 `localStorage`의 `draft:`로 시작하는 키 전부 삭제, `/logs`로 이동
  - 완료 기준: 아래 흐름이 모두 기대대로 동작하고 외부 주소로의 리디렉션이 불가능하다.
  - 테스트 체크리스트:
    - 정상: `browser_navigate → /protected/patrol (비로그인) → 로그인 페이지 → qa-manager 이메일 로그인 → /protected/patrol 복귀`
    - 정상: `browser_navigate → /auth/login → 로그인 → /logs`
    - 정상: `browser_evaluate(localStorage.setItem("draft:x","{}")) → 로그아웃 → localStorage에 draft: 키 없음, URL /logs`
    - 정상: 신규 이메일 가입(이름 "테스트") → 확인 메일 링크 열기 → `/logs` 도착, `profiles.full_name='테스트'`, `role='pending'` (Supabase MCP로 확인)
    - 오류: `browser_navigate → /auth/login?next=https://evil.com → 로그인 → /logs`
    - 오류: `browser_navigate → /auth/confirm?token_hash=bad&type=email → /auth/error에 사유 표시`
    - 엣지: 가입한 기기와 다른 브라우저에서 확인 링크 열기 → 정상 확인(token_hash 방식)
  - 테스트 결과: (미수행)

- **Task 018: 일지 조회 실데이터 연동**
  - 관련 기능: F08, F06, F01
  - 설명: `/logs`를 Supabase 데이터로 교체하고, Task 006·007에서 더미 viewer로 확인하던 헤더·페이지에 `getViewer()`를 연결해 역할에 따라 버튼을 노출한다.
  - 관련 파일: `app/logs/page.tsx`, `lib/queries/patrol-logs.ts`(신규, 서버 전용), `components/layout/app-header.tsx`, `lib/dummy/patrol-logs.ts`(삭제), `lib/dummy/viewers.ts`(삭제)
  - 구현 사항:
    - [ ] 페이지: `<Suspense>` 안의 비동기 컴포넌트에서 `await searchParams` → `await io()` 후 현재 시각으로 `getBusinessDate` 계산 → `?date` 검증 결과 적용 (`04-functions/io.md` 확인)
    - [ ] `getPatrolLogsByDate(date)`: `patrol_logs` select `id, business_date, patrolled_at, author_id, standing, cafe_zone, drowsy, away, memo, staff_names(full_name)` + `eq("business_date", date)` + `order("patrolled_at")`, 비로그인 키로 동작 확인
    - [ ] 헤더와 페이지의 더미 viewer를 `getViewer()`로 교체: pending 배너, 관리자 메뉴, 기록별 수정/삭제 노출은 `canEdit(log, viewer)` 그대로 사용(pending 본인은 미노출). 교체 후 `lib/dummy/patrol-logs.ts`, `lib/dummy/viewers.ts` 삭제
    - [ ] 조회 실패 시 에러 경계(`app/logs/error.tsx`)와 재시도 버튼, 로딩 스켈레톤(`loading` fallback)
    - [ ] 다음 날짜 이동은 현재 영업일 다음 날까지만 활성(미래 이동 제한)
  - 완료 기준: 비로그인/pending/manager/admin 4개 상태에서 같은 날짜의 기록이 동일하게 보이고 버튼 노출만 다르다. 복사 문구가 서버 `patrolled_at` 기준 KST로 만들어진다. `lib/dummy/patrol-logs.ts`·`viewers.ts`를 참조하는 코드가 없다.
  - 테스트 체크리스트:
    - 정상: `browser_navigate → /logs (비로그인) → 현재 영업일 기록 목록, 작성자 이름 표시, 수정 버튼 없음`
    - 정상: `browser_navigate → /logs (qa-manager) → 본인 기록에만 수정/삭제 표시`
    - 정상: `browser_navigate → /logs (qa-admin) → 모든 기록에 수정/삭제 표시, 헤더에 퀵 태그 관리 메뉴`
    - 오류: `browser_navigate → /logs?date=abc → 현재 영업일로 표시, 에러 없음`
    - 엣지: 03:59 완료 기록이 전일 날짜에서 조회됨(Supabase MCP로 `patrolled_at` 조정한 데이터)
    - 엣지: `browser_console_messages → hydration 경고 없음`(서버·클라이언트 HH:mm 일치)
  - 테스트 결과: (미수행)

- **Task 019: 기록 수정/삭제 및 자리비움 사후 처리 구현**
  - 관련 기능: F09, F10
  - 설명: Server Action으로 확정 기록 정정을 구현한다. 각 Action은 `requireStaff()`를 호출하고 RLS가 최종 판단한다.
  - 관련 파일: `app/logs/actions.ts`(신규, `"use server"`), `app/logs/_components/edit-log-dialog.tsx`, `app/logs/_components/away-seat-actions.tsx`, `app/logs/_components/patrol-log-item.tsx`
  - 구현 사항:
    - [ ] `updatePatrolLog(id, content)`: 좌석·메모를 `lib/seat-numbers.ts`/`MEMO_MAX_LENGTH`로 재검증 후 `update(...).eq("id", id).select("id")`, 0행이면 "권한이 없거나 삭제된 기록입니다"
    - [ ] `deletePatrolLog(id)`: 삭제 후 0행 처리 동일
    - [ ] `moveAwaySeat(id, seat, target: "standing" | "cafe_zone")`와 `removeAwaySeat(id, seat)`: 현재 행 조회 → `moveAwaySeat` 순수 함수 적용 → update (동시 수정은 마지막 저장 우선)
    - [ ] 완료 시각·영업일·작성자는 payload에서 받지 않음
    - [ ] 성공 시 `refresh()` 또는 `revalidatePath("/logs")`로 같은 페이지 갱신(Next 16 문서 확인 후 선택), 실패 시 토스트
  - 완료 기준: 권한 규칙이 UI 우회(직접 Action 호출) 상황에서도 지켜진다.
  - 테스트 체크리스트:
    - 정상: `browser_click → (qa-manager) 본인 기록 수정 → 메모 변경 저장 → 목록 갱신`
    - 정상: `browser_click → 자리비움 7 → "스탠딩으로 이동" → away에서 제거, standing에 7 추가`
    - 정상: 대상에 이미 7이 있는 경우 이동 → away에서만 제거, standing 중복 없음
    - 오류: `execute_sql/REST(qa-manager2 토큰) → 타인 기록 update → 0행` 및 Server Action 직접 호출 시 오류 응답
    - 오류: 수정 다이얼로그에서 좌석 `0` 또는 메모 2,001자 → 저장 거부 안내
    - 엣지: 강등된 qa-manager(pending)가 열어둔 화면에서 수정 시도 → 거부(`requireStaff` 리디렉션 또는 RLS 0행)
    - 엣지: (qa-admin) 타인 기록 삭제 → 성공, 확인 다이얼로그 거침
  - 테스트 결과: (미수행)

- **Task 020: 순찰 초안 자동 저장·복원 구현 (가짜 어댑터 교체, 더미 삭제)**
  - 관련 기능: F07, F02, F03, F04
  - 설명: PRD "자동 저장 규칙"을 클라이언트 훅으로 구현한다. Task 008의 가짜 어댑터를 RPC 호출로 교체하고 `lib/dummy`를 삭제한다. 저장은 브라우저 Supabase 클라이언트에서 `save_patrol_draft` RPC를 직접 호출한다(함수 내부 역할 검사가 방어선).
  - 관련 파일: `app/protected/patrol/page.tsx`, `hooks/use-patrol-draft.ts`(신규), `lib/patrol-draft-rpc.ts`(신규), `lib/draft-backup.ts`(신규), `lib/queries/patrol-draft.ts`, `lib/queries/quick-tags.ts`, `app/protected/patrol/_components/*`, `app/protected/admin/tags/page.tsx`, `lib/dummy/*`(삭제)
  - 구현 사항:
    - [ ] 가짜 어댑터 교체: `PatrolDraftAdapter`의 실제 구현 `lib/patrol-draft-rpc.ts`(브라우저 클라이언트로 `save_patrol_draft`/`complete_patrol` 호출 후 snake_case 응답을 Task 002 `SaveDraftResult`·`CompletePatrolResult`로 변환)를 주입하고 `lib/dummy/patrol-draft-adapter.ts`·`window.__fakePatrolAdapter` 제거
    - [ ] 페이지: Task 016의 `requireStaff()` 호출 뒤 본인 초안(`revision`, 내용, `updated_at`)과 활성 퀵 태그(`sort_order` 순)를 서버에서 조회해 초기값으로 전달(초안 행이 없으면 `revision 0`)
    - [ ] `lib/dummy` 디렉터리 삭제: 남은 더미 참조(태그 관리 페이지의 목록 조회)는 `lib/queries/quick-tags.ts` 조회로 교체(조작 Action은 Task 022). `grep -r "lib/dummy" app components lib hooks` 결과 없음
    - [ ] 디바운스 1초 저장, 기기당 동시 요청 1개, 대기 중 변경은 최신 상태 하나로 합침. 상태는 Task 008 reducer의 `clean / dirty / saving / saved / offline / conflict` 그대로 사용
    - [ ] 충돌 응답 처리: 서버 초안이 비어 있으면 로컬 입력을 `server_revision` 기준으로 재저장, 아니면 선택 다이얼로그(이 기기 내용 → `server_revision` 기준 재저장 / 서버 내용 → 로컬 교체)
    - [ ] 네트워크 실패 시 `localStorage["draft:{user_id}"] = { revision, savedAt, payload }` 백업, `online` 이벤트에서 `base_revision`과 함께 재전송, 진입 시 백업이 서버보다 새로우면 복원 후 재전송
    - [ ] `visibilitychange`/`focus` 복귀 시 clean 상태에서만 서버 초안 재조회, 서버 `revision`이 더 크면 교체(dirty·saving이면 덮어쓰지 않음). 저장 상태 표시의 시각은 서버 `updated_at`을 `formatKstTime`으로 표시(클라이언트 시계 미사용)
  - 완료 기준: 폰 → 태블릿 이어쓰기와 오프라인 복귀가 입력 유실 없이 동작하고, 늦게 도착한 옛 저장이 서버 초안을 덮어쓰지 않는다. `lib/dummy`가 존재하지 않고 참조도 없다.
  - 테스트 체크리스트:
    - 정상: `browser_type → 메모 입력 → 1초 대기 → "저장됨 HH:mm" 표시, execute_sql로 patrol_drafts.revision 증가 확인`
    - 정상: `browser_tabs(new) → 같은 계정으로 /protected/patrol → 첫 탭 입력 내용 복원`
    - 정상: `browser_navigate → 새로고침 → 초안 복원`
    - 정상: `browser_navigate → /protected/admin/tags (qa-admin) → DB의 태그 목록 표시(더미 아님)`
    - 오류: `browser_evaluate(오프라인 전환: context.setOffline 또는 fetch 차단) → 입력 → "오프라인" 표시, localStorage draft:{id} 존재 → 온라인 복귀 → 서버 저장, 상태 "저장됨"`
    - 오류(충돌): 탭 A·B 동시 편집 → B 저장 후 A 저장 → A에 "다른 기기에서 수정됨, 어느 쪽을 쓸까요?" 다이얼로그, 선택 결과대로 반영
    - 엣지: 서버 초안이 정리(cron)로 비워진 뒤 탭 A에서 입력 → 다이얼로그 없이 새 revision으로 재저장
    - 엣지: 빠른 연속 입력 20회 → 네트워크 탭에서 동시 요청 1개 이하(`browser_network_requests`)
    - 엣지: 탭 A가 dirty인 상태에서 포커스 복귀 → 서버 내용으로 덮어쓰지 않음
  - 테스트 결과: (미수행)

- **Task 021: 순찰 완료 및 결과 복사 구현**
  - 관련 기능: F05, F06
  - 설명: 대기 중인 저장을 먼저 보내고 `complete_patrol`을 멱등 호출한 뒤, 서버 완료 시각으로 복사 문구를 만든다.
  - 관련 파일: `hooks/use-patrol-draft.ts`, `app/protected/patrol/_components/patrol-action-bar.tsx`, `components/patrol/copy-button.tsx`
  - 구현 사항:
    - [ ] [순찰 완료]: 버튼 비활성화 → 대기 중 저장 즉시 flush 후 완료 대기 → `crypto.randomUUID()` 요청 ID 생성(같은 시도의 재시도에는 같은 ID 재사용) → `complete_patrol(id, revision)`
    - [ ] `ok`/`duplicate` 응답: 로컬 입력 초기화, `revision`을 응답값으로 갱신, `draft:{user_id}` 백업 삭제, 완료 기록(`patrolled_at`, 메모, 졸음/딴짓) 보관 → [복사] 활성
    - [ ] `conflict` 응답: 기록 미생성 안내 후 서버 초안을 다시 불러와 충돌 다이얼로그로 연결
    - [ ] [복사]: 완료 응답의 `patrolled_at`으로 `formatPatrolLine` 생성, 클릭 즉시 `writeText`(완료 후 자동 복사 금지), 실패 시 선택 입력란 대체
    - [ ] [다음 순찰]: 복사 상태 해제, 빈 입력으로 시작
    - [ ] 네트워크 오류로 응답을 못 받은 경우 같은 요청 ID로 재시도 버튼 제공
  - 완료 기준: 중복 탭·재시도에도 기록은 1건만 생기고, 완료 직후 복사 문구가 서버 시각과 일치한다.
  - 테스트 체크리스트:
    - 정상: `browser_click → 졸음 23, 메모 입력 후 [순찰 완료] → 입력 초기화, [복사] 활성 → [복사] → clipboard "HH:mm 순찰 → 완료 (메모 23번 졸아서 깨움)"`
    - 정상: 완료 후 `/logs`에 기록 1건, `business_date`가 현재 영업일
    - 정상: 빈 초안으로 완료 → `HH:mm 순찰 → 완료` 기록 생성
    - 오류(멱등): `browser_evaluate → 완료 요청을 같은 요청 ID로 2회 전송 → execute_sql로 기록 1건, 초안 revision 1회만 증가`
    - 오류(충돌): 탭 B에서 입력·저장 후 탭 A에서 완료 → 충돌 안내, 기록 미생성
    - 엣지: 입력 직후(디바운스 1초 이내) 완료 → 마지막 입력까지 기록에 포함
    - 엣지: 완료 버튼 연타 → 처리 중 비활성으로 요청 1개
  - 테스트 결과: (미수행)

- **Task 022: 퀵 태그 관리 기능 구현**
  - 관련 기능: F11, F03
  - 설명: 관리자 전용 Server Action과 `swap_quick_tag_order` RPC로 태그를 운영한다.
  - 관련 파일: `app/protected/admin/tags/page.tsx`, `app/protected/admin/tags/actions.ts`(신규), `app/protected/admin/tags/_components/*`, `lib/queries/quick-tags.ts`
  - 구현 사항:
    - [ ] 페이지: Task 016의 `requireAdmin()` 호출 뒤 전체 태그(숨김 포함) `sort_order` 순 조회(Task 020에서 연결한 조회 사용)
    - [ ] Action 5종(`createTag`, `updateTagLabel`, `toggleTagActive`, `deleteTag`, `swapTagOrder`) 모두 `requireAdmin()` 호출, `normalizeTagLabel` 적용, 새 태그 `sort_order = max + 1`
    - [ ] DB 오류 매핑: unique 위반(23505) → "이미 있는 문구입니다", check 위반 → "개행 없이 입력해 주세요"
    - [ ] 변경 후 태그 목록 갱신, 순찰 기록 페이지는 다음 진입/새로고침 시 반영
  - 완료 기준: 관리자만 조작 가능하고 변경이 순찰 기록 화면의 버튼에 반영된다. 과거 기록 메모는 변하지 않는다.
  - 테스트 체크리스트:
    - 정상: `(qa-admin) 태그 추가 → /protected/patrol 새로고침 → 버튼 표시`
    - 정상: 숨김 전환 → 순찰 화면에서 사라지고 관리 화면에는 흐리게 표시
    - 정상: [아래로] → 두 태그 순서 교체, `execute_sql`로 `sort_order` 맞바뀜 확인
    - 오류: `browser_navigate → /protected/admin/tags (qa-manager) → /logs?notice=admin-required, "관리자 권한이 필요합니다"`
    - 오류: `(qa-pending) 직접 접근 → 승인 대기 안내` / `(비로그인) → 로그인 페이지`
    - 오류: 중복 문구(`"화장실 정리 "`, 대소문자만 다른 영문) 추가 → 중복 안내
    - 엣지: 태그 삭제 후 `/logs`의 과거 기록 메모 그대로
  - 테스트 결과: (미수행)

- **Task 023: 핵심 기능 통합 테스트**
  - 관련 기능: F01~F11
  - 설명: Playwright MCP로 역할별 전체 사용자 여정을 확인하고, 실패 항목은 해당 Task로 되돌린다.
  - 관련 파일: (코드 변경 없음, 결과는 이 문서의 테스트 결과 줄에 기록)
  - 구현 사항:
    - [ ] 비로그인 여정: `/logs` 열람 → 복사 → [순찰 기록 작성] → 로그인 안내 → 로그인 → `/protected/patrol` 복귀
    - [ ] pending 여정: 승인 대기 배너, 작성 버튼 메시지, `/protected/patrol`·`/protected/admin/tags` 직접 접근 시 `/logs`로 돌아오며 안내
    - [ ] manager 여정: 입력 → 자동 저장 → 다른 탭 이어쓰기 → 완료 → 복사 → 다음 순찰 → `/logs`에서 본인 기록 수정·자리비움 이동 → 로그아웃 후 `draft:` 백업 없음
    - [ ] admin 여정: 태그 추가/숨김/순서 변경 → 순찰 화면 반영 → 타인 기록 수정·삭제
    - [ ] 강등 시나리오: manager를 대시보드에서 pending으로 변경 → 작성·수정 차단, 과거 기록 작성자 이름 유지
    - [ ] 보안 재확인: anon 키로 REST에서 `profiles` 조회, `patrol_logs` insert, RPC 호출이 모두 거부됨(curl)
  - 완료 기준: 위 여정이 모두 통과하고 콘솔 에러가 없다. `npm run build` 통과.
  - 테스트 체크리스트:
    - 정상: 역할별 여정 4종 각각 `browser_navigate/click/type → 기대 화면` 스냅샷 기록
    - 오류: 권한 우회 시도(직접 URL, 직접 RPC/REST 호출) 전부 거부
    - 엣지: 영업일 경계 데이터(03:59/04:00 완료로 조정한 기록)가 올바른 날짜에 표시
  - 테스트 결과: (미수행)

### Phase 6: 실기기 검증, 최적화, 배포

- **Task 024: 실기기 및 운영 환경 검증**
  - 관련 기능: F01, F06, F07
  - 설명: PRD "구현 전 확인 항목" 중 실기기·외부 설정이 필요한 항목을 확인하고 결과를 기록한다.
  - 관련 파일: `README.md`(운영 메모), Supabase 대시보드 설정
  - 구현 사항:
    - [ ] HTTPS 터널(예: `cloudflared`, `ngrok`)로 개발 서버 노출(`http://192.168.x.x`는 클립보드가 막힘), 터널 주소를 Supabase Redirect URLs와 `allowedDevOrigins`에 필요 시 추가
    - [ ] iOS Safari, Android Chrome에서 [복사] 즉시 복사 및 실패 시 선택 입력란 대체 동작 확인, 구글 시트 붙여넣기 시 한 셀에 한 줄로 들어가는지 확인
    - [ ] 카카오톡 인앱 브라우저: Google 로그인 차단 시 안내 노출, 이메일 확인 링크 동작 확인
    - [ ] Google 가입자의 `full_name` 수신 재확인(현재 확인됨)
    - [ ] `pg_cron` 실제 실행 이력(`cron.job_run_details`) 확인
    - [ ] 태블릿 가로/세로, 키패드 터치 타깃 48px, 하단 액션바가 가상 키보드에 가려지지 않는지 확인
  - 완료 기준: 모든 확인 항목의 결과(기기/OS/브라우저 버전 포함)가 기록되고 실패 항목은 수정 Task로 등록된다.
  - 테스트 체크리스트:
    - 정상: iOS Safari [복사] → 시트 붙여넣기 → 한 줄
    - 오류: 클립보드 권한 거부 환경 → 선택 입력란 표시
    - 엣지: 폰에서 입력 → 태블릿에서 이어쓰기 → 완료
  - 테스트 결과: (미수행)

- **Task 025: 품질·성능·보안 점검**
  - 관련 기능: 전체
  - 설명: 출시 전 접근성, 성능, 보안 권고를 점검하고 스타터 잔재를 마지막으로 정리한다.
  - 관련 파일: 전반, `app/not-found.tsx`, `app/error.tsx`, `supabase/migrations/*`
  - 구현 사항:
    - [ ] Supabase `get_advisors`(security, performance) 경고 해소(외래 키 인덱스, RLS 정책 내 `(select auth.uid())` 형태 등)
    - [ ] 전역 `error.tsx`/`not-found.tsx` 한국어 화면, 로딩 스켈레톤 점검
    - [ ] 접근성: 버튼 `aria-label`, 저장 상태 `aria-live`, 포커스 이동(다이얼로그), 색 대비(다크 모드 포함)
    - [ ] Lighthouse(모바일) 성능·접근성 점수 확인, 불필요한 클라이언트 번들(lucide 개별 import 등) 점검
    - [ ] `hasEnvVars` 튜토리얼 분기와 `env-var-warning` 정리 여부 결정, `CLAUDE.md`·`docs/guides/project-structure.md`를 실제 구조로 갱신
  - 완료 기준: advisors 경고 0(또는 수용 사유 기록), Lighthouse 모바일 접근성 90 이상, `npm run check`와 `npm run build` 통과.
  - 테스트 체크리스트:
    - 정상: `browser_navigate → /없는경로 → 한국어 404`
    - 엣지: 키보드만으로 순찰 입력 → 완료 → 복사 가능
  - 테스트 결과: (미수행)

- **Task 026: 운영 배포 및 출시 준비**
  - 관련 기능: 전체
  - 설명: 운영 환경(예: Vercel)에 배포하고 Supabase 인증 설정과 초기 운영 데이터를 맞춘다.
  - 관련 파일: `.env.example`, `README.md`
  - 구현 사항:
    - [ ] 운영 환경 변수(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) 설정, HTTPS 도메인 확인
    - [ ] Supabase Site URL, Redirect URLs(`/auth/callback`, `/auth/confirm`), Google OAuth 승인된 리디렉션 URI를 운영 도메인으로 갱신
    - [ ] 마이그레이션 원격 적용 상태(`list_migrations`)와 로컬 파일 일치 확인, 퀵 태그 seed 확인
    - [ ] 첫 관리자 지정(대시보드에서 `profiles.role = 'admin'`) 및 매니저 승격 절차를 README에 정리, QA 계정 정리
    - [ ] 운영 도메인에서 Task 023 핵심 여정 스모크 테스트
  - 완료 기준: 운영 URL에서 로그인 → 순찰 완료 → 복사 → 일지 조회가 동작한다.
  - 테스트 체크리스트:
    - 정상: `browser_navigate → 운영 URL/logs → 200, 기록 표시`
    - 정상: 운영에서 Google 로그인 → `/logs` 복귀
    - 오류: 운영에서 비로그인 `/protected/patrol` → 로그인 페이지
  - 테스트 결과: (미수행)

## 주요 설계 결정

| 항목                     | 결정                                                                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 개발 순서                | DB 독립 모듈(Phase 2)과 더미 UI(Phase 3)를 먼저 완성하고 Task 011에서 요구사항·데이터 모델을 확정한 뒤 DB(Phase 4)를 만든다                       |
| UI ↔ 데이터 경계         | 컴포넌트는 Task 002 타입과 `viewer` prop만 받고, 저장·완료는 `PatrolDraftAdapter` 인터페이스로 주입(Phase 3 가짜 어댑터 → Task 020 RPC 구현 교체) |
| 초안 저장·완료 호출 경로 | 브라우저 Supabase 클라이언트에서 RPC 직접 호출(지연 최소화). RPC는 `authenticated`에만 실행 권한, 본문에서 `is_staff()` 재검사                    |
| 기록 정정·태그 관리      | Server Action + `requireStaff()`/`requireAdmin()`, 최종 판단은 RLS·컬럼 GRANT. 0행 갱신은 권한 없음으로 처리                                      |
| 화면 권한 판정           | `lib/permissions.ts`의 `canEdit(log, viewer)` 등 한 곳에서만 판정(편의 기능, 최종 방어선은 RLS)                                                   |
| 영업일 계산              | 기록의 영업일은 `complete_patrol`이 `private.business_date_of(now())`로 계산. TS `lib/business-date.ts`는 표시·기본값 전용                        |
| `?date` 오류 처리        | 형식이 틀리거나 존재하지 않는 날짜면 리디렉션 없이 현재 영업일 표시                                                                               |
| 방치 초안 정리           | 2시간 이상 지난 **비어 있지 않은** 초안만 초기화(빈 초안의 불필요한 `revision` 증가 방지)                                                         |
| 작성자 이름              | `patrol_logs.author_id`가 `profiles`와 `staff_names`를 모두 참조해 PostgREST embed로 함께 조회                                                    |
| 권한 미달 안내           | 서버 리디렉션은 `/logs?notice=<코드>`로 전달하고 공통 배너가 문구를 표시                                                                          |
| 순수 함수 검증           | 테스트 러너를 추가하지 않고 임시 스크립트(커밋 제외)와 Supabase MCP SQL, Playwright MCP로 검증. 러너 도입은 MVP 이후 검토                         |

## MVP 이후 (로드맵 범위 제외)

- 통계/리포트, 다중 지점, 30분 리마인더 알림, 좌석 배치도 UI, 실시간 공동 편집
- 관리자 역할 지정 화면(현재는 Supabase 대시보드에서 수동 승격)
- 자동화 테스트 러너(Vitest/Playwright Test) 및 CI 파이프라인 도입
