---
name: git-branch
description: >-
  Git 브랜치를 생성·전환·삭제·정리합니다. 브랜치명 규칙(`feature/`, `fix/` 등)을 검증하고, 전환 전 uncommitted 변경사항을 안전하게 처리합니다.
  "브랜치 만들어줘", "feature/xxx 브랜치로 전환", "브랜치 정리", "병합된 브랜치 삭제", "브랜치 목록", "새 브랜치 따줘",
  "create branch", "switch branch" 등 브랜치 관리 요청이면 사용자가 스킬 이름을 말하지 않아도 이 스킬을 사용하세요.
allowed-tools: Bash(git branch:*) Bash(git checkout:*) Bash(git switch:*) Bash(git status:*) Bash(git stash:*) Bash(git log:*) Bash(git fetch:*)
---

# Git 브랜치 관리

브랜치 생성, 전환, 삭제, 정리를 안전하게 수행한다. 브랜치명이 주어지면 바로 생성·전환하고, 없으면 사용자가 원하는 작업(생성 / 전환 / 목록 / 삭제 / 원격 정리)을 먼저 확인한다.

## 브랜치 네이밍 규칙

형식은 `프리픽스/kebab-case-설명`이다. 소문자, 하이픈 구분, 공백·대문자 금지.

| 프리픽스    | 용도                    |
| ----------- | ----------------------- |
| `feature/`  | 새로운 기능 개발        |
| `fix/`      | 버그 수정               |
| `hotfix/`   | 긴급 수정               |
| `docs/`     | 문서 작업               |
| `chore/`    | 빌드·설정 등 유지보수   |
| `refactor/` | 리팩토링                |
| `test/`     | 테스트 코드 작업        |

- 좋은 예: `feature/user-authentication`, `fix/login-validation-error`
- 나쁜 예: `feature-user-auth`(슬래시 없음), `FEATURE/USER-AUTH`(대문자), `feature/user auth`(공백), `temp`(불명확)
- 규칙을 어긴 이름이 들어오면 고친 이름을 제안하고 확인받는다. 프리픽스가 없으면 작업 내용에 맞춰 제안한다.

## 워크플로

### 생성

1. `git status`로 현재 브랜치와 uncommitted 변경사항을 확인한다.
2. 변경사항이 있으면 처리 방법을 묻는다: 새 브랜치로 그대로 가져가기 / 커밋 / stash. 사용자 허락 없이 stash하지 않는다.
3. 이름을 검증한다.
4. 분기 기준은 최신 `main`이다(이 저장소의 기본 브랜치). `git fetch` 후 `git switch -c <이름> origin/main` 형태를 쓴다. 현재 브랜치에서 이어서 분기하길 원하면 그에 따른다.
5. 생성 후 현재 브랜치를 알려준다.

### 전환

1. `git status`로 작업 상태를 확인한다. 변경사항이 전환을 막으면 stash를 제안한다.
2. stash할 때는 메시지에 이전 브랜치명을 넣는다: `git stash push -m "WIP on <이전 브랜치>"`
3. `git switch <대상>`으로 전환한다. 원격에만 있는 브랜치면 `git fetch` 후 추적 브랜치로 만든다.
4. stash를 만들었다면 복구 방법(`git stash list`, `git stash pop`)을 안내한다.

### 목록·상태

- `git branch -vv`로 로컬 브랜치와 upstream 상태를, `git branch -r`로 원격 브랜치를 보여준다.
- 필요하면 `git log --oneline -5 <브랜치>`로 최근 커밋을 확인한다.

### 삭제·정리

1. 삭제 대상 목록을 먼저 보여주고, **사용자가 확인한 뒤에만** 삭제한다.
2. 병합 여부는 `git branch --merged main`으로 확인한다. 병합된 브랜치는 `git branch -d`로 삭제한다.
3. 병합되지 않은 브랜치는 잃을 커밋이 있다고 경고한다. `-D` 강제 삭제는 사용자가 명시적으로 동의했을 때만 쓴다.
4. 현재 체크아웃 중인 브랜치와 `main`은 삭제하지 않는다.
5. 원격 브랜치 삭제(`git push origin --delete`)는 이 스킬의 허용 범위 밖이므로 직접 실행하지 않고 명령을 안내한다.
6. 원격에서 사라진 추적 브랜치 정리는 `git fetch --prune`.

## 복구 안내

- 실수로 삭제한 브랜치: `git reflog`에서 커밋 해시를 찾아 `git switch -c <이름> <해시>`
- 보관해 둔 변경사항: `git stash list` 후 `git stash pop`
- 이 스킬은 `git reset --hard` 같은 파괴적 명령을 실행하지 않는다.

## 관련 스킬

- 변경사항 커밋은 `git-commit`, PR 생성은 `git-pr`.
