<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-23 | Updated: 2026-03-23 -->

# api

## Purpose
Vercel serverless API routes (Node.js runtime). Handle server-side operations that require secrets or elevated permissions — room creation, push notifications, AI prompt generation, and account deletion.

## Key Files

| File | Description |
|------|-------------|
| `create-room.ts` | Creates a Daily.co video room — called when two partners match |
| `delete-account.ts` | Handles GDPR-compliant account deletion via Supabase Admin |
| `generate-prompt.ts` | Generates AI dyad prompts via Google Gemini — with category filtering |
| `send-push.ts` | Sends web push notifications for session invitations |

## For AI Agents

### Working In This Directory
- These run on Vercel as serverless functions (not in the browser)
- Access secrets via `process.env` (DAILY_API_KEY, GEMINI_API_KEY, SUPABASE_SERVICE_ROLE_KEY, etc.)
- Route mapping defined in `../vercel.json`
- Use `@vercel/node` types for request/response
- Validate all input — these are public endpoints

### Testing Requirements
- No automated tests yet — test manually via `vercel dev` or curl
- Ensure TypeScript compiles: `npx tsc --noEmit`

### Common Patterns
- Each file exports a default handler: `export default async function(req, res)`
- Input validation at the top, error handling with try/catch
- Return JSON responses with appropriate status codes
- Log errors with `[FunctionName]` prefix

## Dependencies

### Internal
- Called from `../services/geminiService.ts` (generate-prompt)
- Called from `../hooks/useVideoCall.ts` (create-room)
- Called from `../hooks/usePushNotifications.ts` (send-push)

### External
- `@vercel/node` — Request/response types
- `@google/genai` — Gemini AI (generate-prompt)
- `@supabase/supabase-js` — Admin client for account deletion
- Daily.co REST API — Room creation

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
