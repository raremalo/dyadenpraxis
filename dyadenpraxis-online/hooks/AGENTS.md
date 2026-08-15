<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-23 | Updated: 2026-03-23 -->

# hooks

## Purpose
Custom React hooks — the business logic layer of the application. Each hook encapsulates a specific domain concern (video, sessions, chat, etc.) and exposes a clean interface to components.

## Key Files

| File | Description |
|------|-------------|
| `useSession.ts` | Session lifecycle — create, join, leave, track active session state |
| `useVideoCall.ts` | Daily.co video call management — join/leave room, track participants |
| `useDyadTimerEngine.ts` | Core timer state machine — phase transitions (speaker→listener→contemplation), local-only |
| `useGongTimer.ts` | Standalone gong/meditation timer with configurable intervals |
| `useChat.ts` | Real-time chat via Supabase — send/receive messages during sessions |
| `usePresence.ts` | Supabase Realtime presence — tracks which users are online |
| `usePartnerSearch.ts` | Partner discovery and matching logic |
| `useInvitations.ts` | Session invitation send/receive/accept/decline |
| `useScheduledSessions.ts` | Calendar-based session scheduling |
| `useFeedback.ts` | Post-session feedback submission and retrieval |
| `useDispute.ts` | Dispute reporting for problematic sessions |
| `usePeerVerification.ts` | Peer-to-peer identity verification flow |
| `useAvailability.ts` | User availability slots management |
| `useAvatarUpload.ts` | Profile avatar upload to Supabase Storage |
| `useAccountDeletion.ts` | GDPR account deletion flow |
| `usePushNotifications.ts` | Web push notification registration and sending |

## For AI Agents

### Working In This Directory
- Hook naming: `use[Entity][Action?].ts`
- Each hook returns a typed object (define `Use[Entity]Return` interface)
- All Supabase calls with try/catch and German error messages
- Structured logging: `console.error('[HookName]', error)`
- Hooks should be framework-agnostic logic — no JSX

### Testing Requirements
- Test hooks via `@testing-library/react` `renderHook`
- Existing tests in `../tests/` — follow those patterns
- `npx tsc --noEmit` must pass

### Common Patterns
- Use `useCallback` for functions passed to components
- Use `useEffect` cleanup to prevent state updates after unmount
- Supabase Realtime subscriptions cleaned up in useEffect return
- Reference `useVideoCall.ts` or `useSession.ts` as canonical examples

## Dependencies

### Internal
- `../lib/supabase.ts` — All database/auth/realtime operations
- `../types.ts` — Shared type definitions
- `../contexts/AuthContext.tsx` — `useAuth()` for user identity

### External
- `@supabase/supabase-js` — Database, auth, realtime, storage
- `@daily-co/daily-react` — Video call hooks (useVideoCall)

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
