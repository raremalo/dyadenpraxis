<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-14 | Updated: 2026-04-14 -->

# create-room

## Purpose
Supabase Edge Function (Deno runtime) that creates a Daily.co video room for an accepted dyad session. Validates JWT auth, checks session ownership and status, provisions a time-limited Daily.co room, and generates per-participant meeting tokens.

## Key Files

| File | Description |
|------|-------------|
| `index.ts` | Edge function entry — auth, session validation, Daily.co room + token creation |

## For AI Agents

### Working In This Directory
- This is a **Deno** runtime — use ESM imports from `esm.sh` and `jsr:`, no `require()`
- CORS headers are required on all responses (preflight + actual)
- All error messages are in German (user-facing)
- Structured logging with `[create-room]` prefix
- Only the session requester (`requester_id`) may create the room
- Session must have status `accepted` before room creation

### Request/Response Flow
1. Validate JWT from `Authorization` header via Supabase `getUser()`
2. Parse `{ sessionId, includeThird? }` from request body
3. Load session from DB, verify requester ownership + `accepted` status
4. Create Daily.co room with `max_participants: 2` (or 3 if third participant)
5. Room expiry = session duration + 5 min safety buffer
6. Generate per-participant meeting tokens (requester, partner, optional third)
7. Return `{ roomUrl, tokens: { requester, partner, third? } }`

### Environment Variables
- `DAILY_API_KEY` — Daily.co API key for room/token creation
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key for server-side DB access

### Testing Requirements
- Deploy with `supabase functions deploy create-room`
- Test via Supabase CLI: `supabase functions serve` for local development

## Dependencies

### Internal
- `sessions` table — session lookup and validation
- `profiles` table — participant name lookup for meeting tokens

### External
- `@supabase/supabase-js` 2 (via esm.sh) — DB client
- Daily.co REST API (`/v1/rooms`, `/v1/meeting-tokens`) — video infrastructure

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
