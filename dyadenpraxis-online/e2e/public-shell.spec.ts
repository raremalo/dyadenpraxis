import { test, expect } from './fixtures';

// Smoke: Öffentliche Shell unauthentifiziert. Dyaden hat KEINE öffentlichen
// SPA-Routen außer /reset-password (lib/routing.ts PUBLIC_PATHS) — der
// Auth-Gate zeigt AuthView, während die URL erhalten bleibt. Legal-/Tools-
// Seiten sind statische Dateien aus public/ (keine SPA-Routen).
test.describe('Öffentliche Shell (unauthentifiziert)', () => {
  test('/ zeigt AuthView mit Branding statt App-Inhalt', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('h1').first()).toHaveText('Dyadenpraxis');
    await expect(page.getByText('Willkommen bei')).toBeVisible();
    // Login-Formular statt App-Inhalt
    await expect(page.getByPlaceholder('E-Mail')).toBeVisible();
    await expect(page.getByPlaceholder('Passwort')).toBeVisible();
    // ErrorBoundary-Fallback darf nie sichtbar sein
    await expect(page.getByText('Etwas ist schiefgelaufen')).toHaveCount(0);
  });

  test('/reset-password ist öffentlich: Abgelaufen-Karte statt Formular', async ({ page }) => {
    await page.goto('/reset-password', { waitUntil: 'domcontentloaded' });

    // Ohne Recovery-Session ist der Fallback die Abgelaufen-Karte — das
    // Passwort-Feld darf NICHT erscheinen (ResetPassword.tsx:48).
    await expect(page).toHaveURL(/\/reset-password$/);
    await expect(
      page.getByText('Dieser Link ist abgelaufen. Bitte fordere einen neuen an.'),
    ).toBeVisible();
    await expect(page.locator('input[type="password"]')).toHaveCount(0);
  });

  test('Unbekannte Route zeigt AuthView (Auth-Gate greift vor Wildcard-Redirect)', async ({ page }) => {
    // Der Wildcard-Redirect (* -> /) lebt INNERHALB des authentifizierten
    // Routen-Baums — unauthentifiziert rendert der Gate AuthView, URL bleibt.
    await page.goto('/gibt-es-nicht', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('h1').first()).toHaveText('Dyadenpraxis');
    await expect(page).toHaveURL(/\/gibt-es-nicht$/);
  });

  test('Statische Marketing-Seite /impressum.html wird ohne SPA ausgeliefert', async ({ page }) => {
    await page.goto('/impressum.html', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('h1').first()).toHaveText('Impressum');
    // Kein SPA-Boot: AuthView darf nicht erscheinen
    await expect(page.getByText('Willkommen bei')).toHaveCount(0);
  });
});
