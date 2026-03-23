<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-23 | Updated: 2026-03-23 -->

# lib

## Purpose
Library initialization and shared client instances. Currently contains the singleton Supabase client used throughout the app.

## Key Files

| File | Description |
|------|-------------|
| `supabase.ts` | Creates and exports the Supabase client using `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` env vars |

## For AI Agents

### Working In This Directory
- The Supabase client is a singleton — import it, don't create new instances
- Environment variables must be prefixed with `VITE_` for Vite to expose them
- If adding new library clients, follow the same pattern: validate env vars, export singleton

### Testing Requirements
- `npx tsc --noEmit` must pass
- Env var validation throws at startup if vars are missing

## Dependencies

### External
- `@supabase/supabase-js` — `createClient`

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
