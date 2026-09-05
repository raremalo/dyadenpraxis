import * as Sentry from '@sentry/react';
import type { Breadcrumb, Event } from '@sentry/react';

// Zentrale Sentry-Glue-Funktionen (Client). Alle Sentry-Methoden sind
// No-Ops, wenn Sentry.init nicht gelaufen ist (kein VITE_SENTRY_DSN gesetzt).
//
// PII-Strategie (DSGVO), portiert aus em-connect (src/lib/sentry.ts):
// E-Mails in Texten werden ersetzt; URLs verlieren Query + Fragment
// KOMPLETT (token_hash, access_token, refresh_token, invite, redirect,
// apikey — eine Parameter-Whitelist wäre fehleranfälliger als der Verlust
// an Debug-Infos). Der Routen-Pfad reicht zur Diagnose.
//
// Grenzen (dokumentiert): free-text PII wie Namen oder Telefonnummern in
// Messages werden NICHT erkannt — ein Name-Regex wäre falsch-positiv-laut.
// Deshalb: Console-Breadcrumbs aus (s. index.tsx), Komponenten-Props werden
// nicht attacht. contexts/tags werden nicht geschrubbt — wir setzen selbst
// keine.
//
// Terminologie: setUser({id}) ist PSEUDONYMISierung (stabile UUID ist über
// die DB einer Person zuordenbar), nicht Anonymisierung.

// E-Mails inkl. Umlaut-/IDN-Domains; %40-kodierte Varianten (Query-Strings,
// GoTrue-Meldungen) in einem zweiten Pass — auch %-kodierte IDN-Domains.
// Achtung: `-` maskiert, sonst bildet `+-\u…` eine Range, die Umlaute
// ausschließt.
const EMAIL_RE = /[A-Za-z0-9._%+\-\u00C0-\u024F]+@[A-Za-z0-9.\-\u00C0-\u024F]+\.[A-Za-z\u00C0-\u024F]{2,}/g;
const EMAIL_PCT_RE = /[A-Za-z0-9._%+\-]+%40[A-Za-z0-9.\-%]+\.[A-Za-z%]{2,}/g;

export const scrubEmails = (text: string): string =>
  text.replace(EMAIL_PCT_RE, '[redacted-email]').replace(EMAIL_RE, '[redacted-email]');

// Entfernt Query + Fragment — alles dahinter ist potenziell sensibel
// (Recovery-Token in /reset-password, Session-IDs in /session).
export const scrubUrl = (url: string): string => url.split(/[?#]/)[0] ?? url;

// Rekursive extra-Bereinigung mit Tiefenbegrenzung (Zyklen/Deep-Shapes):
// Objects und Arrays vollständig durchlaufen — SDK-Serialisierungen landen
// verschachtelt hier. Strings nur dann als URL scrubben, wenn sie URL-artig
// sind (beginnend mit '/', 'http(s)://' oder enthaltend '://') — Prosa mit
// '?' ("Warum? Weil …") darf nicht abgeschnitten werden.
const MAX_SCRUB_DEPTH = 4;

export const scrubValue = (value: unknown, depth = 0): unknown => {
  if (typeof value === 'string') {
    const urlLike =
      value.startsWith('/') || /^https?:\/\//i.test(value) || value.includes('://');
    return urlLike ? scrubUrl(scrubEmails(value)) : scrubEmails(value);
  }
  if (depth >= MAX_SCRUB_DEPTH) return value;
  if (Array.isArray(value)) {
    return value.map((item) => scrubValue(item, depth + 1));
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = scrubValue(v, depth + 1);
    }
    return out;
  }
  return value;
};

// Breadcrumbs: message scrubben; ui.*-Kategorien tragen Attributwerte
// (aria-label="Nachricht an Anna M.") in eckigen Klammern — weg damit.
// data.url/to/from sind die Navigations-/Fetch-URLs inkl. Query — scrubben.
export const scrubBreadcrumb = (crumb: Breadcrumb): Breadcrumb => {
  if (crumb.message) {
    crumb.message = scrubEmails(crumb.message);
    if (crumb.category?.startsWith('ui.')) {
      crumb.message = crumb.message.replace(/\s*\[[^\]]*\]/g, '');
    }
  }
  if (crumb.data) {
    for (const [key, value] of Object.entries(crumb.data)) {
      if (typeof value === 'string') {
        crumb.data[key] =
          key === 'url' || key === 'to' || key === 'from'
            ? scrubUrl(scrubEmails(value))
            : scrubEmails(value);
      }
    }
  }
  return crumb;
};

// beforeSend/beforeSendTransaction-Filter: scrubbt E-Mails aus Messages,
// Exceptions, extra (rekursiv) und Breadcrumbs; URLs aus dem Request-Kontext.
// Die httpcontext-Integration schreibt die VOLLSTÄNDIGE location.href in
// event.request.url (Query + Fragment, läuft VOR beforeSend) — Recovery-/
// Invite-Tokens dürfen da nie ankommen.
// Generisch, damit Sentrys beforeSend-Typ (ErrorEvent) erhalten bleibt.
export const scrubEventPii = <T extends Event>(event: T): T => {
  if (event.message) {
    event.message = scrubEmails(event.message);
  }
  for (const ex of event.exception?.values ?? []) {
    if (ex.value) ex.value = scrubEmails(ex.value);
  }
  if (event.extra) {
    for (const [key, value] of Object.entries(event.extra)) {
      event.extra[key] = scrubValue(value);
    }
  }
  // SDK-Auto-Kontexte (device/os/culture) und eigene (react.componentStack)
  // defensiv mitscrubben — String-Pass verändert Struktur nicht, entfernt
  // aber E-Mails/URL-Query-Fragmente, falls doch Nutzungsdaten landen.
  if (event.contexts) {
    for (const [key, value] of Object.entries(event.contexts)) {
      event.contexts[key] = scrubValue(value) as typeof value;
    }
  }
  if (event.request) {
    if (event.request.url) event.request.url = scrubUrl(event.request.url);
    if (event.request.query_string) event.request.query_string = '[redacted]';
    if (event.request.headers) {
      // Header-Namen case-insensitiv behandeln (SDK schreibt 'Referer',
      // aber nicht darauf verlassen)
      for (const [name, value] of Object.entries(event.request.headers)) {
        if (name.toLowerCase() === 'referer' && typeof value === 'string') {
          event.request.headers[name] = scrubUrl(value);
        }
      }
    }
  }
  for (const crumb of event.breadcrumbs ?? []) {
    scrubBreadcrumb(crumb);
  }
  return event;
};

// Pseudonymer User-Kontext: NUR die Supabase-UUID — kein Username, keine
// E-Mail. Macht Fehler einzelner Sessions zuordenbar (pseudonym, s.o.),
// ohne direkt personenbezogene Daten zu übermitteln. null räumt den Kontext
// (Logout / Account-Löschung).
export const syncSentryUser = (user: { id: string } | null): void => {
  Sentry.setUser(user ? { id: user.id } : null);
};
