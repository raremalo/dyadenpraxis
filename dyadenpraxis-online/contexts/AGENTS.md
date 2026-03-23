<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-23 | Updated: 2026-03-23 -->

# contexts

## Purpose
React context providers that supply global state throughout the component tree. Wrapped in `App.tsx` in order: AuthProvider → SettingsProvider → SessionProvider.

## Key Files

| File | Description |
|------|-------------|
| `AuthContext.tsx` | Authentication state — user, session, profile, sign in/up/out, online presence tracking |
| `SessionContext.tsx` | Active dyad session state — current session, partner, timer sync |
| `SettingsContext.tsx` | App settings — theme (light/dark), language (de/en), translation helper `t` |

## For AI Agents

### Working In This Directory
- Context naming: `[Entity]Context.tsx`
- Each context exports a Provider component and a `use[Entity]` hook
- The `use[Entity]` hook throws if used outside its Provider
- AuthContext handles Supabase auth state, token refresh, and profile CRUD
- SettingsContext provides `t` (translations object) used across all components

### Testing Requirements
- Context changes affect the entire app — test thoroughly
- `npx tsc --noEmit` must pass

### Common Patterns
```tsx
const MyContext = createContext<MyContextType | undefined>(undefined);
export const MyProvider: React.FC<{ children: ReactNode }> = ({ children }) => { ... };
export const useMy = () => { const ctx = useContext(MyContext); if (!ctx) throw ...; return ctx; };
```

## Dependencies

### Internal
- `../lib/supabase.ts` — Supabase client (used by AuthContext)
- `../hooks/usePresence.ts` — Online presence (used by AuthContext)
- `../translations.ts` — i18n strings (used by SettingsContext)

### External
- `@supabase/supabase-js` — Auth types (User, Session)

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
