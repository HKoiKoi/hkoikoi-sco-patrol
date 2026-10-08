# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## 명령어

```bash
npm run dev     # 개발 서버 (Turbopack 기본)
npm run build   # 프로덕션 빌드
npm run start   # 빌드 결과 실행
npm run lint    # eslint . (Next 16에서 `next lint`는 제거됨)
npm run lint:fix      # eslint . --fix
npm run format        # prettier --write . (format:check는 검사만)
npm run typecheck     # tsc --noEmit
npm run check         # typecheck + lint + format:check
npm run check-all     # check + build (PR/배포 전 최종 검증, CI와 동일)
```

테스트 러너는 설정되어 있지 않다. 환경변수는 `.env.example`을 복사해 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`를 채운다(`DATA_DIR`, `TEMPLATES_USE`, `ENABLE_GUI`는 shrimp Task Manager용).

## 품질 도구

- **Prettier**(`.prettierrc.json`): printWidth 80, `prettier-plugin-tailwindcss`가 `app/globals.css` 기준으로 클래스 정렬(`cn`, `cva` 포함). ESLint는 `eslint-config-prettier`로 포맷 규칙 충돌을 끈다.
- **Husky**: `pre-commit`은 lint-staged(변경 파일 eslint --fix + prettier), `pre-push`는 `typecheck` + `lint`. CI(`.github/workflows/ci.yml`)가 `check-all`로 최종 검증하므로 `--no-verify`로 우회하지 않는다.
- **Claude 훅**: `.claude/hooks/format-hook.sh`가 Write/Edit 직후 해당 파일에 prettier + eslint --fix를 실행한다. 새 훅 스크립트는 반드시 실행 권한(`chmod +x`)을 부여한다.
- **Playwright MCP**: UI를 변경하면 `npm run dev` 후 Playwright MCP로 렌더링과 콘솔 오류를 확인한다.
- 작업 완료 전 `npm run check-all`을 통과시킨다.

## 아키텍처

`create-next-app --example with-supabase` 스타터 기반의 Next.js 16(App Router) + React 19 + Supabase Auth + Tailwind v4 + shadcn/ui 프로젝트다. `src/` 없이 루트 직하에 `app/`, `components/`, `lib/`를 두며 경로 별칭은 `@/*` → `./*`.

- **`next.config.ts`의 `cacheComponents: true`**: Cache Components 모드다. 동적 데이터(`cookies()`, Supabase 호출 등)에 접근하는 컴포넌트는 `<Suspense>` 경계 안에 두어야 한다(예: `app/protected/layout.tsx`의 `<Suspense><AuthButton /></Suspense>`). `params`/`cookies()` 등은 항상 `await`.
- **`proxy.ts`(구 `middleware.ts`)**: 모든 요청에서 `lib/supabase/proxy.ts`의 `updateSession()`을 실행해 Supabase 세션 쿠키를 갱신하고, 비로그인 사용자가 `/`, `/login*`, `/auth*` 이외 경로에 접근하면 `/auth/login`으로 리다이렉트한다. `createServerClient`와 `supabase.auth.getClaims()` 사이에 코드를 넣지 말고, 반환하는 `supabaseResponse` 객체를 그대로 유지해야 세션이 끊기지 않는다.
- **Supabase 클라이언트 (`lib/supabase/`)**: `client.ts`(브라우저), `server.ts`(서버 컴포넌트/라우트 핸들러), `proxy.ts`(proxy용). 서버 클라이언트는 전역 변수에 저장하지 말고 함수 호출마다 `createClient()`로 새로 만든다. 사용자 확인은 `getSession()`이 아닌 `getClaims()` 사용.
- **인증 흐름 (`app/auth/*`)**: login / sign-up / forgot-password / update-password 페이지와 이메일 확인용 `app/auth/confirm/route.ts`. 폼 컴포넌트는 `components/*-form.tsx`. 로그인 후 보호 영역은 `app/protected/`.
- **`hasEnvVars` (`lib/utils.ts`)**: Supabase 환경변수 유무 플래그로, 없으면 proxy 검사를 건너뛰고 UI에 `EnvVarWarning`을 표시한다.
- **UI**: `components/ui/`는 shadcn/ui(`components.json`로 관리, 추가는 shadcn CLI/MCP 사용). `components/tutorial/`, `hero.tsx`, `deploy-button.tsx`, `next-logo.tsx` 등은 스타터 데모 코드로 실제 기능 개발 시 정리 대상이다. 스타일 병합은 `lib/utils.ts`의 `cn()`.

## Next.js 버전 주의

`AGENTS.md`(next dev가 자동 생성, 직접 편집 금지)가 지시하듯, 이 Next.js는 학습 데이터와 다르다. 코드를 쓰기 전 `node_modules/next/dist/docs/`의 관련 문서를 먼저 읽는다.

## 프로젝트 문서와 도구

- `docs/guides/`에 한국어 개발 가이드가 있다: `nextjs-16.md`(15→16 변경점·필수 규칙), `project-structure.md`, `component-patterns.md`, `styling-guide.md`, `forms-react-hook-form.md`. 해당 영역 작업 전에 참고한다. (`react-hook-form`/`zod`는 가이드에만 있고 아직 `package.json`에는 없다.)
- `.claude/agents/`에 서브에이전트(code-reviewer, nextjs-app-router-expert, ui-markup-specialist, development-planner, prd-generator 등), `.claude/skills/git-commit`에 커밋 스킬이 있다. 커밋 메시지는 `타입: 제목` 형식의 한국어 컨벤셔널 커밋.
- `.mcp.json`: Supabase(프로젝트 `emzwnpukyceuppbtrjfc`), sequential-thinking, shrimp-task-manager, shadcn MCP 서버. `.claude/settings.json`은 언어를 `ko`로 설정하고 Notification/Stop 훅(`.claude/hooks/*.sh`)을 등록한다.
- 사용자 응답과 문서는 한국어로 작성한다.
