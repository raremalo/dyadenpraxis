# Cloudflare AI Crawl Policy — Empfohlene Konfiguration

Stand: 2026-05-20. Hintergrund: Audit-Findings C1 / H1 / H3 aus `GEO-AUDIT-REPORT.md`.

## Ziel

Öffentliche Fläche (Startseite, kommende Landing, Tools, Impressum, Datenschutz) für **Search- und On-Demand-Citation-Bots** zugänglich machen, **Training-Bots** weiter aussperren, **App-Routen mit Nutzerinhalten** weiterhin schützen.

## Aktueller Stand (von Cloudflare verwaltet)

Die `https://www.dyadenpraxis.de/robots.txt` ist Cloudflare-managed und enthält:

- Wildcard: `Content-Signal: search=yes, ai-train=no` + `Allow: /`
- Disallow für: `Amazonbot`, `Applebot-Extended`, `Bytespider`, `CCBot`, `ClaudeBot`, `CloudflareBrowserRenderingCrawler`, `Google-Extended`, `GPTBot`, `meta-externalagent`

Das ist eine bewusst privacy-respektierende Default-Konfiguration und entspricht der Betreiber-Entscheidung: keine Trainings-Nutzung.

## Was die aktuelle Policy NICHT regelt

| Bot | Zweck | Status in aktueller robots.txt |
|---|---|---|
| `OAI-SearchBot` | Indexiert für ChatGPT-Search / SearchGPT-Antworten (Citation, kein Training) | Nicht namentlich blockiert → fällt unter Wildcard (Allow `/`, `ai-train=no`). |
| `ChatGPT-User` | On-Demand-Fetch, wenn ein ChatGPT-Nutzer aktiv eine URL aufruft | Nicht blockiert. Wichtig: das ist KEIN Crawler im klassischen Sinn, sondern ein User-Agent für User-Aktion. |
| `Claude-User` | On-Demand-Fetch von Anthropic, ähnlich `ChatGPT-User` | Nicht blockiert. |
| `PerplexityBot` | Crawlt für Perplexity-Antwort-Engine | Nicht blockiert. |
| `Googlebot` | Klassische Web-Search | Erlaubt (Wildcard). |
| `Bingbot` | Klassische Web-Search + Microsoft Copilot | Erlaubt (Wildcard). |

**Schlussfolgerung:** Die aktuelle Cloudflare-Default-Konfiguration **lässt die wichtigsten Citation-/Search-Bots bereits durch**. Die Blockade trifft ausschließlich die expliziten Trainings-Bots — was zur Privacy-First-Linie passt.

## Empfehlung

### Variante 1 — Status quo lassen (empfohlen, wenn Trainings-Ausschluss gewünscht)

Keine Änderung an der Cloudflare-AI-Crawl-Policy. Folgende Bots bleiben blockiert: ClaudeBot, GPTBot, Google-Extended, Applebot-Extended, Bytespider, CCBot, Amazonbot, meta-externalagent.

**Wirkung:** Inhalte können zitiert werden (OAI-SearchBot, PerplexityBot, ChatGPT-User, Claude-User crawlen), wandern aber nicht ins Trainingsdataset von OpenAI/Anthropic/Google/Apple/Amazon/Meta.

### Variante 2 — Auch Trainings-Bots erlauben

Nur wenn der Betreiber bewusst entscheidet, dass die öffentlichen Inhalte (Startseite, Landing, Tools) auch in Trainings-Datasets landen dürfen. Empfehlung: nur für die explizit öffentlichen Pfade, nicht site-weit.

## Klick-Anleitung (Cloudflare-Dashboard)

1. https://dash.cloudflare.com/ → Domain `dyadenpraxis.de` auswählen.
2. Linke Sidebar: **Security → Bots → AI Crawl Control** (Pfad kann je nach Cloudflare-UI-Version leicht abweichen).
3. **„Block AI Crawlers"-Toggle**:
   - **Variante 1 (Empfohlen):** Toggle **An** lassen. Liste der blockierten Bots prüfen — entspricht Status quo.
   - **Variante 2:** Toggle **Aus**, dann manuell nur die training-only Bots (ClaudeBot, GPTBot, Google-Extended, Applebot-Extended) in der „Custom Block List" eintragen.
4. **„Allow trusted AI bots for citations"-Liste** prüfen (UI-Bezeichnung ggf. abweichend). Sicherstellen, dass folgende Bots **nicht** blockiert sind:
   - `OAI-SearchBot`
   - `ChatGPT-User`
   - `Claude-User`
   - `PerplexityBot`
   - `Googlebot`
   - `Bingbot`
5. **Speichern.** Robots.txt wird Cloudflare-seitig automatisch aktualisiert; Verifikation:
   ```
   curl -A "Mozilla/5.0" https://www.dyadenpraxis.de/robots.txt
   ```

## Was App-Routen-Schutz angeht

Die App-Routen (`/calendar`, `/session*`, `/connect`, `/profile`, `/groups`, `/partner-finder`, `/instructions`, `/reset-password`) sind in `dyadenpraxis-online/vercel.json` mit `X-Robots-Tag: noindex, nofollow` belegt. Das wirkt unabhängig von der Cloudflare-Policy: Selbst wenn ein erlaubter Crawler die URL fetcht, signalisiert der Header „nicht indexieren / keinen PageRank weitergeben".

**Mehrschichtige Verteidigung:**
- Cloudflare AI Crawl Control → blockt Trainings-Bots vollständig.
- robots.txt-Wildcard → `ai-train=no` als rechtlicher Vorbehalt (EU Directive 2019/790).
- `X-Robots-Tag: noindex` auf App-Routen → schließt private Routen von der Indexierung aus, selbst wenn ein Bot durchkommt.
- Auth-Wall → tatsächliche Nutzerinhalte erst nach Login sichtbar.

## Verifikation nach Konfigurationsänderung

```bash
curl -A "Mozilla/5.0" https://www.dyadenpraxis.de/robots.txt
curl -I -A "OAI-SearchBot" https://www.dyadenpraxis.de/
curl -I -A "PerplexityBot" https://www.dyadenpraxis.de/
curl -I -A "Mozilla/5.0" https://www.dyadenpraxis.de/calendar
```

Erwartete Response-Header auf `/calendar`:
```
X-Robots-Tag: noindex, nofollow
```

## Apex → www Redirect

Aktuell: `307` (temporär). Empfehlung: `308` (permanent) oder `301` (permanent) für korrektes Canonical-Signal an Crawler.

**Klick-Anleitung Vercel:**
1. Vercel-Dashboard → Projekt `dyadenpraxis-online` → Settings → Domains.
2. `dyadenpraxis.de` markieren → „Redirect to" `www.dyadenpraxis.de` → Status-Code **308** (permanent) wählen.
3. Speichern und mit `curl -I https://dyadenpraxis.de/` verifizieren — erwartet: `HTTP/2 308`.
