import { defineConfig, devices } from '@playwright/test';

// E2E-Konfiguration: Chromium gegen den echten Vite-Dev-Server.
//
// Netzwerk-Strategie (Blueprint: em-connect): Der Dev-Server bootet mit
// DUMMY-Env (siehe webServer.env — lib/supabase.ts wirft sonst;
// VITE_SENTRY_DSN='' verhindert, dass lokale .env-Dateien mit Produktiv-DSN
// echte Sentry-Events auslösen). Alle Supabase-Aufrufe mockt die Auto-Fixture
// in e2e/fixtures.ts am Netzwerk vorbei → Tests sind offline-deterministisch,
// in CI und lokal identisch.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // 60s: Kalter Vite-Dev-Server + externes Font-Stylesheet im index.html
  // (load-Event wartet auf fonts.googleapis.com) können beim ersten Test
  // länger dauern — Flakes sollen echte sein, keine Kaltstart-Races.
  timeout: 60_000,
  forbidOnly: !!process.env.CI,
  // Lokal 0 Retries: Flakes sollen hier sichtbar werden, nicht weggeretryt
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:5199',
    // DE deterministisch erzwingen — App-Default ist 'de', aber Locale/
    // Timezone fixieren schließt Umgebungsdrift aus (CI-Runner defaulten
    // auf en-US)
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
    trace: 'on-first-retry',
    // PWA-Service-Worker blockieren — Caching stört deterministische Runs
    serviceWorkers: 'block',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    // Eigener Port 5199: kollidiert nicht mit `npm run dev` (Port 3000),
    // --strictPort verhindert stilles Ausweichen.
    command: 'npm run dev -- --port 5199 --strictPort',
    url: 'http://localhost:5199',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      // Deterministisches Offline-Setup. Process-Env überschreibt lokale
      // .env-Dateien (Vite-Priorität: process-Env gewinnt).
      VITE_SUPABASE_URL: 'https://e2e-dummy.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'e2e-dummy-anon-key',
      // Sentry AUS: synthetische E2E-Fehler dürfen niemals im Produktiv-
      // Projekt landen (Quota + Rauschen).
      VITE_SENTRY_DSN: '',
    },
  },
});
