<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-23 | Updated: 2026-03-23 -->

# auth

## Purpose
Authentication UI components — login, registration, and auth flow screens.

## Key Files

| File | Description |
|------|-------------|
| `AuthView.tsx` | Combined login/signup view — email/password form, toggles between sign-in and sign-up modes, uses `useAuth()` context |

## For AI Agents

### Working In This Directory
- Auth UI is shown when `useAuth().user` is null (see App.tsx auth guard)
- All form labels and error messages in German
- Uses `useAuth().signIn()` and `useAuth().signUp()` — no direct Supabase calls
- Follow existing Tailwind + CSS custom property patterns

### Testing Requirements
- `npx tsc --noEmit` must pass

## Dependencies

### Internal
- `../../contexts/AuthContext.tsx` — `useAuth()` for sign in/up/out
- `../../lib/supabase.ts` — Indirectly via AuthContext

### External
- `lucide-react` — Icons

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
