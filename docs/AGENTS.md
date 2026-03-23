<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-23 | Updated: 2026-03-23 -->

# docs

## Purpose
Architecture documentation for the Dyaden-Praxis application. Contains design decisions and technical specifications for complex subsystems.

## Key Files

| File | Description |
|------|-------------|
| `phase-sync-architektur.md` | Architecture doc for phase synchronization and gong sync via Daily.co AppMessage — describes the 3-layer sync architecture (Timer Hook → VideoRoom bridge → Session orchestrator) |

## For AI Agents

### Working In This Directory
- These are reference documents — read them before modifying related code
- `phase-sync-architektur.md` is essential context for any changes to `useDyadTimerEngine`, `VideoRoom`, or `ActiveSession`
- Documentation is in German

### Common Patterns
- Architecture docs use layered diagrams with ASCII art
- Each doc covers context, architecture overview, and implementation details

## Dependencies

### Internal
- Documents architecture of `dyadenpraxis-online/hooks/useDyadTimerEngine.ts`
- Documents architecture of `dyadenpraxis-online/components/VideoRoom.tsx`
- Documents architecture of `dyadenpraxis-online/components/ActiveSession.tsx`

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
