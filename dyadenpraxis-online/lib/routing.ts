/**
 * Single source of truth for routing-related path sets.
 * Extracted from App.tsx to prevent drift between PUBLIC_PATHS and hideNav.
 *
 * Legal pages are served as static HTML from public/ — they are not SPA
 * routes and must not be listed here.
 */

/** Paths accessible without authentication */
export const PUBLIC_PATHS = [
  '/reset-password',
] as const;

/** Paths where the navigation bar is hidden */
export const NAV_HIDDEN_PATHS = [
  '/session',
  '/connect',
  '/instructions',
  '/reset-password',
] as const;
