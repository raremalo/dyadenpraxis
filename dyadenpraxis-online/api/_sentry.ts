// Type-only-Import: wird zur Compile-Zeit entfernt und lädt @sentry/node NICHT
// zur Laufzeit (das erledigt die dynamische Import-Exception unten).
import type * as SentryNodeModule from '@sentry/node';

// DSN-gated: ohne SENTRY_DSN bleibt alles No-Op — lokale Tests und Deployments
// ohne Konfiguration sind unberührt. Der @sentry/node-Import ist BEWUSST
// dynamisch: das Paket lädt ~250 Module (~0,7s Cold-Start) und ohne DSN zahlen
// sonst alle Handler den Preis, obwohl nie gesendet wird.
//
// Kein OTel-Auto-Instrumentation-Bedarf: Wir wollen Fehler-Sichtbarkeit
// (Gemini-, Daily.co-, Supabase-Ausfälle), keine Performance-Traces. Deshalb
// registerEsmLoaderHooks:false — die Loader-Hooks brauchen --import, das auf
// Vercel-Functions nicht zur Verfügung steht.
//
// Achtung Serverless: Die Function friert nach dem Response ein. Ein Event,
// das nicht VOR dem Response-Ende geflusht ist, geht verloren. Deshalb flusht
// reportError selbst (gleiches Pattern wie die offiziellen AWS/GCP-Wrapper).
//
// Ausnahme: opts.flushMs = 0 für non-fatal Pfade, deren Response nicht auf
// Sentry warten darf — dort ist das Event Best-Effort (Vercel-Logs behalten
// die console.warn-Zeile).

type SentryNode = typeof SentryNodeModule;

let sentryModule: SentryNode | null = null;
// initialized wird VOR Sentry.init gesetzt (Loop-Schutz): wirft init, bleibt
// Reporting für diese warme Instanz deaktiviert — bewusst, sonst würde ein
// transienter init-Fehler bei jedem Request einen erneuten Versuch starten.
let initialized = false;

async function getSentry(): Promise<SentryNode | null> {
  if (!process.env.SENTRY_DSN) return null
  // DYNAMIC-IMPORT-EXCEPTION: Der Pfad ist literar, aber ein statischer
  // Import lädt ~250 Module/~0,7s in JEDEM Cold-Start beider Handler — auch
  // ohne konfiguriertes Sentry. Hier ist die Laufzeit-Entscheidung (DSN
  // gesetzt?) der eigentliche Punkt.
  if (!sentryModule) {
    sentryModule = await import('@sentry/node')
  }
  if (!initialized) {
    initialized = true
    sentryModule.init({
      dsn: process.env.SENTRY_DSN,
      // Environment/Release: Vercel injiziert VERCEL_ENV/VERCEL_GIT_COMMIT_SHA
      environment: process.env.SENTRY_ENVIRONMENT ?? process.env.VERCEL_ENV ?? 'local',
      // Commit-SHA als Release — Deploy-Korrelation ohne Build-Schritt
      release: `dyadenpraxis-api@${process.env.GIT_COMMIT_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA ?? 'dev'}`,
      registerEsmLoaderHooks: false,
      tracesSampleRate: 0,
      // PII-Scrubbing AUCH serverseitig: Exception-Messages können E-Mails
      // tragen (GoTrue-/Supabase-Fehler). Kompakte Variante der Client-Regexes
      // (lib/sentry.ts) — api/ importiert bewusst nicht über die
      // Verzeichnisgrenze. Unsere extras sind flache Kontexte (Handler,
      // Statuscodes) — String-Pass genügt dort.
      beforeSend: (event) => {
        const scrub = (text: string) =>
          text.replace(
            /[A-Za-z0-9._%+\-\u00C0-\u024F]+@[A-Za-z0-9.\-\u00C0-\u024F]+\.[A-Za-z\u00C0-\u024F]{2,}/g,
            '[redacted-email]',
          )
        if (event.message) event.message = scrub(event.message)
        for (const ex of event.exception?.values ?? []) {
          if (ex.value) ex.value = scrub(ex.value)
        }
        if (event.extra) {
          for (const [key, value] of Object.entries(event.extra)) {
            if (typeof value === 'string') {
              event.extra[key] = scrub(value)
            }
          }
        }
        return event
      },
      // Console-Integration ENTFERNT: unsere console.error-Zeilen enthalten
      // Supabase-Antwortkörper (E-Mails, UUIDs). Die Default-Integration
      // würde genau diese Argumente als Breadcrumbs an die Events hängen,
      // die wir zwei Zeilen später senden.
      integrations: (defaults) => defaults.filter((i) => i.name !== 'Console'),
      // Der Default-Isolation-Scope überlebt warme Container und sammelt
      // fremde Requests — Breadcrumbs von Nutzer A könnten am Event von
      // Nutzer B hängen. Komplett aus.
      maxBreadcrumbs: 0,
    })
  }
  return sentryModule
}

export const sentryEnabled = (): boolean => !!process.env.SENTRY_DSN

/**
 * Meldet einen Fehler an Sentry und flusht standardmäßig synchron (max. 2s).
 * Kontexte nur mit nicht-sensiblen Daten anreichern (Statuscodes, Komponenten-
 * namen — niemals E-Mails, IPs oder Nutzereingaben).
 *
 * opts.level: Sentry-Severity (default 'error'); 'warning' für non-fatal.
 * opts.flushMs: 0 = nicht auf Flush warten (Best-Effort, non-fatal Pfade).
 */
export async function reportError(
  error: unknown,
  context?: Record<string, unknown>,
  opts?: { level?: 'info' | 'warning' | 'error'; flushMs?: number },
): Promise<void> {
  const Sentry = await getSentry()
  if (!Sentry) return
  // withIsolationScope: frischer Scope pro Aufruf — keine Scope-Reste
  // anderer Requests in warmen Containern.
  await Sentry.withIsolationScope(async () => {
    Sentry.captureException(error, {
      ...(opts?.level ? { level: opts.level } : {}),
      ...(context ? { extra: context } : {}),
    })
    const flushMs = opts?.flushMs ?? 2000
    if (flushMs > 0) {
      await Sentry.flush(flushMs)
    }
  })
}
