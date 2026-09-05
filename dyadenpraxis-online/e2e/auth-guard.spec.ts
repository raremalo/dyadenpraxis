import { test, expect } from './fixtures';

// Auth-Gate: Unauthentifizierte sehen die AuthView, während die URL erhalten
// bleibt (kein Redirect — App.tsx rendert AuthView via showAuth-Ternary
// ÜBER dem Routen-Baum). Alle App-Routen sind geschützt, PUBLIC_PATHS enthält
// nur /reset-password.
const protectedPaths = [
  '/connect',
  '/session',
  '/session/e2e-dummy-id',
  '/profile',
  '/calendar',
  '/groups',
  '/partner-finder',
  '/instructions',
];

test.describe('Auth-Gate (unauthentifiziert)', () => {
  for (const path of protectedPaths) {
    test(`${path} zeigt AuthView, URL bleibt erhalten`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'domcontentloaded' });

      await expect(page.locator('h1').first()).toHaveText('Dyadenpraxis');
      // Login-Formular sichtbar = Gate zugeschlagen
      await expect(page.getByPlaceholder('Passwort')).toBeVisible();
      // Kein Redirect, kein ErrorBoundary
      await expect(page).toHaveURL(new RegExp(`${path.replace(/\//g, '\\/')}$`));
      await expect(page.getByText('Etwas ist schiefgelaufen')).toHaveCount(0);
    });
  }
});
