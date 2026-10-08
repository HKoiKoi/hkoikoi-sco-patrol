#!/bin/bash
# Claude Code PostToolUse 훅 - Write/Edit 직후 변경된 파일을 자동 포맷/린트
#
# stdin으로 전달되는 JSON에서 tool_input.file_path를 읽어 Prettier와 ESLint --fix를 실행한다.
# 포맷 실패는 작업을 막지 않으며, 남은 ESLint 오류만 stderr(exit 2)로 Claude에 전달한다.

cd "$CLAUDE_PROJECT_DIR" || exit 0

FILE=$(node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).tool_input.file_path||"")}catch{}})')

[ -z "$FILE" ] && exit 0
[ -f "$FILE" ] || exit 0

case "$FILE" in
  */node_modules/*|*/.next/*|*/.agents/*|*/shrimp_data/*) exit 0 ;;
  *.ts|*.tsx|*.js|*.jsx|*.mjs)
    npx --no-install prettier --write "$FILE" >/dev/null 2>&1
    OUT=$(npx --no-install eslint --fix "$FILE" 2>&1) || { echo "$OUT" >&2; exit 2; }
    ;;
  *.json|*.css|*.md|*.yml|*.yaml)
    npx --no-install prettier --write "$FILE" >/dev/null 2>&1
    ;;
esac
exit 0
