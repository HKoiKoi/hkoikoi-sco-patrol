---
name: update-roadmap
description: >-
  docs/ROADMAP.md에서 완료된 Task에 ✅ 체크를 추가하고 Phase 상태, 진행 상황(X/N Tasks 완료), 최종 업데이트 날짜를 갱신합니다.
  "로드맵 업데이트", "Task 004 완료 처리", "ROADMAP 체크해줘", "진행 상황 갱신", "update roadmap" 등
  ROADMAP.md의 완료 상태를 반영해야 하는 요청이면 사용자가 스킬 이름을 말하지 않아도 이 스킬을 사용하세요.
allowed-tools: Read(docs/ROADMAP.md:*), Edit(docs/ROADMAP.md:*)
---

# ROADMAP 진행 상황 업데이트

완료된 Task를 `docs/ROADMAP.md`에 체크하고 진행 상황을 갱신한다.

## 워크플로

1. `docs/ROADMAP.md`를 읽는다.
2. 미완료 Task(제목에 ✅가 없는 것) 목록을 보여준다.
3. 완료한 Task 번호를 묻는다. 사용자가 이미 번호를 말했다면 묻지 않고 진행한다. (예: `004` 또는 `004,005`, 3자리 숫자)
4. 각 Task에 완료 표시를 추가한다. 이미 ✅가 있는 Task는 건너뛴다.
5. Phase 상태, 진행 상황 라인, 최종 업데이트 날짜를 갱신한다.
6. 변경 내용을 요약해 알려준다.

## 업데이트 규칙

### Task

- 제목 검색 패턴: `- **Task XXX:`
- 제목: 우선순위 표기를 완료로 교체한다.
  - Before: `- **Task XXX: 작업명** - 우선순위`
  - After: `- **Task XXX: 작업명** ✅ - 완료`
- 하위 항목: Task 다음 줄부터 각 항목 앞에 ✅를 붙인다.
  - Before: `  - 항목명`
  - After: `  - ✅ 항목명`

### Phase

- Phase 내 모든 Task에 ✅가 있으면 제목에도 추가한다: `### Phase N: 제목` → `### Phase N: 제목 ✅`
- 이미 ✅가 있는 Phase는 건너뛴다.

### 진행 상황

- 전체 Task 수는 ROADMAP.md에서 직접 센다. (고정값으로 가정하지 않는다.)
- 완료 Task 수는 ✅가 붙은 Task 개수다.
- `**📊 진행 상황**` 라인을 현재 Phase 상태와 `(완료/전체 Tasks 완료)`로 갱신한다.
  - 예: `Phase 2 진행 중 (4/12 Tasks 완료)`

### 날짜

- `**📅 최종 업데이트**`를 오늘 날짜로 바꾼다. 형식은 `YYYY-MM-DD`.

## 예시

**Before:**

```markdown
- **Task 004: 공통 컴포넌트 라이브러리 구축** - 우선순위
  - shadcn/ui 설치 및 설정
  - 기본 UI 컴포넌트 추가

**📅 최종 업데이트**: 2025-10-07
**📊 진행 상황**: Phase 1 완료 (3/12 Tasks 완료)
```

**After:**

```markdown
- **Task 004: 공통 컴포넌트 라이브러리 구축** ✅ - 완료
  - ✅ shadcn/ui 설치 및 설정
  - ✅ 기본 UI 컴포넌트 추가

**📅 최종 업데이트**: 2025-10-08
**📊 진행 상황**: Phase 2 진행 중 (4/12 Tasks 완료)
```

## 마무리 출력 예시

```
✅ Task 004 완료 체크 완료!
📊 진행 상황: 4/12 Tasks 완료 (33%)
```
