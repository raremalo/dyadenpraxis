import { readFileSync } from 'node:fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Sentry-Release-Tag: Commit-SHA auf Vercel (System-Env, nur im Build
// verfügbar), lokal die package.json-Version.
const appVersion =
  process.env.VERCEL_GIT_COMMIT_SHA ??
  JSON.parse(readFileSync('package.json', 'utf8')).version;

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        __APP_VERSION__: JSON.stringify(appVersion),
      },
      resolve: {
        alias: {
          '@': import.meta.dirname,
        }
      },
      build: {
        rolldownOptions: {
          output: {
            manualChunks(id) {
              if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) {
                return 'vendor-react';
              }
              if (id.includes('node_modules/@supabase')) {
                return 'vendor-supabase';
              }
              if (id.includes('node_modules/lucide-react')) {
                return 'vendor-ui';
              }
              if (id.includes('node_modules/@daily-co')) {
                return 'vendor-daily';
              }
            },
          },
        },
      },
    };
});
