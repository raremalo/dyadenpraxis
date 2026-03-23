<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-23 | Updated: 2026-03-23 -->

# dyadenpraxis-online

## Purpose
Main application directory — a Vite-powered React 19 SPA for online dyad meditation practice. Contains all frontend code, Vercel API routes, Supabase edge functions, migrations, tests, and configuration.

## Key Files

| File | Description |
|------|-------------|
| `App.tsx` | Root component — BrowserRouter, auth guard, lazy-loaded routes, context providers |
| `index.tsx` | Entry point — renders App into DOM |
| `index.html` | HTML shell with Vite entry |
| `types.ts` | Shared TypeScript types — AppView, DyadRole, DyadConfig, GongTimer types, UserProfile |
| `translations.ts` | i18n strings (German/English) used via `useSettings().t` |
| `metadata.json` | App metadata |
| `package.json` | Dependencies and scripts (`dev`, `build`, `test`) |
| `tsconfig.json` | TypeScript strict config |
| `vite.config.ts` | Vite build config with React plugin |
| `vitest.config.ts` | Test runner config (jsdom environment) |
| `tailwind.config.js` | Tailwind CSS 4 configuration |
| `postcss.config.js` | PostCSS with Tailwind plugin |
| `vercel.json` | Vercel deployment config — API route rewrites |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `api/` | Vercel serverless API routes (see `api/AGENTS.md`) |
| `components/` | React components organized by feature (see `components/AGENTS.md`) |
| `contexts/` | React context providers — Auth, Session, Settings (see `contexts/AGENTS.md`) |
| `data/` | Static data — curated dyad questions pool (see `data/AGENTS.md`) |
| `hooks/` | Custom React hooks — business logic layer (see `hooks/AGENTS.md`) |
| `lib/` | Library initialization — Supabase client (see `lib/AGENTS.md`) |
| `public/` | Static assets — favicon, service worker |
| `services/` | External API service adapters (see `services/AGENTS.md`) |
| `src/` | Global styles (see `src/AGENTS.md`) |
| `supabase/` | Supabase edge functions and local migrations (see `supabase/AGENTS.md`) |
| `tests/` | Test suites with vitest (see `tests/AGENTS.md`) |

## For AI Agents

### Working In This Directory
- Run `npm install` if `node_modules` is missing
- All user-facing text must be in German — use `translations.ts` for new strings
- Follow existing naming conventions (PascalCase components, `use[Entity]` hooks)
- Lazy-load new route components via `React.lazy()`
- Wrap route components in `ErrorBoundary` and `Suspense`

### Testing Requirements
```bash
npx tsc --noEmit        # Must pass — zero TypeScript errors
npx vite build          # Must succeed — production build
npx vitest run          # Unit tests must pass
```

### Common Patterns
- Components use Tailwind CSS with CSS custom properties (`var(--c-*)`) for theming
- Icons from `lucide-react`
- Supabase calls wrapped in try/catch with German error messages
- Structured logging: `console.error('[Context]', error)`
- State management via React Context (no Redux/Zustand)

## Dependencies

### External
- `react` 19, `react-dom` 19 — UI framework
- `react-router-dom` 7 — Client-side routing
- `@supabase/supabase-js` 2 — Backend client
- `@daily-co/daily-js`, `@daily-co/daily-react` — Video calling
- `@google/genai` — Gemini AI for prompt generation
- `@tanstack/react-query` 5 — Server state management
- `lucide-react` — Icons
- `jose` — JWT handling
- `tailwindcss` 4 — Styling
- `vite` 6 — Build tool
- `vitest` 4 — Test runner
- `typescript` 5.8 — Type safety

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
