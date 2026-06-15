/**
 * Single source of truth for routing-related path sets.
 * Extracted from App.tsx to prevent drift between PUBLIC_PATHS and hideNav.
 */

/** Paths accessible without authentication */
export const PUBLIC_PATHS = [
  '/reset-password',
  '/impressum',
  '/datenschutz',
  '/agb',
] as const;

/** Paths where the navigation bar is hidden */
export const NAV_HIDDEN_PATHS = [
  '/session',
  '/connect',
  '/instructions',
  '/reset-password',
  '/impressum',
  '/datenschutz',
  '/agb',
] as const;
