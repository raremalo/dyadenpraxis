<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-23 | Updated: 2026-03-23 -->

# data

## Purpose
Static data used as fallback content and curated question pools for dyad practice sessions.

## Key Files

| File | Description |
|------|-------------|
| `dyadQuestions.ts` | Curated dyad questions organized by category (existenziell, praesenz, beziehung, etc.) with `getRandomQuestion()` helper and `DYAD_CATEGORIES` export |

## For AI Agents

### Working In This Directory
- Questions are in German
- Categories defined as `DyadCategory[]` with key, name, icon, and questions array
- `getRandomQuestion(categoryKey?)` returns a random question, optionally filtered by category
- Used as local fallback when Gemini API is unavailable
- Category keys must match between this file, `geminiService.ts`, and `CategoryPicker.tsx`

### Testing Requirements
- `npx tsc --noEmit` must pass

## Dependencies

### Internal
- Imported by `../services/geminiService.ts` (fallback)
- Imported by `../App.tsx` (HomeView)
- Category keys validated in `../services/geminiService.ts`

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
