<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-23 | Updated: 2026-03-23 -->

# validators

## Purpose
Shell scripts used as Claude Code hooks for automated quality gates. Triggered automatically on file edits (PostToolUse) and before git commits/pushes (PreToolUse).

## Key Files

| File | Description |
|------|-------------|
| `validate-typescript.sh` | Runs `tsc --noEmit` — triggered after any .ts/.tsx file edit |
| `validate-pre-push.sh` | Runs tsc + vite build + bd ready — triggered before git commit/push |

## For AI Agents

### Working In This Directory
- These scripts are invoked by Claude Code hooks defined in `.claude/settings.json`
- Scripts must exit 0 on success, non-zero on failure
- Keep scripts fast — they run on every relevant tool use
- Test changes by running the scripts manually before committing

### Testing Requirements
```bash
bash validators/validate-typescript.sh    # Should exit 0
bash validators/validate-pre-push.sh      # Should exit 0
```

## Dependencies

### Internal
- Operates on `dyadenpraxis-online/` — runs TypeScript compiler and Vite build there
- Referenced by `.claude/settings.json` hook configuration

### External
- `tsc` (TypeScript compiler) via `npx`
- `vite` build tool via `npx`
- `bd` (beads) CLI

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
