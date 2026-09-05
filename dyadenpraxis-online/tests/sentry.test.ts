import { describe, it, expect, vi } from 'vitest';

// setUser-Delegation testen, ohne echtes SDK zu initialisieren
vi.mock('@sentry/react', () => ({
  setUser: vi.fn(),
}));

import * as Sentry from '@sentry/react';
import { scrubEmails, scrubUrl, scrubBreadcrumb, scrubEventPii, syncSentryUser } from '../lib/sentry';

describe('scrubEmails', () => {
  it('ersetzt E-Mail-Adressen durch Platzhalter', () => {
    expect(scrubEmails('Login failed for max@example.com')).toBe(
      'Login failed for [redacted-email]',
    );
  });

  it('ersetzt mehrere E-Mails in einem Text', () => {
    expect(scrubEmails('a@x.de schrieb an b@y.org wegen Login')).toBe(
      '[redacted-email] schrieb an [redacted-email] wegen Login',
    );
  });

  it('erkennt Umlaut-/IDN-Domains', () => {
    expect(scrubEmails('Kontakt zu mueller@müllerei.de')).toBe(
      'Kontakt zu [redacted-email]',
    );
  });

  it('erkennt %40-kodierte Adressen (Query-Strings, GoTrue-Meldungen)', () => {
    expect(scrubEmails('user%40example.de not found')).toBe('[redacted-email] not found');
  });

  it('lässt E-Mail-freien Text unverändert', () => {
    expect(scrubEmails('Network error at GET /rest/v1/profiles')).toBe(
      'Network error at GET /rest/v1/profiles',
    );
  });

  it('erkennt %40-kodierte IDN-Domains', () => {
    expect(scrubEmails('user anna%40m%C3%BCnchen.de failed')).toBe(
      'user [redacted-email] failed',
    );
  });
});

describe('scrubUrl', () => {
  it('entfernt Query und Fragment komplett (token_hash, invite, access_token)', () => {
    expect(scrubUrl('https://dyadenpraxis.de/reset-password?token_hash=ONE-SHOT-SECRET#frag')).toBe(
      'https://dyadenpraxis.de/reset-password',
    );
  });

  it('lässt URLs ohne Query/Fragment unverändert', () => {
    expect(scrubUrl('/session')).toBe('/session');
  });
});

describe('scrubBreadcrumb', () => {
  it('scrubbt E-Mails in der Message', () => {
    const crumb = scrubBreadcrumb({ message: 'mail an a@b.de fehlgeschlagen' });
    expect(crumb.message).toBe('mail an [redacted-email] fehlgeschlagen');
  });

  it('entfernt Attribut-Werte aus ui.*-Messages (aria-label mit Namen)', () => {
    const crumb = scrubBreadcrumb({
      category: 'ui.click',
      message: 'click button [aria-label="Nachricht an Anna M."]',
    });
    expect(crumb.message).toBe('click button');
    expect(crumb.message).not.toContain('Anna');
  });

  it('scrubbt data.url/to/from inklusive Query (Navigation mit token_hash)', () => {
    const crumb = scrubBreadcrumb({
      category: 'navigation',
      message: 'Navigation',
      data: {
        from: '/reset-password?token_hash=SECRET',
        to: '/session?redirect=%2Fconnect',
        method: 'GET',
      },
    });
    expect(crumb.data?.from).toBe('/reset-password');
    expect(crumb.data?.to).toBe('/session');
    expect(crumb.data?.method).toBe('GET');
  });

  it('scrubbt E-Mails in beliebigen data-Stringwerten', () => {
    const crumb = scrubBreadcrumb({ data: { note: 'user x@y.de Ratelimit' } });
    expect(crumb.data?.note).toBe('user [redacted-email] Ratelimit');
  });
});

describe('scrubEventPii (beforeSend-Filter)', () => {
  it('scrubbt E-Mails aus Exception-Values', () => {
    const event = scrubEventPii({
      exception: { values: [{ value: 'User ralf@example.com not found' }] },
    });
    expect(event.exception?.values?.[0]?.value).toBe('User [redacted-email] not found');
  });

  it('scrubbt E-Mails aus Breadcrumb-Messages', () => {
    const event = scrubEventPii({
      breadcrumbs: [{ message: 'fetch failed for a@b.de' }, { message: 'navigation' }],
    });
    expect(event.breadcrumbs?.[0]?.message).toBe('fetch failed for [redacted-email]');
    expect(event.breadcrumbs?.[1]?.message).toBe('navigation');
  });

  it('scrubbt extra REKURSIV (verschachtelte Objekte/Arrays, __serialized__-Form)', () => {
    const event = scrubEventPii({
      extra: {
        __serialized__: { message: 'supabase rejected a@b.de', nested: { mail: 'c@d.org' } },
        list: ['x@y.de', 42],
      },
    });
    expect(event.extra?.__serialized__).toEqual({
      message: 'supabase rejected [redacted-email]',
      nested: { mail: '[redacted-email]' },
    });
    expect(event.extra?.list).toEqual(['[redacted-email]', 42]);
  });

  it('kürzt Prosa in extra NICHT am Fragezeichen (kein URL-Schnitt)', () => {
    const event = scrubEventPii({ extra: { note: 'Warum? Ursache unklar' } });
    expect(event.extra?.note).toBe('Warum? Ursache unklar');
  });

  it('scrubbt URL-artige extra-Werte weiterhin inklusive Query', () => {
    const event = scrubEventPii({ extra: { url: '/session?partner=abc&x=1' } });
    expect(event.extra?.url).toBe('/session');
  });

  it('behandelt Referer-Header case-insensitiv', () => {
    const event = scrubEventPii({
      request: { headers: { referer: 'https://x.org/reg?invite=TOK' } },
    });
    expect(event.request?.headers?.referer).toBe('https://x.org/reg');
  });

  it('scrubbt SDK-/eigene Kontexte (contexts) defensiv mit', () => {
    const event = scrubEventPii({
      contexts: {
        react: { componentStack: 'at HomeView (http://localhost:5173/App.tsx?secret=1)' },
        custom: { note: 'mail an a@b.de' },
      },
    });
    expect(event.contexts?.react).toEqual({
      componentStack: 'at HomeView (http://localhost:5173/App.tsx',
    });
    expect(event.contexts?.custom).toEqual({ note: 'mail an [redacted-email]' });
  });

  it('scrubbt die Top-Level-Message', () => {
    const event = scrubEventPii({ message: 'XHR failed for dev@test.io' });
    expect(event.message).toBe('XHR failed for [redacted-email]');
  });

  it('entfernt sensible URL-Teile aus event.request (httpcontext schreibt location.href)', () => {
    const event = scrubEventPii({
      request: {
        url: 'https://dyadenpraxis.de/reset-password?token_hash=ONE-SHOT-SECRET',
        query_string: 'token_hash=ONE-SHOT-SECRET',
        headers: { Referer: 'https://dyadenpraxis.de/register?invite=TOKEN' },
      },
    });
    expect(event.request?.url).toBe('https://dyadenpraxis.de/reset-password');
    expect(event.request?.query_string).toBe('[redacted]');
    expect(event.request?.headers?.Referer).toBe('https://dyadenpraxis.de/register');
  });

  it('scrubbt String-Werte in extra (inkl. __serialized__-Nester)', () => {
    const event = scrubEventPii({
      extra: { detail: 'Kontakt zu a@b.de', url: '/x?invite=TOK', count: 3 },
    });
    expect(event.extra?.detail).toBe('Kontakt zu [redacted-email]');
    expect(event.extra?.url).toBe('/x');
    expect(event.extra?.count).toBe(3);
  });

  it('lässt Events ohne sensible Felder strukturell unverändert', () => {
    const input = { extra: { foo: 'bar' }, breadcrumbs: [{ data: { url: '/session' } }] };
    expect(scrubEventPii(input)).toEqual(input);
  });
});

describe('syncSentryUser', () => {
  it('delegiert nur die anonyme UUID an Sentry.setUser', () => {
    syncSentryUser({ id: 'abc-123' });
    expect(Sentry.setUser).toHaveBeenCalledWith({ id: 'abc-123' });
  });

  it('räumt den Kontext mit null', () => {
    syncSentryUser(null);
    expect(Sentry.setUser).toHaveBeenCalledWith(null);
  });
});
