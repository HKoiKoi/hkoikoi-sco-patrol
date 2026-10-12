#!/bin/bash
# PostToolUse(Edit|Write): 수정된 파일에 Prettier를 자동 적용한다.
file=$(jq -r '.tool_input.file_path // empty')
[ -z "$file" ] && exit 0
case "$file" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.json|*.css|*.md) ;;
  *) exit 0 ;;
esac
[ -f "$file" ] || exit 0
cd "$CLAUDE_PROJECT_DIR" || exit 0
npx --no-install prettier --write --log-level=silent "$file" >/dev/null 2>&1
exit 0
