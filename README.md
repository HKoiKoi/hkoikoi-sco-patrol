# SCO 순찰 일지

SCO 관리형 독서실의 30분 간격 순찰 업무를 스마트폰/태블릿에서 최소 터치로 기록하고, 결과를 구글 스프레드시트에 한 줄씩 붙여넣을 수 있게 하는 웹 앱입니다.

## 주요 기능

- **일지 조회** (`/logs`): 영업일 기준 전원의 순찰 타임라인을 로그인 없이 열람하고 날짜를 이동합니다. 기록별 한 줄 복사를 지원합니다.
- **순찰 기록** (`/protected/patrol`): 스탠딩/카페존/졸음·딴짓/자리비움 좌석 번호, 퀵 태그, 메모를 입력하면 약 1초 뒤 서버에 자동 저장되고 기기 간 이어쓰기가 됩니다. 순찰 완료 후 구글 시트용 한 줄 문자열을 복사합니다.
- **기록 정정**: 확정 기록의 수정·삭제와 자리비움 번호 사후 이동·삭제 (본인 기록 또는 관리자).
- **퀵 태그 관리** (`/protected/admin/tags`): 관리자가 태그를 추가·수정·정렬·숨김·삭제합니다.
- **인증과 역할**: Google 로그인과 이메일 가입을 지원합니다. 신규 가입자는 `pending`이며 `manager`/`admin` 승격은 Supabase 대시보드에서 수동으로 처리합니다.

| 구분      | 일지 조회 | 순찰 기록 작성 | 본인 기록 수정·삭제 | 타인 기록 수정·삭제 | 퀵 태그 관리 |
| --------- | --------- | -------------- | ------------------- | ------------------- | ------------ |
| 비로그인  | ✅        | ❌             | ❌                  | ❌                  | ❌           |
| `pending` | ✅        | ❌             | ❌                  | ❌                  | ❌           |
| `manager` | ✅        | ✅             | ✅                  | ❌                  | ❌           |
| `admin`   | ✅        | ✅             | ✅                  | ✅                  | ✅           |

## 기술 스택

- Next.js 16.4.0 (App Router, `proxy.ts`, Cache Components), React 19, TypeScript 5
- Supabase (`@supabase/ssr`, Postgres, RLS, RPC, `pg_cron`)
- Tailwind CSS v4, shadcn/ui + Radix UI, lucide-react, next-themes
- ESLint 9, Prettier, Husky, lint-staged

## 개발 진행

[`docs/ROADMAP.md`](docs/ROADMAP.md)가 Phase 0~6, Task 000~026 단위로 진행 현황을 관리합니다.

| Phase | 내용                                                                 |
| ----- | -------------------------------------------------------------------- |
| 0     | 기반 환경 (스타터, Google/이메일 로그인, 린트·Husky) — 완료          |
| 1     | 스타터 잔재 정리, 라우트 골격, 도메인 타입                           |
| 2     | DB 스키마·RLS·RPC, `pg_cron` 정리 작업, DB 타입 생성, QA 계정        |
| 3     | 공통 모듈: 영업일, 복사 문구, 좌석·태그 문구, DAL, `next` 검증       |
| 4     | 화면 UI (더미 데이터): 레이아웃, 일지 조회, 순찰 기록, 태그 관리     |
| 5     | 핵심 기능: 인증 흐름, 실데이터 조회, 수정·삭제, 자동 저장, 완료·복사 |
| 6     | 실기기 검증, 품질·성능·보안 점검, 운영 배포                          |

## 문서

- [`docs/PRD.md`](docs/PRD.md) — 제품 요구사항, 데이터 모델, 접근 규칙
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — Phase/Task 단위 개발 계획과 진행 현황
- [`docs/guides/`](docs/guides) — 프로젝트 구조, 컴포넌트 패턴, 스타일링, Next.js 16, react-hook-form 가이드
- [`CLAUDE.md`](CLAUDE.md) — Claude Code용 작업 지침

## 로컬 실행

1. Supabase 프로젝트를 만들고 의존성을 설치합니다.

   ```bash
   npm install
   ```

2. `.env.example`을 `.env`(또는 `.env.local`)로 복사해 값을 채웁니다.

   ```env
   NEXT_PUBLIC_SUPABASE_URL=[Supabase 프로젝트 URL]
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=[Supabase publishable 또는 anon 키]
   ```

   두 값은 [Supabase 프로젝트 API 설정](https://supabase.com/dashboard/project/_?showConnect=true)에서 확인할 수 있습니다.

3. `supabase/migrations/`의 마이그레이션을 적용하고, 개발 서버를 실행합니다.

   ```bash
   npm run dev
   ```

   [localhost:3000](http://localhost:3000/)에서 확인합니다.

> 복사 기능은 HTTPS(보안 컨텍스트)에서만 동작합니다. 실기기 테스트 시 `http://192.168.x.x` 접속에서는 복사가 막히므로 배포된 HTTPS 주소(`https://sco.hkoikoi.dev`)에서 확인하세요. 터널을 쓰려면 `next.config.ts`의 `allowedDevOrigins`에 터널 호스트가 필요합니다(`*.trycloudflare.com`, `*.ngrok-free.app` 등록됨).

## 명령어

```bash
npm run dev          # 개발 서버
npm run build        # 프로덕션 빌드
npm run start        # 빌드 결과 실행
npm run lint         # ESLint (lint:fix로 자동 수정)
npm run typecheck    # tsc --noEmit
npm run format       # Prettier (format:check는 검사만)
npm run check        # typecheck + lint + format:check
```

커밋 전 `lint-staged`가 ESLint와 Prettier를 실행하고, 푸시 전 `typecheck`가 실행됩니다. 커밋 메시지는 한국어 컨벤셔널 형식(`타입: 제목`)을 따릅니다.

테스트 러너는 없습니다. 순수 함수는 임시 스크립트, DB는 Supabase MCP SQL, 화면은 Playwright MCP로 검증합니다 (자세한 방식은 ROADMAP 참고).

## 운영 메모

- **역할 지정**: 신규 가입자는 모두 `pending`입니다. Supabase 대시보드 Table Editor에서 `profiles.role`을 `manager` 또는 `admin`으로 바꿉니다. 첫 관리자도 같은 방식으로 직접 지정합니다. `role`은 앱에서 변경할 수 없습니다.
- **강등**: 사용자를 삭제하지 말고 `pending`으로 강등합니다. 이후 작성·수정·삭제가 막히고 과거 기록의 작성자 이름은 유지됩니다.
- **인증 설정(수동)**: 이메일 확인 메일 템플릿 링크를 `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/logs`로 바꾸고, Site URL과 Redirect URLs(`/auth/callback`, `/auth/confirm`, 로컬·HTTPS 터널·운영 도메인), Google OAuth 승인된 리디렉션 URI를 등록합니다.
- **첫 관리자 지정 절차**: 가입(또는 대시보드 Authentication → Users → Add user, Auto Confirm User 체크)으로 계정을 만든 뒤, Table Editor에서 `profiles.role`을 `admin`으로 바꿉니다. 이후 관리자와 매니저 승격도 같은 방식입니다.
- **`pg_cron`**: 방치 초안 정리 스케줄을 위해 확장이 활성화되어 있어야 합니다. 스케줄 `reset-stale-patrol-drafts`는 30분마다 `private.reset_stale_drafts()`를 실행합니다. 확인 쿼리:
  - 등록 확인: `select jobname, schedule, command, active from cron.job;`
  - 실행 이력: `select status, return_message, start_time from cron.job_run_details order by start_time desc limit 10;`
- **QA 계정**: 개발·검증용이며 Gmail `+` 별칭을 씁니다. 비밀번호는 문서에 적지 않고 비밀번호 관리자에 보관합니다.

  | 계정          | 이메일                               | 역할      |
  | ------------- | ------------------------------------ | --------- |
  | `qa-admin`    | `koikoilove99+qa-admin@gmail.com`    | `admin`   |
  | `qa-manager`  | `koikoilove99+qa-manager@gmail.com`  | `manager` |
  | `qa-manager2` | `koikoilove99+qa-manager2@gmail.com` | `manager` |
  | `qa-pending`  | `koikoilove99+qa-pending@gmail.com`  | `pending` |

  운영 배포 전에 QA 계정을 삭제하거나 `pending`으로 강등합니다.

- 실기기 확인 결과와 운영 절차는 ROADMAP Task 015, 024, 026 진행에 맞춰 이 절에 보강합니다.
