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


