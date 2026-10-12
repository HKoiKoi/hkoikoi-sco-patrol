---
name: git-branch
description: >-
  Git 브랜치 생성, 전환, 목록 확인, 삭제, 원격 동기화 등 브랜치 관리 작업을 안전하게 수행합니다.
  "브랜치 만들어줘", "브랜치 따줘", "브랜치 전환", "브랜치 삭제", "브랜치 정리", "새 브랜치에서 작업", "checkout",
  "switch branch", "create branch", "/git:branch" 등 브랜치와 관련된 요청이면 반드시 이 스킬을 사용하세요.
  사용자가 스킬 이름을 말하지 않아도 브랜치 작업이면 사용합니다.
allowed-tools:
  - Bash(git branch:*)
  - Bash(git checkout:*)
  - Bash(git switch:*)
  - Bash(git status:*)
  - Bash(git stash:*)
  - Bash(git log:*)
  - Bash(git fetch:*)
---

# Git 브랜치 관리

브랜치 생성·전환·삭제·동기화를 작업 손실 없이 처리한다. 모든 작업 전에 `git status`로 현재 상태를 먼저 확인한다.

## 요청 해석

- 브랜치명이 주어지면 → 새 브랜치 생성 및 전환
- 브랜치명 없이 "브랜치 관리"처럼 모호하면 → 아래 중 무엇을 할지 사용자에게 묻는다: 생성 / 전환 / 목록 / 삭제 / 원격 동기화 / 상태 확인
- 설명만 주어지면(예: "로그인 버그 수정용 브랜치") → 네이밍 규칙에 맞는 이름을 제안하고 확인 후 생성한다.

## 워크플로

### 생성

1. `git status`로 uncommitted 변경사항 확인
2. 변경사항이 있으면 사용자에게 선택지를 준다: 새 브랜치로 가져가기 / stash / 먼저 커밋. 임의로 stash하지 않는다.
3. 브랜치명을 네이밍 규칙으로 검증하고, 위반이면 수정안을 제안한다.
4. 기본 브랜치(main 또는 develop)를 `git fetch`로 최신화한 뒤 거기서 분기한다. 다른 브랜치에서 분기해야 하면 사용자가 명시한 경우만.
5. `git switch -c <이름> <기준>`으로 생성 및 전환

### 전환

1. `git status`로 작업 상태 확인
2. 변경사항이 전환과 충돌하면 stash를 제안한다. stash 시 메시지에 이전 브랜치명을 포함한다(`git stash push -m "<이전 브랜치>: WIP"`).
3. `git switch <이름>`. 원격에만 있는 브랜치면 `git fetch` 후 추적 브랜치로 전환한다.
4. stash를 만들었다면 그 사실과 복구 방법(`git stash pop`)을 알려준다.

### 목록 / 상태

- `git branch -vv`(추적 상태 포함), 필요 시 `git branch -r`
- 현재 브랜치, 원격과의 ahead/behind, 병합 여부를 간단히 요약한다.

### 삭제

1. 현재 브랜치가 아닌지 확인
2. `git branch --merged <기본 브랜치>`로 병합 여부 확인
3. 병합됨 → `git branch -d`. 병합 안 됨 → 손실될 커밋을 `git log`로 보여주고 사용자가 명시적으로 동의한 경우에만 `-D`
4. 원격 브랜치 삭제(`git push origin --delete`)는 이 스킬의 허용 범위 밖이다. 필요하면 명령을 안내만 하고 사용자 확인을 받는다.

### 원격 동기화 / 정리

- `git fetch --prune`으로 원격에서 삭제된 브랜치를 반영
- 정리 대상 삭제 전에는 목록을 먼저 보여주고 확인받는다(dry-run 방식).

## 네이밍 규칙

형식: `<프리픽스>/<소문자-케밥-케이스>`

| 프리픽스 | 용도 |
|---|---|
| `feature/` | 새 기능 |
| `fix/` | 버그 수정 |
| `hotfix/` | 긴급 수정 |
| `docs/` | 문서 |
| `chore/` | 빌드, 설정 등 유지보수 |
| `refactor/` | 리팩토링 |
| `test/` | 테스트 |

- 좋은 예: `feature/user-authentication`, `fix/login-validation-error`
- 피할 것: 프리픽스 없음(`temp`), 대문자, 공백, 슬래시 대신 하이픈(`feature-user-auth`), 의미 없는 이름

## 안전 원칙

- 사용자 동의 없이 stash, 강제 삭제(`-D`), `reset --hard`를 하지 않는다.
- 작업이 사라진 것처럼 보이면 `git reflog`(삭제한 브랜치)와 `git stash list`(stash된 변경)로 복구 방법을 안내한다.
- 브랜치 작업이 끝난 뒤 커밋이 필요하면 `git-commit` 스킬로 이어간다.
