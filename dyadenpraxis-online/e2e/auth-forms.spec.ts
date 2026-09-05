import { test, expect } from './fixtures';

// Formulare: Native Validierung + echte Submit-Pfade gegen gemockte Backends.
// Login-Submit trifft den Token-Mock aus fixtures.ts (400 invalid_grant).

// Der Submit-Button trägt je nach Modus denselben Text wie der Tab/Toggle-
// Link ('Anmelden'/'Registrieren') — der Submit ist der einzige Button im
// <form>-Element.
const submitButton = (page: import('@playwright/test').Page) =>
  page.locator('form button[type="submit"]');

test.describe('Login-Formular', () => {
  test('leerer Submit stoppt auf nativer Validierung, kein Token-Request', async ({ page }) => {
    const authRequests: string[] = [];
    page.on('request', (req) => {
      if (req.url().includes('/auth/v1/token')) authRequests.push(req.url());
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await submitButton(page).click();

    // HTML5-Validierung (required) blockt den Submit — Feld ist :invalid
    await expect(page.locator('input[type="email"]')).toHaveJSProperty(
      'validity.valid',
      false,
    );
    expect(authRequests).toHaveLength(0);
    await expect(page).toHaveURL(/\/$/);
  });

  test('gefüllter Submit gegen 400-Mock zeigt Fehlermeldung', async ({ page }) => {
    const authRequests: string[] = [];
    page.on('request', (req) => {
      if (req.url().includes('/auth/v1/token')) authRequests.push(req.url());
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.getByPlaceholder('E-Mail').fill('e2e@example.de');
    await page.getByPlaceholder('Passwort').fill('falsches-passwort');
    await submitButton(page).click();

    // Request ging raus (gegen den Mock) und die App zeigt den Fehler
    await expect.poll(() => authRequests.length).toBeGreaterThan(0);
    // GoTrue-artiger 400 invalid_grant mappt auf die Anmelde-Fehlermeldung
    await expect(page.getByText('Anmeldung fehlgeschlagen. Bitte überprüfe deine Eingaben.')).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe('Registrierung', () => {
  // Tab-Leiste und Toggle-Link tragen beide 'Registrieren' — der Tab kommt
  // zuerst im DOM.
  const registerTab = (page: import('@playwright/test').Page) =>
    page.getByRole('button', { name: 'Registrieren', exact: true }).first();

  test('ohne Namen zeigt Client-Validierung, kein Signup-Request', async ({ page }) => {
    const signupRequests: string[] = [];
    page.on('request', (req) => {
      if (req.url().includes('/auth/v1/signup')) signupRequests.push(req.url());
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await registerTab(page).click();
    await page.getByPlaceholder('E-Mail').fill('e2e@example.de');
    await page.getByPlaceholder('Passwort').fill('sicheres-passwort');
    await submitButton(page).click();

    await expect(page.getByText('Bitte gib deinen Namen ein')).toBeVisible();
    expect(signupRequests).toHaveLength(0);
  });

  test('Signup-Fehler gegen 400-Mock zeigt Fehlermeldung', async ({ page }) => {
    await page.route('**/auth/v1/signup**', (route) =>
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ msg: 'User already registered (e2e mock)' }),
      }),
    );

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await registerTab(page).click();
    await page.getByPlaceholder('Name').fill('E2E Tester');
    await page.getByPlaceholder('E-Mail').fill('e2e@example.de');
    await page.getByPlaceholder('Passwort').fill('sicheres-passwort');
    await submitButton(page).click();

    await expect(page.getByText('Registrierung fehlgeschlagen. Bitte versuche es erneut.')).toBeVisible();
  });
});

test.describe('Passwort vergessen (Anti-Enumeration)', () => {
  test('zeigt Erfolgs-Panel auch bei 400 vom Backend (keine Nutzer-Enumeration)', async ({ page }) => {
    // resetPasswordForEmail schlägt fehl → AuthView zeigt TROTZDEM das
    // Success-Panel (Anti-Enumeration-Kontrakt, AuthView.tsx:20-25)
    await page.route('**/auth/v1/recover**', (route) =>
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ msg: 'Email rate limit exceeded (e2e mock)' }),
      }),
    );

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Passwort vergessen?' }).click();
    await page.getByPlaceholder('E-Mail').fill('e2e@example.de');
    await submitButton(page).click();

    await expect(page.getByText('Prüfe deinen Posteingang')).toBeVisible();
    // Zurück-zur-Anmeldung-Link funktioniert
    await page.getByRole('button', { name: 'Zurück zur Anmeldung' }).click();
    await expect(page.getByPlaceholder('Passwort')).toBeVisible();
  });
});
