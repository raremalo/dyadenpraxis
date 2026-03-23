<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-23 | Updated: 2026-03-23 -->

# tests

## Purpose
Test suites using vitest with jsdom environment and React Testing Library. Tests hooks and components for the Dyaden-Praxis app.

## Key Files

| File | Description |
|------|-------------|
| `setup.ts` | Test environment setup — jsdom configuration, global mocks |
| `useSession.test.ts` | Tests for the useSession hook |
| `useVideoCall.test.ts` | Tests for the useVideoCall hook |

## For AI Agents

### Working In This Directory
- Test framework: vitest + @testing-library/react
- Test files named `[module].test.ts` or `[module].test.tsx`
- Setup file loaded automatically via vitest config
- Mock Supabase client in tests — don't hit real backend
- Run tests: `npx vitest run` (single run) or `npx vitest` (watch mode)

### Testing Requirements
```bash
npx vitest run    # All tests must pass
```

### Common Patterns
- Hook tests use `renderHook` from `@testing-library/react`
- Mock `../lib/supabase` module
- Use `vi.fn()` for function mocks
- Follow existing test files as templates

## Dependencies

### Internal
- `../hooks/` — Hooks under test
- `../lib/supabase.ts` — Mocked in tests

### External
- `vitest` — Test runner
- `@testing-library/react` — React testing utilities
- `@testing-library/jest-dom` — DOM matchers
- `jsdom` — Browser environment simulation

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
