"use client";

import { useRouter } from "next/navigation";

import { usePatrolDraft } from "@/hooks/use-patrol-draft";
import type { AuthenticatedViewer } from "@/lib/types/auth";
import type {
  PatrolDraft,
  PatrolDraftAdapter,
  QuickTag,
} from "@/lib/types/patrol";

import { ConflictDialog } from "./conflict-dialog";
import { MemoInput } from "./memo-input";
import { PatrolActionBar } from "./patrol-action-bar";
import { QuickTagBar } from "./quick-tag-bar";
import { SaveStatus } from "./save-status";
import { SeatCategoryInput } from "./seat-category-input";

interface PatrolFormProps {
  viewer: AuthenticatedViewer;
  /** 초안 저장·순찰 완료 어댑터 (patrol-form-host.tsx에서 주입) */
  adapter: PatrolDraftAdapter;
  quickTags: QuickTag[];
  /** 서버가 조회한 본인 초안 */
  initialDraft: PatrolDraft;
}

// 순찰 입력 폼: 좌석 4종(모바일 1열, md 이상 2x2) → 메모(라벨, 퀵 태그, 입력창) 순으로 세로 배치
export function PatrolForm({
  viewer,
  adapter,
  quickTags,
  initialDraft,
}: PatrolFormProps) {
  const router = useRouter();
  const { state, dispatch, handleComplete, flushing } = usePatrolDraft({
    userId: viewer.userId,
    adapter,
    initialDraft,
    // 순찰 완료 후 방금 기록을 일지 목록에서 확인할 수 있게 이동한다
    onCompleted: () => router.push("/logs"),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
        {state.completeRetry && (
          <p
            role="status"
            aria-live="polite"
            className="text-sm font-medium text-destructive"
          >
            완료 여부를 확인하지 못했습니다. 아래 [다시 시도]를 눌러 주세요
          </p>
        )}
        <SaveStatus status={state.status} lastSavedAt={state.lastSavedAt} />
      </div>

      {/* 좌석 입력: 스탠딩 | 카페존 / 졸음/딴짓 | 자리비움 */}
      <section aria-label="좌석 입력" className="min-w-0">
        <SeatCategoryInput
          seats={{
            standing: state.content.standing,
            cafe_zone: state.content.cafe_zone,
            drowsy: state.content.drowsy,
            away: state.content.away,
          }}
          onAddSeat={(category, seat) =>
            dispatch({ type: "ADD_SEAT", category, seat })
          }
          onRemoveSeat={(category, seat) =>
            dispatch({ type: "REMOVE_SEAT", category, seat })
          }
        />
      </section>

      {/* 메모: 라벨 → 퀵 태그 → 입력창 */}
      <section aria-label="태그와 메모" className="flex min-w-0 flex-col gap-4">
        <MemoInput
          value={state.content.memo}
          onChange={(memo) => dispatch({ type: "SET_MEMO", memo })}
        >
          <QuickTagBar
            tags={quickTags}
            onAppend={(label) => dispatch({ type: "APPEND_TAG", label })}
          />
        </MemoInput>
      </section>

      <PatrolActionBar
        completing={state.completing || flushing}
        retrying={state.completeRetry}
        onComplete={() => void handleComplete()}
      />
      <ConflictDialog
        open={state.status === "conflict"}
        onChooseLocal={() =>
          dispatch({ type: "RESOLVE_CONFLICT", choice: "local" })
        }
        onChooseServer={() =>
          dispatch({ type: "RESOLVE_CONFLICT", choice: "server" })
        }
      />
    </div>
  );
}
