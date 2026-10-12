---
name: git-pr
description: >-
  GitHub Pull Request를 생성하고 관리합니다. 커밋 히스토리와 변경사항을 분석해 한국어 제목·설명을 작성하고 `gh`로 PR을 만들며,
  Draft/Ready 전환, 상태 확인, 리뷰 대기 목록 조회도 처리합니다.
  "PR 만들어줘", "PR 올려줘", "풀 리퀘스트 생성", "PR 설명 작성", "draft PR", "ready for review", "PR 상태",
  "create pull request", "open a PR", "/git:pr" 등 Pull Request와 관련된 요청이면 반드시 이 스킬을 사용하세요.
  사용자가 스킬 이름을 말하지 않아도 PR 작업이면 사용합니다.
allowed-tools:
  - Bash(gh pr:*)
  - Bash(gh api:*)
  - Bash(gh repo:*)
  - Bash(git push:*)
  - Bash(git status:*)
  - Bash(git log:*)
  - Bash(git diff:*)
  - Bash(git branch:*)
  - Bash(git fetch:*)
---

# GitHub Pull Request

현재 브랜치의 변경사항을 분석해 PR을 만들고 관리한다. PR은 외부에 보이는 작업이므로, 생성·병합·닫기 전에는 내용을 보여주고 사용자 확인을 받는다.

## 요청 해석

- 새 PR 생성 (제목 지정 여부, `--draft` 여부 포함) → 생성 워크플로
- "ready로 바꿔줘" → `gh pr ready`
- "PR 상태 / 리뷰 대기 중인 PR" → 조회 (`gh pr status`, `gh pr list`, `gh pr view`)
- 병합·닫기 → 대상 PR과 영향을 확인받은 뒤에만 `gh pr merge` / `gh pr close`

## 생성 워크플로

1. **사전 점검** (병렬 실행 가능)
   - `git status`: uncommitted 변경사항이 있으면 PR에 포함되지 않음을 알리고, 커밋이 필요하면 `git-commit` 스킬을 안내한다.
   - `git branch --show-current`: 기본 브랜치(main/develop)에서 PR을 만들려는 거라면 중단하고 `git-branch` 스킬로 브랜치부터 만들도록 안내한다.
   - `gh pr list --head <현재 브랜치>`: 이미 열린 PR이 있으면 새로 만들지 말고 알린다.
2. **변경사항 분석**
   - `git fetch` 후 `git log <base>..HEAD`로 커밋 목록, `git diff <base>...HEAD --stat`으로 파일 변경 범위를 확인한다.
   - 단순히 커밋 메시지를 이어 붙이지 말고, 변경의 목적과 영향을 읽어낸다.
3. **푸시**: 원격에 브랜치가 없거나 뒤처져 있으면 `git push -u origin <브랜치>`. force push는 하지 않는다.
4. **제목·본문 작성**: 아래 규칙대로 초안을 만들어 사용자에게 보여준다.
5. **확인 후 생성**: `gh pr create --title ... --body ...` (Draft면 `--draft`). 본문은 heredoc으로 넘겨 줄바꿈이 깨지지 않게 한다.
6. 생성된 PR URL을 알려준다.

## 제목 규칙

`git-commit` 스킬과 같은 컨벤셔널 형식 `타입: 제목`을 쓴다. 이 저장소의 최근 PR/커밋 스타일이 있으면 그것이 우선한다.

- 타입: `feat`, `fix`, `docs`, `refactor`, `test`, `chore` 등
- 커밋이 하나면 그 제목을 그대로 쓰고, 여러 개면 전체를 아우르는 제목을 새로 쓴다.
- 브랜치 프리픽스(`feature/` → `feat`, `fix/` → `fix`, `docs/` → `docs`, `chore/` → `chore`)로 타입을 추정하되, 실제 변경과 다르면 변경 내용을 따른다.
- 70자 이내, 마침표 없이 한국어로 작성한다.

## 본문 템플릿

저장소에 `.github/pull_request_template.md`가 있으면 그것을 우선 사용한다. 없으면 아래 형식을 쓰되, 해당 없는 섹션은 지운다.

```markdown
## 변경사항 요약

(무엇을 왜 바꿨는지 1~3문장)

## 주요 변경내용

- 변경사항 1
- 변경사항 2

## 테스트 방법

(리뷰어가 확인할 수 있는 시나리오. 실제로 실행해 본 것만 적는다.)

## 관련 이슈

Closes #번호   (없으면 섹션 삭제)

## 참고사항

(리뷰어가 알아야 할 점, UI 변경 시 스크린샷)
```

- 하지 않은 테스트를 했다고 적지 않는다. 확인하지 못했다면 그렇게 쓴다.
- 체크리스트는 실제로 해당 작업이 있을 때만 넣는다. 형식적인 체크박스를 채우지 않는다.
- 브랜치명이나 커밋 메시지에 이슈 번호가 있으면 `Closes #번호`로 연결한다.

## 메타데이터

- 라벨, 리뷰어, 마일스톤은 사용자가 지정했거나 `CODEOWNERS`처럼 저장소에 근거가 있을 때만 설정한다.
- 라벨은 `gh label list`에 존재하는 것만 쓴다. 없는 라벨을 임의로 만들지 않는다.
- Breaking change가 있으면 본문 상단에 명시한다.

## 관리 작업

| 요청 | 명령 |
|---|---|
| Draft → Ready | `gh pr ready` |
| Ready → Draft | `gh pr ready --undo` |
| 내 PR 상태 | `gh pr status` |
| 리뷰 대기 목록 | `gh pr list --search "review-requested:@me"` |
| 충돌 있는 PR | `gh pr list --json number,title,mergeable` 후 `CONFLICTING` 필터 |
| PR 상세/체크 | `gh pr view`, `gh pr checks` |

병합(`gh pr merge`)과 닫기(`gh pr close`)는 되돌리기 어려우므로 PR 번호, 병합 방식(merge/squash/rebase), CI 상태를 보여주고 명시적 동의를 받은 뒤 실행한다. 일괄 병합·일괄 닫기는 하지 않는다.

## 문제 해결

- **`gh` 인증 오류** → `! gh auth login`을 직접 실행하도록 안내한다(대화형이라 대신 실행할 수 없다).
- **푸시 거부** → 원격이 앞서 있으면 `git fetch` 후 상태를 보여주고, 사용자가 방법을 정하게 한다. force push로 해결하지 않는다.
- **PR 생성 실패** → 중복 PR, base 브랜치 이름, 푸시 여부 순으로 확인한다.
- **Secret 의심** → diff에 키·토큰으로 보이는 문자열이 있으면 생성 전에 알리고 멈춘다.
