/// <reference types="vite/client" />

// Build-time define aus vite.config.ts: Commit-SHA auf Vercel, sonst
// package.json-Version. Release-Tag für Sentry (siehe index.tsx).
declare const __APP_VERSION__: string;
