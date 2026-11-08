#!/usr/bin/env bash
# SCO 순찰 앱 홈 서버(macOS) 릴리스 배포 스크립트.
#
# 사용법: deploy/deploy.sh <커밋 SHA> [소스 저장소 경로]
#   - 소스 저장소 경로 기본값: $GITHUB_WORKSPACE, 없으면 현재 디렉터리
#   - CI는 actions/checkout 결과 디렉터리에서 `deploy/deploy.sh "$GITHUB_SHA"`로 호출한다.
#
# 흐름: git archive로 릴리스 폴더 생성 → shared/.env.local 링크 → npm ci → npm run build
#       → (빌드 성공 시에만) current 링크 교체 → launchd 재시작 → 헬스체크
#       → 실패 시 이전 링크 복구 후 재시작하고 비정상 종료 → 성공 시 오래된 릴리스 정리.
#
# macOS 전용이다(BSD `mv -h`, launchctl). 시크릿은 다루지 않으며 .env.local은 서버의 shared/에만 둔다.
# Caddy 설정과 plist는 이 스크립트가 건드리지 않는다. 블로그 앱(~/apps/current, dev.hkoikoi.web)과 분리된다.

set -euo pipefail

# launchd/runner 환경은 PATH가 짧아서 brew 경로를 명시한다.
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH:-}"

APPS_DIR="${APPS_DIR:-$HOME/apps/sco-patrol}"
RELEASES_DIR="$APPS_DIR/releases"
SHARED_DIR="$APPS_DIR/shared"
CURRENT_LINK="$APPS_DIR/current"
SERVICE_LABEL="${SERVICE_LABEL:-dev.hkoikoi.sco}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3001/logs}"
HEALTH_INTERVAL="${HEALTH_INTERVAL:-2}" # 초
HEALTH_RETRIES="${HEALTH_RETRIES:-15}"  # 2초 x 15회 = 최대 30초
KEEP_RELEASES="${KEEP_RELEASES:-5}"     # 현재·직전 릴리스를 포함해 남길 총 개수

log() { printf '[deploy] %s\n' "$*"; }
die() {
  printf '[deploy] 오류: %s\n' "$*" >&2
  exit 1
}

# ---- 인자 검증 ----
[[ $# -ge 1 ]] || die "사용법: $0 <커밋 SHA> [소스 저장소 경로]"
SHA_INPUT="$1"
SOURCE_DIR="${2:-${GITHUB_WORKSPACE:-$PWD}}"

[[ "$SHA_INPUT" =~ ^[0-9a-fA-F]{7,40}$ ]] || die "SHA 형식이 올바르지 않습니다: $SHA_INPUT"
[[ "$KEEP_RELEASES" =~ ^[0-9]+$ && "$KEEP_RELEASES" -ge 2 ]] || die "KEEP_RELEASES는 2 이상의 정수여야 합니다: $KEEP_RELEASES"
git -C "$SOURCE_DIR" rev-parse --git-dir >/dev/null 2>&1 || die "git 저장소가 아닙니다: $SOURCE_DIR"
SHA="$(git -C "$SOURCE_DIR" rev-parse --verify "${SHA_INPUT}^{commit}")" || die "커밋을 찾을 수 없습니다: $SHA_INPUT"

[[ -f "$SHARED_DIR/.env.local" ]] || die "$SHARED_DIR/.env.local 이 없습니다(서버에서 직접 작성)"

mkdir -p "$RELEASES_DIR"
RELEASE_DIR="$RELEASES_DIR/$SHA"

# 현재 가리키는 릴리스(롤백용). 첫 배포면 비어 있다.
PREV_TARGET=""
if [[ -L "$CURRENT_LINK" ]]; then
  PREV_TARGET="$(readlink "$CURRENT_LINK")"
fi

if [[ -n "$PREV_TARGET" && "$PREV_TARGET" == "$RELEASE_DIR" ]]; then
  log "이미 현재 릴리스입니다($SHA). 아무것도 하지 않습니다."
  exit 0
fi

# ---- 빌드 단계: 실패하면 새 릴리스 폴더를 지우고 current는 건드리지 않는다 ----
BUILD_OK=0
cleanup_failed_build() {
  if [[ "$BUILD_OK" -ne 1 && -d "$RELEASE_DIR" ]]; then
    log "빌드 실패: 미완성 릴리스 폴더를 삭제합니다($RELEASE_DIR). current는 변경되지 않았습니다."
    rm -rf "${RELEASE_DIR:?}"
  fi
}
trap cleanup_failed_build EXIT

if [[ -e "$RELEASE_DIR" ]]; then
  log "같은 SHA의 이전 릴리스 폴더를 삭제하고 다시 만듭니다."
  rm -rf "${RELEASE_DIR:?}"
fi
mkdir -p "$RELEASE_DIR"

log "소스 추출: $SHA"
git -C "$SOURCE_DIR" archive "$SHA" | tar -x -C "$RELEASE_DIR"

ln -s "$SHARED_DIR/.env.local" "$RELEASE_DIR/.env.local"

log "npm ci"
(cd "$RELEASE_DIR" && npm ci --no-audit --no-fund)

log "npm run build"
(cd "$RELEASE_DIR" && npm run build)

BUILD_OK=1
trap - EXIT

# ---- 교체 단계 ----
switch_link() {
  # 임시 링크를 만든 뒤 mv -fh로 원자적으로 교체한다(-h: 기존 링크를 따라가지 않음).
  local target="$1"
  ln -s "$target" "$CURRENT_LINK.tmp.$$"
  mv -fh "$CURRENT_LINK.tmp.$$" "$CURRENT_LINK"
}

restart_service() {
  launchctl kickstart -k "gui/$(id -u)/$SERVICE_LABEL"
}

health_check() {
  local i code
  for ((i = 1; i <= HEALTH_RETRIES; i++)); do
    code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 5 "$HEALTH_URL" 2>/dev/null || true)"
    if [[ "$code" == "200" ]]; then
      return 0
    fi
    log "헬스체크 대기 ($i/$HEALTH_RETRIES, 응답: ${code:-없음})"
    sleep "$HEALTH_INTERVAL"
  done
  return 1
}

log "current 교체: $RELEASE_DIR"
switch_link "$RELEASE_DIR"

DEPLOY_OK=0
if restart_service && health_check; then
  DEPLOY_OK=1
fi

if [[ "$DEPLOY_OK" -ne 1 ]]; then
  if [[ -n "$PREV_TARGET" && -d "$PREV_TARGET" ]]; then
    log "배포 실패: 이전 릴리스로 롤백합니다($PREV_TARGET)."
    switch_link "$PREV_TARGET"
    restart_service || log "경고: 롤백 후 서비스 재시작에 실패했습니다."
    die "헬스체크 실패로 롤백했습니다. 실패한 릴리스는 조사용으로 남겨 둡니다: $RELEASE_DIR"
  fi
  die "헬스체크 실패. 이전 릴리스가 없어 롤백할 수 없습니다: $RELEASE_DIR"
fi

log "배포 성공: $SHA"

# ---- 정리 단계: 현재·직전 릴리스는 항상 보존하고, 둘을 포함해 최근 KEEP_RELEASES개만 유지 ----
CURRENT_TARGET="$(readlink "$CURRENT_LINK")"
protected=1 # 현재 릴리스
if [[ -n "$PREV_TARGET" && "$PREV_TARGET" != "$CURRENT_TARGET" && -d "$PREV_TARGET" ]]; then
  protected=2 # 직전 릴리스
fi
slots=$((KEEP_RELEASES - protected))
kept=0
while IFS= read -r dir; do
  [[ -n "$dir" ]] || continue
  path="$RELEASES_DIR/$dir"
  [[ -d "$path" ]] || continue
  if [[ "$path" == "$CURRENT_TARGET" || "$path" == "$PREV_TARGET" ]]; then
    continue
  fi
  if ((kept < slots)); then
    kept=$((kept + 1))
    continue
  fi
  log "오래된 릴리스 삭제: $path"
  rm -rf "${path:?}"
done < <(ls -1t "$RELEASES_DIR")

log "완료"
