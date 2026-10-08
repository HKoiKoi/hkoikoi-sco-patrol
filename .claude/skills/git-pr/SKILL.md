---
name: git-pr
description: >-
  현재 브랜치의 커밋과 변경사항을 분석해 한국어 GitHub Pull Request를 생성하고, Draft/Ready 전환과 상태 확인까지 처리합니다.
  "PR 만들어줘", "풀리퀘스트 올려줘", "PR 생성", "draft PR", "PR을 ready로 전환", "PR 상태 확인", "create a PR",
  "open a pull request" 등 Pull Request 관련 요청이면 사용자가 스킬 이름을 말하지 않아도 이 스킬을 사용하세요.
allowed-tools: Bash(gh pr:*) Bash(gh api:*) Bash(gh repo:*) Bash(git push:*) Bash(git status:*) Bash(git log:*) Bash(git diff:*) Bash(git branch:*) Bash(git fetch:*)
---

# Pull Request 생성·관리

`gh` CLI로 PR을 만들고 관리한다. PR은 외부에 공개되는 행위이므로 **생성 전에 제목·본문·대상 브랜치를 사용자에게 보여주고 확인받는다.** 사용자가 제목을 직접 줬다면 그 제목을 쓴다.

## 지원하는 요청

| 요청                              | 동작                                       |
| --------------------------------- | ------------------------------------------ |
| PR 생성 (제목 지정 여부 무관)     | 아래 "PR 생성 워크플로"                    |
| Draft로 생성                      | `gh pr create --draft`                     |
| Draft → Ready 전환                | `gh pr ready`                              |
| 상태 확인                         | `gh pr status`, `gh pr view`, `gh pr checks` |
| 리뷰 대기·충돌 PR 목록            | `gh pr list` (필요 시 `--search`)          |

병합(`gh pr merge`)·닫기(`gh pr close`)는 허용 범위 밖이다. 요청받으면 명령을 안내하고 사용자가 직접 실행하게 한다.

## PR 생성 워크플로

1. **상태 점검** (병렬 실행 가능)
   - `git status`: uncommitted 변경사항이 있으면 먼저 알린다. 커밋은 `git-commit` 스킬을 안내한다.
   - `git branch --show-current`: `main`에서 직접 PR을 만들 수 없다. 이 경우 `git-branch` 스킬로 브랜치를 먼저 만들도록 안내한다.
   - `git fetch` 후 `git log origin/main..HEAD --oneline`: PR에 들어갈 커밋.
   - `git diff origin/main...HEAD --stat`: 변경 파일과 규모.
   - `gh pr list --head <현재 브랜치>`: 이미 열린 PR이 있으면 중복 생성하지 않고 알린다.
2. **변경 분석**: 커밋 메시지와 diff를 읽고 무엇을, 왜 바꿨는지 파악한다. 브랜치 프리픽스(`feature/`, `fix/` 등)는 유형 판단의 힌트다.
3. **제목 작성**: 이 저장소의 커밋 관례와 같은 `타입: 제목` 형식의 한국어. 예) `feat: 사용자 인증 기능 추가`, `fix: 로그인 검증 오류 수정`. 70자 안팎으로 짧게. 이모지는 붙이지 않는다.
4. **본문 작성**: 아래 템플릿을 채운다. 해당 없는 절은 지운다.
5. **사용자 확인**: 제목, 본문, 대상 브랜치(기본 `main`), Draft 여부를 보여주고 승인받는다.
6. **푸시**: 원격에 브랜치가 없거나 뒤처져 있으면 `git push -u origin <브랜치>`. 강제 푸시(`--force`)는 하지 않는다.
7. **생성**: `gh pr create --base main --title "..." --body "$(cat <<'EOF' ... EOF)"`. 라벨·리뷰어는 사용자가 지정했거나 저장소에 이미 존재하는 라벨일 때만 `--label`, `--reviewer`로 붙인다. 존재하지 않는 라벨을 만들어 내지 않는다.
8. **결과 보고**: PR URL을 알려준다.

## 본문 템플릿

```markdown
## 변경사항 요약

<무엇을 바꿨는지 1~3문장>

## 배경 및 목적

<왜 필요한지. 커밋 메시지와 브랜치명에서 도출>

## 주요 변경내용

- <변경 1>
- <변경 2>

## 테스트 방법

- [ ] `npm run check-all` 통과 (typecheck + lint + format + build)
- [ ] <수동 확인 시나리오>

## 스크린샷 (UI 변경 시)

<Before / After>

## 관련 이슈

Closes #<번호>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

- 이 저장소에는 테스트 러너가 없으므로 테스트 절에는 `npm run check-all`과 수동 확인 시나리오를 적는다. 실제로 실행하지 않은 검증을 통과했다고 쓰지 않는다.
- UI를 바꿨다면 Playwright MCP로 확인한 내용을 적는다.
- 연결할 이슈가 없으면 "관련 이슈" 절을 지운다.

## 유형별 보강

- **기능(feat)**: 요구사항, 사용자 시나리오
- **버그(fix)**: 재현 방법, 근본 원인, 수정 방법
- **문서(docs)**: 변경 범위, 검토 포인트

## 문제 해결

- `gh` 인증 오류: 사용자에게 `! gh auth login` 실행을 안내한다.
- 푸시 거부: 원격 브랜치가 앞서 있는지 `git fetch`로 확인하고, 강제 푸시 대신 사용자에게 상황을 설명한다.
- 생성 실패: 중복 PR 여부와 base 브랜치를 확인한다.
- CI는 PR 생성 시 `.github/workflows/ci.yml`이 `check-all`로 자동 실행된다. 결과는 `gh pr checks`로 확인한다.
