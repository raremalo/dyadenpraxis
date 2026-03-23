<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-23 | Updated: 2026-03-23 -->

# supabase

## Purpose
Supabase CLI project directory — contains edge functions and locally-generated migrations. The canonical migration sequence lives in the root `migrations/` directory.

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `functions/` | Supabase Edge Functions (Deno runtime) (see `functions/AGENTS.md`) |
| `migrations/` | Supabase CLI-generated migrations — copies/variants of root `migrations/` (see `migrations/AGENTS.md`) |

## For AI Agents

### Working In This Directory
- Edge functions use Deno runtime (not Node.js)
- Prefer creating Vercel API routes (`../api/`) over edge functions for new server-side logic
- The canonical migrations live in the root `/migrations/` — these are Supabase CLI artifacts

## Dependencies

### Internal
- `../../migrations/` — Canonical migration source
- `../lib/supabase.ts` — Client that connects to this Supabase instance

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
