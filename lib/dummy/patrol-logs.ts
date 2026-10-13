// Task 018에서 DB 조회로 교체하며 삭제한다.
import type { PatrolLog } from "@/lib/types/patrol";

/** 공백·줄바꿈 없이 이어지는 정확히 2,000자 메모 (가로 스크롤·길이 상한 확인용). */
const LONG_MEMO = "가나다라마바사아자차".repeat(200);

/**
 * 화면 확인용 더미 순찰 기록.
 * 영업일은 04:00(KST) 경계 기준으로 직접 계산한 값이며,
 * 2026-10-09 ~ 2026-10-11은 기록이 없는 날짜로 비워 둔다.
 */
export const DUMMY_PATROL_LOGS: PatrolLog[] = [
  // 2026-10-12 영업일: 긴 메모(2,000자), 강등된 작성자
  {
    id: "dummy-log-1012-long",
    businessDate: "2026-10-12",
    patrolledAt: "2026-10-12T21:30:00+09:00",
    authorId: "dummy-admin",
    authorName: "관리자",
    standing: [3, 8],
    cafe_zone: [1],
    drowsy: [],
    away: [12],
    memo: LONG_MEMO,
  },
  {
    id: "dummy-log-1012-demoted",
    businessDate: "2026-10-12",
    patrolledAt: "2026-10-12T22:55:00+09:00",
    authorId: "dummy-pending",
    authorName: "대기 사용자",
    standing: [5],
    cafe_zone: [],
    drowsy: [14],
    away: [],
    memo: "퇴실자 탭 디스플레이 종료",
  },
  // 경계 검증: 03:59(KST)는 전일 영업일(2026-10-12)에 속한다.
  {
    id: "dummy-log-1012-boundary",
    businessDate: "2026-10-12",
    patrolledAt: "2026-10-13T03:59:00+09:00",
    authorId: "dummy-manager",
    authorName: "김매니저",
    standing: [],
    cafe_zone: [2],
    drowsy: [],
    away: [],
    memo: "마감 전 최종 순찰",
  },
  // 2026-10-13 영업일(오늘): 04:00(KST)부터 시작
  {
    id: "dummy-log-1013-boundary",
    businessDate: "2026-10-13",
    patrolledAt: "2026-10-13T04:00:00+09:00",
    authorId: "dummy-admin",
    authorName: "관리자",
    standing: [],
    cafe_zone: [],
    drowsy: [7],
    away: [],
    memo: "영업일 경계 기록",
  },
  {
    id: "dummy-log-1013-first",
    businessDate: "2026-10-13",
    patrolledAt: "2026-10-13T22:57:00+09:00",
    authorId: "dummy-manager",
    authorName: "김매니저",
    standing: [4, 9],
    cafe_zone: [],
    drowsy: [],
    away: [],
    memo: "퇴실자 탭 디스플레이 종료",
  },
  {
    id: "dummy-log-1013-multiline",
    businessDate: "2026-10-13",
    patrolledAt: "2026-10-13T23:23:00+09:00",
    authorId: "dummy-manager",
    authorName: "김매니저",
    standing: [4, 9, 15],
    cafe_zone: [3],
    drowsy: [23],
    away: [18, 21],
    memo: "퇴실자 탭 디스플레이 종료\n6, 11번 열람실 전원 퇴실로 에어컨 종료 및 소등\n화장실 정리",
  },
  // 좌석 4종 모두 비어 있고 메모도 빈 기록 (관리자 작성)
  {
    id: "dummy-log-1013-empty",
    businessDate: "2026-10-13",
    patrolledAt: "2026-10-14T00:30:00+09:00",
    authorId: "dummy-admin",
    authorName: "관리자",
    standing: [],
    cafe_zone: [],
    drowsy: [],
    away: [],
    memo: "",
  },
  // 경계 검증: 03:59(KST)는 2026-10-13 영업일에 속한다.
  {
    id: "dummy-log-1013-late",
    businessDate: "2026-10-13",
    patrolledAt: "2026-10-14T03:59:00+09:00",
    authorId: "dummy-manager",
    authorName: "김매니저",
    standing: [],
    cafe_zone: [],
    drowsy: [],
    away: [6],
    memo: "",
  },
  // 2026-10-14 영업일 (04:00 경계 직후)
  {
    id: "dummy-log-1014-boundary",
    businessDate: "2026-10-14",
    patrolledAt: "2026-10-14T04:00:00+09:00",
    authorId: "dummy-manager",
    authorName: "김매니저",
    standing: [1],
    cafe_zone: [],
    drowsy: [],
    away: [],
    memo: "새 영업일 첫 순찰",
  },
];

/** 영업일에 해당하는 더미 기록을 순찰 시각 오름차순으로 반환한다. */
export function getDummyLogsByDate(date: string): PatrolLog[] {
  return DUMMY_PATROL_LOGS.filter((log) => log.businessDate === date).sort(
    (a, b) => Date.parse(a.patrolledAt) - Date.parse(b.patrolledAt),
  );
}
