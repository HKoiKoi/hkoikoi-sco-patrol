// 초안 localStorage 백업(`draft:{user_id}`) 읽기·쓰기·삭제. SSR에서 import해도 안전하다.
import { MEMO_MAX_LENGTH } from "@/lib/patrol-format";
import type { DraftBackup } from "@/lib/types/patrol";

export const DRAFT_BACKUP_KEY_PREFIX = "draft:";

function backupKey(userId: string): string {
  return `${DRAFT_BACKUP_KEY_PREFIX}${userId}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSeatArray(value: unknown): value is number[] {
  return (
    Array.isArray(value) && value.every((v) => Number.isSafeInteger(v) && v > 0)
  );
}

/**
 * localStorage에서 읽은 원문을 DraftBackup으로 검증한다.
 * null·JSON 오류·형태 불일치(revision, savedAt, 좌석 배열, memo 길이)는 모두 null.
 */
export function parseDraftBackup(raw: string | null): DraftBackup | null {
  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isRecord(parsed)) return null;
  const { revision, savedAt, payload } = parsed;
  if (typeof revision !== "number" || !Number.isSafeInteger(revision)) {
    return null;
  }
  if (typeof savedAt !== "string") return null;
  if (!isRecord(payload)) return null;

  const { standing, cafe_zone, drowsy, away, memo } = payload;
  if (
    !isSeatArray(standing) ||
    !isSeatArray(cafe_zone) ||
    !isSeatArray(drowsy) ||
    !isSeatArray(away)
  ) {
    return null;
  }
  if (typeof memo !== "string" || memo.length > MEMO_MAX_LENGTH) return null;

  return {
    revision,
    savedAt,
    payload: { standing, cafe_zone, drowsy, away, memo },
  };
}

/** 사용자 백업을 읽는다. 접근 불가·없음·손상이면 null. */
export function readDraftBackup(userId: string): DraftBackup | null {
  try {
    return parseDraftBackup(window.localStorage.getItem(backupKey(userId)));
  } catch {
    return null;
  }
}

/** 사용자 백업을 저장한다. 접근 불가·쿼터 초과는 조용히 무시한다. */
export function writeDraftBackup(userId: string, backup: DraftBackup): void {
  try {
    window.localStorage.setItem(backupKey(userId), JSON.stringify(backup));
  } catch {
    // 백업은 보조 수단이므로 실패해도 흐름을 막지 않는다.
  }
}

/** 사용자 백업을 지운다. 접근 불가는 조용히 무시한다. */
export function clearDraftBackup(userId: string): void {
  try {
    window.localStorage.removeItem(backupKey(userId));
  } catch {
    // 무시
  }
}

/** 모든 사용자의 초안 백업을 지운다(로그아웃용). 접근 불가는 조용히 무시한다. */
export function clearAllDraftBackups(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(DRAFT_BACKUP_KEY_PREFIX)) keys.push(key);
    }
    keys.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // 무시
  }
}
