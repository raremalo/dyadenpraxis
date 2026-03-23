<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-23 | Updated: 2026-03-23 -->

# components

## Purpose
React components for the Dyaden-Praxis app. Each component is a single file, organized by feature domain. Components use Tailwind CSS with CSS custom properties for theming and `lucide-react` for icons.

## Key Files

| File | Description |
|------|-------------|
| `ActiveSession.tsx` | Full session view — integrates DyadTimer, VideoRoom, ChatWindow, feedback |
| `PartnerConnect.tsx` | Partner matching flow — availability toggle, queue, invitation system |
| `PartnerFinder.tsx` | Partner directory with search, filtering, and profile cards |
| `VideoRoom.tsx` | Daily.co video integration — sync bridge between timer and partner |
| `DyadTimer.tsx` | Timer UI display — shows phase, role, countdown |
| `ChatWindow.tsx` | Real-time chat during sessions via Supabase |
| `ChatMessage.tsx` | Individual chat message bubble |
| `ChatButton.tsx` | Floating chat toggle button |
| `CategoryPicker.tsx` | Category chip selector with AI toggle for prompt generation |
| `Calendar.tsx` | Calendar overview page |
| `CalendarView.tsx` | Calendar display component |
| `ScheduleModal.tsx` | Modal for scheduling future sessions |
| `SessionFeedbackModal.tsx` | Post-session feedback modal with star rating |
| `SessionInviteBanner.tsx` | Banner showing incoming session invitations |
| `FeedbackSummary.tsx` | Displays aggregated session feedback |
| `StarRating.tsx` | Star rating input component |
| `DisputeModal.tsx` | Dispute reporting modal |
| `GongTimerControl.tsx` | Standalone meditation gong/timer control |
| `Groups.tsx` | Practice groups page |
| `Instructions.tsx` | How-it-works guide page |
| `InvitationManager.tsx` | Manage sent/received session invitations |
| `Navigation.tsx` | Bottom tab navigation bar |
| `NotificationPermission.tsx` | Push notification permission request UI |
| `PartnerCard.tsx` | Partner profile card in listings |
| `Profile.tsx` | User profile page — edit bio, avatar, settings |
| `ProfileVerificationCard.tsx` | Verification status display card |
| `TrustBadge.tsx` | Trust level badge (new/known/verified) |
| `VerificationBadge.tsx` | Peer verification badge |
| `AvailabilitySlotEditor.tsx` | Editor for availability time slots |
| `ErrorBoundary.tsx` | React error boundary with German fallback UI |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `auth/` | Authentication views (see `auth/AGENTS.md`) |

## For AI Agents

### Working In This Directory
- One component per file, named in PascalCase matching the entity
- Entity MUST be in the component name — no generic `Card`, `Modal`, `Helper`
- Use Tailwind CSS with `var(--c-*)` custom properties for theme colors
- Icons from `lucide-react` only
- Lazy-load route-level components in `App.tsx` via `React.lazy()`
- All user-facing strings in German — use `useSettings().t` for i18n

### Testing Requirements
- Components can be tested with `@testing-library/react` + vitest
- Ensure `npx tsc --noEmit` passes after changes

### Common Patterns
- Props interfaces defined above the component
- `useAuth()` for user/profile access
- `useSettings()` for theme/language
- Supabase calls via hooks (not directly in components)
- Error boundaries wrap route-level components

## Dependencies

### Internal
- `../hooks/` — All business logic via custom hooks
- `../contexts/` — Auth, Session, Settings providers
- `../types.ts` — Shared type definitions
- `../translations.ts` — i18n strings (via SettingsContext)

### External
- `lucide-react` — All icons
- `react-router-dom` — Navigation (useNavigate, useLocation)
- `@daily-co/daily-react` — Video components (in VideoRoom)

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
