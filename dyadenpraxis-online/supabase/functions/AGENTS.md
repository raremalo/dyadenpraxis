<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-23 | Updated: 2026-03-23 -->

# functions

## Purpose
Supabase Edge Functions running on Deno runtime. Currently contains the `create-room` function for Daily.co room creation.

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `create-room/` | Edge function that creates Daily.co video rooms |

## For AI Agents

### Working In This Directory
- Edge Functions use Deno runtime — NOT Node.js (no `require`, use `import`)
- Each function lives in its own subdirectory with an `index.ts` entry point
- Deploy via `supabase functions deploy <function-name>`
- For new server-side logic, prefer Vercel API routes (`../../api/`) unless Supabase-specific features are needed (e.g., database triggers, webhooks)
- Function naming: `kebab-case`

### Testing Requirements
- Test locally with `supabase functions serve`

## Dependencies

### Internal
- Called from `../../hooks/useVideoCall.ts` (create-room)

### External
- Supabase Edge Runtime (Deno)
- Daily.co REST API

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
