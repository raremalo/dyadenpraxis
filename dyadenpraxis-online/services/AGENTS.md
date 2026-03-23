<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-23 | Updated: 2026-03-23 -->

# services

## Purpose
Service adapters for external APIs. Abstracts API calls behind clean async functions with error handling and local fallbacks.

## Key Files

| File | Description |
|------|-------------|
| `geminiService.ts` | Fetches AI-generated dyad prompts via `/api/generate-prompt` — validates category keys against allowlist, falls back to local question pool on error |

## For AI Agents

### Working In This Directory
- Services call Vercel API routes (not external APIs directly from the browser)
- Always include error handling with meaningful fallbacks
- Validate input against allowlists before sending to API
- Category keys must stay in sync with `../data/dyadQuestions.ts`

### Testing Requirements
- `npx tsc --noEmit` must pass

## Dependencies

### Internal
- `../types.ts` — `PromptResponse` type
- `../data/dyadQuestions.ts` — `getRandomQuestion`, `DYAD_CATEGORIES` (fallback + validation)

### External
- Calls `/api/generate-prompt` (Vercel serverless function)

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
