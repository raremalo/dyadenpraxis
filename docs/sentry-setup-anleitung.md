# Sentry-Setup – Schritt-für-Schritt (Runbook)

> Nichts hier ist Code-Arbeit. Der Code ist fertig und wartet nur auf die
> DSNs (Blueprint portiert aus em-connect). Schritte der Reihe nach abarbeiten.

## Was haben wir? (Plattform-Auswahl)

|Teil der App|Technik|Sentry-Platform bei Projekterstellung|
|---|---|---|
|Frontend (Browser)|**React 19** — NICHT Vue|**React**|
|Backend (`/api/*` auf Vercel)|Node.js-Serverless-Functions|**Node.js**|

## Reicht der Free-Account (Developer-Plan)?

**Ja.** Projekte sind unbegrenzt — beide (React + Node.js) kosten nichts.

- **5.000 Fehler/Monat org-weit** (beide Projekte teilen das Kontingent):
  reicht. Aufgebraucht → Sentry stoppt die Annahme bis Monatswechsel.
- **1 Nutzer**: sobald jemand anders ins Dashboard soll, wird's kostenpflichtig.
- **Tracing**: 5 Mio. Spans/Monat — unser Sampling (0.2) ist darauf ausgelegt.
- **Retention: fix 30 Tage** — DSGVO-okay, nichts umzustellen.

## Muss ich Free-Plan-Features (Logs/Replay/Tracing/Metrics) anlegen?

**Nein.** Alle Opt-in; der Code entscheidet bereits:

|Feature|Status|Warum|
|---|---|---|
|Tracing|✅ aktiv|Läuft mit der DSN, kein Dashboard-Schritt nötig|
|Session Replay|❌ absichtlich aus|App verarbeitet sensible Session-Inhalte — Replay wäre datenschutzrechtlich inakzeptabel. Auch im Dashboard NICHT aktivieren|
|Logs|❌ nicht verdrahtet|`console.*` wird bewusst nicht verschickt (PII-Risiko); Server-Logs deckt Vercel ab|

## Schritt 0 — Bestandscheck (30 Sekunden)

1. sentry.io → links unten **Settings** (Zahnrad)
2. **Projects** → gibt es schon Projekte für dyadenpraxis?
   - **Ja** → DSN notieren (Schritt 2), nur Schritt 3–5 machen
   - **Nein** → komplett ab Schritt 1

## Schritt 1 — Projekte anlegen

1. **Settings → Projects → Create Project**
2. Plattform: erstes Projekt **React**, zweites **Node.js**
3. Namen: `dyadenpraxis-online` (React) und `dyadenpraxis-api` (Node.js)
4. Team auswählen → **Create Project**
5. Setup-Dialog mit Code **komplett ignorieren** — unser Code ist fertig,
   wir brauchen nur die DSN.

## Schritt 2 — DSN rauskopieren (pro Projekt)

1. **Settings → Projects → [Projektname] → Client Keys (DSN)**
2. URL kopieren — sieht so aus:
   `https://o1234567.ingest.de.sentry.io/7654321`

**Prüfpunkt Region:** In der DSN muss `ingest.de.sentry.io` stehen (EU).
Steht dort `ingest.us.sentry.io` → Projekt in US-Region angelegt → löschen,
neu anlegen, Organisation in **EU (Frankfurt)** erstellen. Unsere CSP
(`vercel.json`) blockt alles außer EU still.

## Schritt 3 — DSNs in Vercel eintragen

Vercel → Projekt `dyadenpraxis-online` → **Settings → Environment Variables**:

|Name|Value|Environments|
|---|---|---|
|`VITE_SENTRY_DSN`|DSN des **React**-Projekts|Production (+ optional Preview)|
|`SENTRY_DSN`|DSN des **Node.js**-Projekts|Production (+ optional Preview)|

Regeln:
- `SENTRY_DSN` **ohne** `VITE_`-Präfix (sonst landet der Backend-Schlüssel
  im Browser-Bundle).
- Danach **einmal neu deployen** — Env-Variablen wirken erst mit dem
  nächsten Build. Release-Tags sind dann automatisch der Commit-SHA
  (`VERCEL_GIT_COMMIT_SHA` via vite define / api-Release).

## Schritt 4 — Projekte absichern (pro Projekt, 2 Minuten)

In **Settings → Projects → [Projekt]**:

|Was|Wo|Einstellung|
|---|---|---|
|Allowed Domains|**General Settings**|React-Projekt: `dyadenpraxis.de`, `www.dyadenpraxis.de` (+ optional `*.vercel.app` für Previews). API-Projekt: leer lassen|

|IP-Adressen nicht speichern|**General Settings** → „Prevent Storing of IP Addresses"|Häkchen setzen (DSGVO)|
|Data Scrubbing|**Data Scrubbing**|Aktivieren — zweite Verteidigungslinie hinter unserem Code-Scrubbing|
|Alerts|Sidebar **Alerts → Create Alert**|„New issue"-Regel auf beide Projekte, E-Mail an dich|

**CSP optional verschärfen:** `vercel.json` erlaubt aktuell
`https://*.ingest.de.sentry.io` (Sentrys EU-Ingest-Namespace, DSN-unabhängig).
Nach dem Anlegen der DSN kannst du auf den exakten Host deiner Organisation
verschärfen — in der DSN steht er: `https://o1234567.ingest.de.sentry.io/…`
→ `connect-src` um `https://o1234567.ingest.de.sentry.io` ersetzen.

## Schritt 5 — Funktions-Check (nach dem Deploy)

1. `https://www.dyadenpraxis.de` öffnen
2. Browser-Konsole (F12):
   ```js
   setTimeout(() => { throw new Error('Sentry-Setup-Test') }, 0)
   ```
3. Sentry-Dashboard → React-Projekt → **Issues**: binnen ~30 s muss
   „Sentry-Setup-Test" auftauchen, Release = Commit-SHA, Environment
   `production`.
4. Nichts angekommen → Region prüfen (Schritt 2), Allowed Domains (Schritt 4),
  CSP-Header im Deploy (Browser-Konsole: blockierte `ingest.de.sentry.io`-
  Requests).

Die API (`dyadenpraxis-api`) meldet echte Fehler (Gemini-, Supabase-,
Daily-Ausfälle) von selbst. Wer nicht warten will: `GEMINI_API_KEY` in Vercel
kurz auf einen Ungültig-Wert setzen, einmal „Neue Frage generieren" klicken,
zurücksetzen — der Fallback-Pfad feuert dann ein Warning-Event.

## Checkliste

- [ ] React-Projekt `dyadenpraxis-online` existiert, DSN kopiert
- [ ] Node.js-Projekt `dyadenpraxis-api` existiert, DSN kopiert
- [ ] Beide DSNs enthalten `ingest.de.sentry.io` (EU!)
- [ ] `VITE_SENTRY_DSN` in Vercel = React-DSN
- [ ] `SENTRY_DSN` in Vercel = Node-DSN (ohne VITE_-Präfix)
- [ ] Redeploy ausgelöst
- [ ] Allowed Domains gesetzt, IP-Speicherung aus, Scrubbing an
- [ ] Test-Fehler ist im Dashboard angekommen
- [ ] Alert-Regel aktiv

## Was NICHT hierher gehört

- Code/Scrubbing/Release-Tags: fertig — siehe `lib/sentry.ts`,
  `api/_sentry.ts`, `index.tsx` (alle in `dyadenpraxis-online/`)
- Source-Map-Upload (lesbare Stacktraces): Follow-up, braucht später einen
  `SENTRY_AUTH_TOKEN` + Build-Schritt
