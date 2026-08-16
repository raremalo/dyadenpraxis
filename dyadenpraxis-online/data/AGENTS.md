<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-23 | Updated: 2026-03-23 -->

# data

## Purpose
Static data used as fallback content and curated question pools for dyad practice sessions.

## Key Files

| File | Description |
|------|-------------|
| `dyadQuestions.ts` | Client entry for the dyad question catalog — re-exports `DYAD_CATEGORIES` from `../shared/categories.ts` (canonical source) and provides `getRandomQuestion()` / `getAllQuestions()` helpers |

## For AI Agents

### Working In This Directory
- Questions are in German
- Categories defined as `DyadCategory[]` with key, name, icon, and questions array
- `getRandomQuestion(categoryKey?)` returns a random question, optionally filtered by category
- Used as local fallback when Gemini API is unavailable
- The canonical category catalog lives in `../shared/categories.ts` — this module re-exports it; no manual key sync needed

### Testing Requirements
- `npx tsc --noEmit` must pass

## Dependencies

### Internal
- Imported by `../services/promptService.ts` (fallback)
- Imported by `../App.tsx` (HomeView)
- Category keys validated in `../services/promptService.ts`
- Canonical catalog re-exported from `../shared/categories.ts`

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
