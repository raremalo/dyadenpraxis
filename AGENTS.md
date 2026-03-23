<!-- Generated: 2026-03-23 | Updated: 2026-03-23 -->

# Dyaden-Praxis

## Purpose
A web application for online dyad meditation practice — structured two-person contemplation sessions with real-time video, timed speaking/listening roles, and AI-generated prompts. Built with React 19, Supabase, Daily.co video, and Gemini AI. Deployed on Vercel.

## Key Files

| File | Description |
|------|-------------|
| `NEXT_APP_STARTER.md` | Reference starter template |
| `Dyaden Praxis Guide.html` | Original practice guide |
| `selbst_validierend_claude.md` | Self-validating agent concept doc |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `dyadenpraxis-online/` | Main application — Vite + React + TypeScript SPA (see `dyadenpraxis-online/AGENTS.md`) |
| `migrations/` | Canonical SQL migration sequence for Supabase (see `migrations/AGENTS.md`) |
| `docs/` | Architecture documentation (see `docs/AGENTS.md`) |
| `validators/` | Hook-driven quality gate scripts (see `validators/AGENTS.md`) |
| `sound/` | Meditation bell/bowl audio assets (see `sound/AGENTS.md`) |
| `supabase/` | Supabase project config (linked config, mostly empty) |

## For AI Agents

### Working In This Directory
- Read this file fully before starting any work
- Use `bd` (beads) for all issue tracking — never markdown TODOs
- All user-facing text is in German (Zielgruppe: German speakers)
- Run quality gates before every commit (see Selbst-Validierung below)

### Testing Requirements
```bash
cd dyadenpraxis-online && npx tsc --noEmit   # TypeScript fehlerfrei
cd dyadenpraxis-online && npx vite build      # Build erfolgreich
cd dyadenpraxis-online && npx vitest run      # Tests passing
```

### Tech Stack
- **Frontend**: React 19, TypeScript 5.8, Vite 6, Tailwind CSS 4
- **Backend**: Supabase (Auth, DB, Realtime, Storage, Edge Functions)
- **Video**: Daily.co (`@daily-co/daily-js`, `@daily-co/daily-react`)
- **AI Prompts**: Google Gemini via Vercel API routes
- **Deployment**: Vercel (Hobby Plan)

## Dependencies

### External Services
- Supabase — auth, database, realtime presence, storage
- Daily.co — WebRTC video rooms
- Google Gemini — AI-generated dyad prompts
- Vercel — hosting and serverless API routes

---

# Agent Instructions

This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get started.

## Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git
```

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds

## Selbst-Validierung (Hooks)

Dieses Projekt nutzt **Claude Code Hooks** zur automatischen Qualitaetssicherung.

### Automatische Checks (via `.claude/settings.json`)

| Hook | Trigger | Validator | Prueft |
|------|---------|-----------|--------|
| PostToolUse | Write/Edit auf .ts/.tsx | `validators/validate-typescript.sh` | `tsc --noEmit` |
| PreToolUse | Bash mit `git commit`/`git push` | `validators/validate-pre-push.sh` | tsc + vite build + bd ready |

### Quality Gates vor Commit/Push

**IMMER** vor `git commit` oder `git push`:
```bash
cd dyadenpraxis-online && npx tsc --noEmit   # TypeScript fehlerfrei
cd dyadenpraxis-online && npx vite build      # Build erfolgreich
bd ready                                       # Beads Status pruefen
```

### Closed Loop Prinzip

1. Agent macht Aenderung (Write/Edit)
2. PostToolUse Hook prueft TypeScript automatisch
3. Bei Fehler: Agent korrigiert sofort
4. Vor Commit: PreToolUse Hook erzwingt alle Quality Gates
5. Nur bei Exit-Code 0 wird Commit/Push ausgefuehrt

## Naming Conventions

| Element | Pattern | Beispiel |
|---------|---------|----------|
| Komponenten | `PascalCase` | `PartnerConnect.tsx`, `SessionInviteBanner.tsx` |
| Hooks | `use[Entity][Action?]` | `useVideoCall`, `useSession`, `usePresence` |
| Contexts | `[Entity]Context` | `AuthContext`, `SessionContext` |
| Types/Interfaces | `[Entity][Context?]` | `CreateRoomResponse`, `UseVideoCallReturn` |
| Supabase Edge Functions | `kebab-case` | `create-room` |
| CSS-Klassen | Bestehende Konvention im Projekt | Siehe `src/index.css` |

**Keine generischen Namen** (`Card`, `Modal`, `Helper`). Entity MUSS im Namen sein.

## Error Handling

| Kategorie | User-Feedback | Recovery |
|-----------|---------------|----------|
| Network | Toast + Retry | Auto-Retry (3x) |
| Auth (401) | Redirect Login | Automatisch |
| Validation | Inline am Feld | User korrigiert |
| Supabase Error | Toast mit Fehlermeldung | Retry-Button |
| Edge Function Error | Toast + Logging | Retry |

**Regeln:**
- Alle `supabase.*` Calls mit try/catch
- Error-Messages auf Deutsch (Zielgruppe)
- Strukturiertes Logging: `console.error('[Kontext]', error)`
- Bei Auth-Fehlern: Session pruefen, ggf. Redirect

## Context Referencing

Bei neuen Komponenten/Features IMMER bestehende Dateien referenzieren:
- Hooks: Pattern von `useVideoCall.ts` oder `useSession.ts` uebernehmen
- Komponenten: Layout-Pattern von `PartnerConnect.tsx` folgen
- Supabase-Calls: Pattern aus `lib/supabase.ts` nutzen
- Edge Functions: Struktur von `supabase/functions/create-room/index.ts` folgen

**Keine impliziten Annahmen.** Bestehenden Code lesen bevor neuer geschrieben wird.

## Version Control

- **Checkpoint vor Experimenten:** `git commit -m "checkpoint: vor [Beschreibung]"`
- **Atomic Commits:** Eine logische Aenderung = ein Commit
- **Commit-Format:** `<type>(<scope>): <Beschreibung>`
  - Types: `feat`, `fix`, `refactor`, `chore`, `docs`
- **Kein Commit ohne Quality Gates** (siehe Selbst-Validierung)

## Session-Start Protokoll

Bei jedem neuen Chat:
1. `bd ready` - Offene Tasks pruefen
2. `git status` - Aktuellen Stand pruefen
3. Letzte Commits lesen fuer Kontext
4. Relevante Memory abrufen (`search_memory`)



<!-- BEGIN BEADS INTEGRATION v:1 profile:full hash:d4f96305 -->
## Issue Tracking with bd (beads)

**IMPORTANT**: This project uses **bd (beads)** for ALL issue tracking. Do NOT use markdown TODOs, task lists, or other tracking methods.

### Why bd?

- Dependency-aware: Track blockers and relationships between issues
- Git-friendly: Dolt-powered version control with native sync
- Agent-optimized: JSON output, ready work detection, discovered-from links
- Prevents duplicate tracking systems and confusion

### Quick Start

**Check for ready work:**

```bash
bd ready --json
```

**Create new issues:**

```bash
bd create "Issue title" --description="Detailed context" -t bug|feature|task -p 0-4 --json
bd create "Issue title" --description="What this issue is about" -p 1 --deps discovered-from:bd-123 --json
```

**Claim and update:**

```bash
bd update <id> --claim --json
bd update bd-42 --priority 1 --json
```

**Complete work:**

```bash
bd close bd-42 --reason "Completed" --json
```

### Issue Types

- `bug` - Something broken
- `feature` - New functionality
- `task` - Work item (tests, docs, refactoring)
- `epic` - Large feature with subtasks
- `chore` - Maintenance (dependencies, tooling)

### Priorities

- `0` - Critical (security, data loss, broken builds)
- `1` - High (major features, important bugs)
- `2` - Medium (default, nice-to-have)
- `3` - Low (polish, optimization)
- `4` - Backlog (future ideas)

### Workflow for AI Agents

1. **Check ready work**: `bd ready` shows unblocked issues
2. **Claim your task atomically**: `bd update <id> --claim`
3. **Work on it**: Implement, test, document
4. **Discover new work?** Create linked issue:
   - `bd create "Found bug" --description="Details about what was found" -p 1 --deps discovered-from:<parent-id>`
5. **Complete**: `bd close <id> --reason "Done"`

### Auto-Sync

bd automatically syncs via Dolt:

- Each write auto-commits to Dolt history
- Use `bd dolt push`/`bd dolt pull` for remote sync
- No manual export/import needed!

### Important Rules

- ✅ Use bd for ALL task tracking
- ✅ Always use `--json` flag for programmatic use
- ✅ Link discovered work with `discovered-from` dependencies
- ✅ Check `bd ready` before asking "what should I work on?"
- ❌ Do NOT create markdown TODO lists
- ❌ Do NOT use external issue trackers
- ❌ Do NOT duplicate tracking systems

For more details, see README.md and docs/QUICKSTART.md.

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd dolt push
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds

<!-- END BEADS INTEGRATION -->

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
