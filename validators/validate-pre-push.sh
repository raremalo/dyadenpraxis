#!/usr/bin/env bash
set -euo pipefail

# PreToolUse Hook: Quality Gates vor git commit/push
# Liest Hook-Event JSON von stdin

EVENT_JSON=$(cat)
COMMAND=$(echo "$EVENT_JSON" | jq -r '.tool_input.command // empty' 2>/dev/null || true)

# Nur bei git commit oder git push ausfuehren
if [[ -z "$COMMAND" ]]; then
  exit 0
fi

if ! echo "$COMMAND" | grep -qE 'git (commit|push)'; then
  exit 0
fi

PROJECT_DIR="$(dirname "$0")/../dyadenpraxis-online"
ROOT_DIR="$(dirname "$0")/.."

echo "=== Quality Gates ==="

# 1. TypeScript Check
echo "[1/3] TypeScript Check..."
cd "$PROJECT_DIR"
if ! npx tsc --noEmit 2>&1; then
  echo "FEHLER: TypeScript-Check fehlgeschlagen. Commit/Push blockiert."
  exit 1
fi

# 2. Vite Build
echo "[2/3] Vite Build..."
if ! npx vite build 2>&1 | tail -5; then
  echo "FEHLER: Build fehlgeschlagen. Commit/Push blockiert."
  exit 1
fi

# 3. Beads Status
echo "[3/3] Beads Status..."
cd "$ROOT_DIR"
bd ready 2>&1 || true

echo "=== Quality Gates bestanden ==="
exit 0
