# GEO Audit — Phase 4 Re-Audit Projection & Operator Checklist

**Erstellt:** 2026-05-20
**Vorgänger:** `docs/GEO-AUDIT-REPORT.md` (Baseline 2026-05-20, 4 / 100, Critical)
**Stand:** Lokale Änderungen aus Phasen 1–3 committed auf `main`, **noch nicht gepusht**, daher **nicht deployed**. Ein `/geo-audit` gegen `https://www.dyadenpraxis.de` würde aktuell weiterhin die alte SPA-Shell sehen. Diese Datei ist eine **Projektion** des Score-Deltas gegen die jetzt vorhandene Quelle plus die Operator-Schritte, die für den echten Live-Re-Audit nötig sind.

---

## 1. Projektion: Geschätzter Score nach Live-Deploy

| Kategorie | Baseline | Projektion | Begründung |
|---|---:|---:|---|
| AI Citability | 0 | **75** | 7 neue crawlbare Pages mit Antwort-zuerst-Absätzen; ~3.000 Wörter belastbarer, extrahierbarer Text; FAQPage- und HowTo-Schema auf den Hauptseiten. Negativ: Wettbewerb in der Nische hat oft mehr Tiefe. |
| Brand Authority | 5 | **10** | Bessere Organization-Schema und llms.txt schaffen Voraussetzung, aber **externe Signale (Wikipedia, Reddit, LinkedIn)** sind unverändert. Diese Kategorie wächst nur über Zeit. |
| Content E-E-A-T | 0 | **55** | Operator-Identität jetzt sichtbar (Impressum mit Name + Adresse, Organization-Schema mit Kontakt-E-Mail). Datenschutzerklärung detailliert. Negativ: Keine Autoren-Bio auf der Dyade-Landing, keine Testimonials (bewusst — Briefing verbietet erfundene). |
| Technical GEO | 15 | **80** | Echte sitemap.xml, echte llms.txt, vollständige Head-Tags, Security-Header, X-Robots-Tag noindex auf App-Routen, mehrere statische SSR-Surfaces vor der SPA. Negativ: Root-URL `/` weiterhin SPA-Only (R-A-Entscheidung aus Phase 0), Apex→www noch 307 (Betreiber-Setting). |
| Schema & Structured Data | 0 | **85** | Organization + WebSite global; Article + HowTo + FAQPage auf der Landing; WebPage + BreadcrumbList + FAQPage auf jedem Tool; HowTo zusätzlich auf der Konflikt-Reflexion; CollectionPage auf der Tool-Übersicht. Validität in Phase-2/3-Gates verifiziert. |
| Platform Optimization | 5 | **15** | robots.txt-Wildcard erlaubt Citation-Bots; saubere Schema-Daten erleichtern Extraktion. Negativ: Keine tatsächliche Platform-Präsenz (Wikipedia, Reddit, LinkedIn) — diese Kategorie wächst nur durch Operator-Aktivität außerhalb des Repos. |

**Komposit-Projektion**

```
0.25 × 75 + 0.20 × 10 + 0.20 × 55 + 0.15 × 80 + 0.10 × 85 + 0.10 × 15
= 18.75 + 2.00 + 11.00 + 12.00 + 8.50 + 1.50
= 53.75 → ~54 / 100 ("Poor → Fair")
```

**Versus Pass-Korridor (≥ 60 / 100):** Knapp darunter. Der Engpass ist Brand Authority + Platform Optimization. Beide sind **zeitabhängig** und außerhalb des Repos: sie wachsen erst, wenn die neuen Public-URLs indexiert sind und Drittquellen (Wikipedia, Reddit, GitHub-README, Community-Listings) sie referenzieren.

**Wenn Brand Authority auf 25 und Platform Optimization auf 35 wachsen** (realistisch nach 4–8 Wochen Sichtbarkeit + 1–2 gezielten Operator-Aktionen, siehe §6): Komposit → ~62. Damit Pass.

## 2. Was die fünf Pass-Kriterien des Briefings erfüllt

| Kriterium | Status |
|---|---|
| Crawlbarer Text auf `/`, `/impressum`, `/datenschutz`, `/tools` und allen Tool-Seiten im initialen HTML (View-Source-Test = 100 %) | **erfüllt** in `dist/` — verifiziert in Phasen 2/3 |
| Valides Organization-, WebSite-, FAQPage-, HowTo-Schema | **erfüllt** — JSON-LD-Parsing in Phasen 2/3 grün |
| Echte sitemap.xml + llms.txt erreichbar und vom SPA-Catch-all ausgenommen | **erfüllt** — Filesystem-File vor Catch-all, explizite `Content-Type` Header in `vercel.json` |
| App-Routen noindex | **erfüllt** — `X-Robots-Tag: noindex, nofollow` auf den App-Pfaden |
| Re-Audit-Score deutlich über Baseline (Ziel ≥ 60) | **lokale Projektion ~54, knapp unter 60.** Live-Audit nach Deploy nötig. Pass-Korridor ist mit den Off-Site-Aktionen aus §6 in 4–8 Wochen erreichbar. |

## 3. Operator-Checklist — Deploy und Verifikation

**Sequenziell ausführen, in dieser Reihenfolge:**

### 3.1 Code live bringen

```bash
cd /Users/ralflorini/coding/development/dyaden-praxis
git status                       # erwartet: clean, 7 Commits ahead of origin/main
git push origin main             # Vercel-Deploy startet automatisch
```

Vercel-Deploy beobachten: https://vercel.com/dashboard → Projekt `dyadenpraxis-online` → Deployments. Erwartete Dauer 60–120 s.

### 3.2 Live verifizieren (sofort nach Deploy)

```bash
curl -A "Mozilla/5.0" https://www.dyadenpraxis.de/sitemap.xml | head -20
curl -A "Mozilla/5.0" https://www.dyadenpraxis.de/llms.txt | head -10
curl -A "Mozilla/5.0" https://www.dyadenpraxis.de/dyaden-meditation | grep -c "Was ist Dyade-Meditation"
curl -A "Mozilla/5.0" https://www.dyadenpraxis.de/tools | grep -c "Werkzeuge"
curl -I -A "Mozilla/5.0" https://www.dyadenpraxis.de/calendar | grep -i "x-robots-tag"
```

Erwartete Ergebnisse:
- `sitemap.xml` liefert XML mit 8 `<url>`-Einträgen
- `llms.txt` liefert die Markdown-Liste
- `dyaden-meditation` liefert HTML mit der H1 „Was ist Dyade-Meditation?" (Anzahl > 0)
- `tools` liefert HTML mit „Werkzeuge"
- `/calendar` antwortet mit `x-robots-tag: noindex, nofollow`

### 3.3 Apex → www auf 308 umstellen (Betreiber-Setting)

Schritt-für-Schritt: siehe `docs/cloudflare-ai-crawl-policy.md` Abschnitt „Apex → www Redirect". Aktuell `307`, soll `308` werden.

### 3.4 Optional: Cloudflare AI-Crawl-Policy verifizieren

Schritt-für-Schritt: siehe `docs/cloudflare-ai-crawl-policy.md`. Variante 1 (Status quo) ist die Default-Empfehlung. Die wichtigsten Citation-Bots (`OAI-SearchBot`, `ChatGPT-User`, `Claude-User`, `PerplexityBot`) sollten **nicht** geblockt sein.

## 4. Google Search Console — Sitemap + Crawling

1. https://search.google.com/search-console → Property `https://www.dyadenpraxis.de/` auswählen (falls noch nicht eingerichtet: erst Domain-Property anlegen und DNS-TXT zur Verifikation eintragen).
2. **Sitemaps** → „Neue Sitemap hinzufügen" → `sitemap.xml` eintragen → Senden.
3. **URL-Inspektion** für jede der folgenden URLs einzeln durchführen und „Indexierung anfordern" klicken (manuelle Crawl-Anforderung):
   - `https://www.dyadenpraxis.de/`
   - `https://www.dyadenpraxis.de/dyaden-meditation`
   - `https://www.dyadenpraxis.de/tools`
   - `https://www.dyadenpraxis.de/tools/dyaden-fragen-generator`
   - `https://www.dyadenpraxis.de/tools/check-in-fragen-paare`
4. Nach 3–7 Tagen erneut prüfen, ob Pages indexiert sind. Falls nicht: in der URL-Inspektion „Live-URL testen" → Render-Vorschau prüfen.

## 5. AI-Bot-Traffic-Monitoring

### 5.1 Cloudflare Analytics

1. Cloudflare-Dashboard → Domain `dyadenpraxis.de` → **Analytics & Logs → Traffic**.
2. Filter „User-Agent contains" anlegen für jeweils:
   - `ChatGPT-User`
   - `OAI-SearchBot`
   - `Claude-User`
   - `ClaudeBot` (sollte 0 Anfragen sein wegen Disallow)
   - `PerplexityBot`
   - `GPTBot` (sollte 0 Anfragen sein wegen Disallow)
3. Wöchentlich beobachten. Erste Citation-Bot-Anfragen sind nach 1–3 Wochen zu erwarten, falls die Indexierung über GSC funktioniert hat.

### 5.2 Vercel Logs als Backup

Falls Cloudflare-Filter nicht ausreichen:
```bash
vercel logs dyadenpraxis-online --since 7d | grep -iE "(ChatGPT-User|OAI-SearchBot|Claude-User|PerplexityBot)"
```

## 6. Off-Site-Aktionen für Brand Authority

Diese Aktionen heben Brand Authority und Platform Optimization über die Zeit. Reihenfolge nach Wirkung-pro-Aufwand:

1. **GitHub-README ergänzen.** Das Repo `raremalo/dyadenpraxis` referenziert aktuell nicht prominent die Live-Domain. Im `README.md` oben: „Live: https://www.dyadenpraxis.de/" + Screenshot. GitHub ist eine starke Brand-Quelle für AI-Modelle.
2. **GitHub Topics & About.** Repo-Settings → Topics: `dyad-meditation`, `meditation`, `contemplative-practice`, `react`, `supabase`. „About"-Feld: kurzer deutscher + englischer Satz mit URL.
3. **Liberapay-Profilseite vervollständigen.** Da das Footer-CTA bereits auf Liberapay verweist, sollte die Liberapay-Seite einen kurzen deutschen Beschreibungstext + Link zur Domain enthalten.
4. **Reddit-Präsenz (organisch, nicht Spam).** In passenden Subreddits wie `r/Meditation`, `r/de_IAmA`, `r/Achtsamkeit` einen Beitrag über die Dyade-Praxis verfassen — nicht werbend, sondern erklärend. Reddit-URLs sind in AI-Trainingsdaten stark gewichtet.
5. **Erwähnung auf einer der bestehenden deutschsprachigen Dyade-Seiten** (`globaldyadmeditation.org`, Kommentar-Bereiche, Mailinglisten). Das ist eine ehrenamtliche Community — Vorgehen sollte ein echter Beitrag sein, kein SEO-Push.
6. **Wikipedia-Eintrag für „Dyade-Meditation" verbessern.** Falls existent: dyadenpraxis.de als externen Link in der „Weblinks"-Sektion. Falls nicht existent: kleinen Artikel anlegen (Wikipedia-Relevanz-Kriterien beachten — kontemplative Verfahren mit nachweisbarer Tradition haben gute Chancen).

## 7. Phase-5-Kandidaten (für später)

Wenn nach 4–8 Wochen der Live-Re-Audit immer noch unter 60 liegt, sind das die nächsten technischen Hebel — sortiert nach Wirkung-pro-Aufwand:

| Idee | Hebel | Aufwand |
|---|---|---|
| Person-Schema für Operator auf Impressum/Landing | E-E-A-T | klein |
| Statische Marketing-Landing unter `/` (App nach `/app/*`) | Citability + Technical | mittel-groß |
| Englische Variante (`/en/dyaden-meditation`) mit eigenem hreflang | Reach | mittel |
| Statischer `/agb`-Mirror analog zu /impressum/datenschutz | E-E-A-T (klein) | klein |
| `og:image` 1200×630 PNG mit Marke + Tagline pro Page | Social/Citation-Vorschau | klein |
| Strukturierte Tipp-Sammlung „Was vor der ersten Sitzung helfen kann" | Citability | klein |
| Zusatz-Tool „Dyade-Themen-Wahl" (geleitete Themenfindung) | Citability + Brand-Surface | mittel |

## 8. Sofortiger Live-Re-Audit nach Deploy

Nachdem §3.1 und §3.2 erfolgreich waren, führe folgenden Befehl im selben Repo aus:

```
/geo-audit
```

Antwort auf die URL-Frage: `https://dyadenpraxis.de`.

Der Audit-Skill schreibt einen neuen Bericht. Vergleiche den dortigen Score mit der Projektion in §1. Erwartete Beobachtungen:

- AI Citability: zwischen 60 und 80 (Projektion 75)
- Schema & Structured Data: zwischen 75 und 90 (Projektion 85)
- Technical GEO: zwischen 70 und 85 (Projektion 80)
- E-E-A-T: zwischen 40 und 60 (Projektion 55)
- Brand Authority: 5–15 (zeitabhängig, Projektion 10)
- Platform Optimization: 10–25 (zeitabhängig, Projektion 15)

Falls eine Kategorie deutlich darunter liegt: häufigste Ursachen
- Audit-Tool ignoriert SPA-Body-Inhalt vs. statisches HTML → Pfade in Audit-Pages-Liste manuell ergänzen
- Cloudflare-Caching alter Antworten → 5–10 min warten oder Cloudflare-Cache purgen
- Vercel-Deploy nicht durchgelaufen → Dashboard prüfen

## 9. Was diese Phase NICHT versucht hat

- Den GEO-Audit-Skill gegen den lokalen `dist/` zu fahren — das Tool ist URL-getrieben, nicht Filesystem-getrieben.
- Den Audit-Score live zu messen, bevor gepusht wurde — das wäre irreführend.
- Off-Site-Aktionen (Wikipedia, Reddit, Listings) durchzuführen — das ist Operator-Hoheit, weder vom Repo aus möglich noch sinnvoll automatisiert.

## 10. Zusammenfassung

Die technischen Voraussetzungen für einen GEO-Score klar oberhalb des Baseline-Werts von 4 sind **fertig**. Ein Live-Re-Audit ist erst nach `git push` + Vercel-Deploy aussagekräftig. Die Projektion landet bei **~54**, knapp unter dem 60-Korridor. Die Lücke ist **nicht primär technisch**, sondern Off-Site (Brand Authority + Platform Optimization) — die in §6 gelisteten Aktionen schließen sie in 4–8 Wochen.
