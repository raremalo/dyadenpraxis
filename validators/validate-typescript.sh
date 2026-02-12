#!/usr/bin/env bash
set -euo pipefail

# PostToolUse Hook: TypeScript-Check nach Write/Edit auf .ts/.tsx Dateien
# Liest Hook-Event JSON von stdin

EVENT_JSON=$(cat)
FILE_PATH=$(echo "$EVENT_JSON" | jq -r '.tool_input.file_path // .tool_input.path // empty' 2>/dev/null || true)

# Nur .ts/.tsx Dateien pruefen (keine .sh, .json, .md etc.)
if [[ -z "$FILE_PATH" ]] || [[ ! "$FILE_PATH" =~ \.(ts|tsx)$ ]]; then
  exit 0
fi

# Supabase Edge Functions ausschliessen (Deno, nicht Vite)
if [[ "$FILE_PATH" == *"supabase/functions"* ]]; then
  exit 0
fi

PROJECT_DIR="$(dirname "$0")/../dyadenpraxis-online"

cd "$PROJECT_DIR"
npx tsc --noEmit 2>&1
