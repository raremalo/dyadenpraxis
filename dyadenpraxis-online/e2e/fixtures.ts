import { test as base, expect } from '@playwright/test';

// Auto-Fixture: Alle Supabase-Endpunkte am Netzwerk vorbei mocken.
//
// WICHTIG: Playwright prüft page.route-Handler in umgekehrter Registrierungs-
// reihenfolge (zuletzt registriert gewinnt) — deshalb: generische Muster zuerst,
// spezifische Endpunkte zuletzt registrieren.
//
// - Sauberer Browser-Kontext => keine gespeicherte Session => unauthentifiziert
//   (identisch zu Prod-Erstbesuch). getSession() macht ohne Storage KEINEN
//   Netzwerk-Call; sollte eine supabase-js-Version doch fragen, antwortet der
//   generische Mock mit 200/{} => currentUser bleibt null, der Auth-Gate in
//   App.tsx zeigt AuthView wie in Produktion.
// - /auth/v1/token mit 400 bedient bewusst auch den Login-Submit: Die
//   Forms-Suite testt so den echten Fehler-Pfad deterministisch offline.
// - PostgREST-wahre Formen: .select()-Listen sind Arrays, Einzelzeilen via
//   rpc sind Objekte — ein generisches '{}' würde unmögliche Zustände
//   testen. Realtime-WebSockets öffnen im sauberen Kontext nicht (keine
//   Session).
export const test = base.extend({
  page: async ({ page }, use) => {
    // 1. Generisch (niedrigste Priorität)
    await page.route('**/auth/v1/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
    );
    await page.route('**/rest/v1/rpc/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
    );
    await page.route('**/rest/v1/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
    );
    // 2. Spezifisch (höchste Priorität)
    await page.route('**/auth/v1/token**', (route) =>
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'invalid_grant',
          error_description: 'Invalid credentials (e2e mock)',
        }),
      }),
    );
    await use(page);
  },
});

export { expect };
