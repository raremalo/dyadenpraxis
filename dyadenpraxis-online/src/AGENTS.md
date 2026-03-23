<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-23 | Updated: 2026-03-23 -->

# src

## Purpose
Global styles for the application. Contains the main CSS entry point with Tailwind directives and CSS custom properties for theming.

## Key Files

| File | Description |
|------|-------------|
| `index.css` | Global stylesheet — Tailwind imports, CSS custom properties for light/dark themes (`--c-bg-app`, `--c-text-main`, `--c-accent`, etc.), base element styles, utility classes, animations |

## For AI Agents

### Working In This Directory
- Theme colors use CSS custom properties prefixed with `--c-`
- Light and dark themes defined via `@media (prefers-color-scheme)` or `.dark` class
- Add new utility classes here only if they're used across multiple components
- Prefer Tailwind utility classes in components over custom CSS

### Testing Requirements
- `npx vite build` must succeed (CSS is processed during build)

## Dependencies

### External
- `tailwindcss` 4 — Utility framework
- `postcss` — CSS processing

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
