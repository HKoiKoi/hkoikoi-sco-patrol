// Phase 3 더미 퀵 태그. Task 018·020에서 DB 조회로 교체하며 삭제한다.
import type { QuickTag } from "@/lib/types/patrol";

/** 활성·비활성이 섞인 더미 태그 (정렬 순서는 sortOrder 기준). */
export const DUMMY_QUICK_TAGS: QuickTag[] = [
  { id: "dummy-tag-1", label: "화장실 정리", sortOrder: 1, isActive: true },
  {
    id: "dummy-tag-2",
    label: "정수기 및 커피머신 청소",
    sortOrder: 2,
    isActive: true,
  },
  { id: "dummy-tag-3", label: "쓰레기통 비움", sortOrder: 3, isActive: true },
  { id: "dummy-tag-4", label: "분실물 보관", sortOrder: 4, isActive: true },
  { id: "dummy-tag-5", label: "소음 안내", sortOrder: 5, isActive: true },
  {
    id: "dummy-tag-6",
    label: "공용 책상 정리 (사용 중지)",
    sortOrder: 6,
    isActive: false,
  },
];

/** 태그가 하나도 없는 경우 확인용. */
export const EMPTY_DUMMY_QUICK_TAGS: QuickTag[] = [];
