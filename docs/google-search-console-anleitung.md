# Google Search Console — Schritt für Schritt

Diese Anleitung führt durch die einmalige Einrichtung der Google Search Console (GSC) für `dyadenpraxis.de`, die Einreichung der Sitemap und die manuelle Indexierungsanforderung der wichtigsten URLs.

**Gesamtaufwand:** ~25–30 min (Setup + Sitemap + 8 URL-Inspektionen).
**Voraussetzungen:** ein Google-Konto und Zugang zur Cloudflare-DNS-Verwaltung.

---

## A. Property einrichten (einmalig, ~5 min)

1. https://search.google.com/search-console öffnen, mit einem Google-Konto einloggen.
2. Links oben Drop-down → „Property hinzufügen".
3. **Domain-Property** wählen (nicht „URL-Präfix"). Vorteil: erfasst `www` + Apex + `http` + `https` automatisch.
4. `dyadenpraxis.de` eintragen (ohne `https://`, ohne `www`) → „Weiter".
5. Google zeigt einen DNS-TXT-Eintrag, etwa `google-site-verification=xxxxxxxxxxxxxxxxx`.
6. Im Cloudflare-Dashboard → Domain `dyadenpraxis.de` → **DNS → Records → „Add record"**:
   - Type: **TXT**
   - Name: `@` (steht für Apex)
   - Content: der vollständige Wert aus GSC (inkl. `google-site-verification=` Prefix)
   - Proxy status: **DNS only** (graue Wolke, nicht orange)
   - TTL: `Auto`
   - „Save".
7. Zurück zu GSC → „Verifizieren" klicken. DNS-Propagation dauert in der Regel 1–10 min; bei Fehlschlag ein paar Minuten warten und erneut probieren.
8. Bei Erfolg ist die Property in GSC verfügbar.

## B. Sitemap einreichen (einmalig, ~2 min)

1. Linke Sidebar → **Sitemaps**.
2. „Neue Sitemap hinzufügen" → in das Eingabefeld `sitemap.xml` eintragen (nur der Pfad — Google ergänzt die Domain automatisch).
3. „Senden" klicken.
4. Status nach wenigen Sekunden: **„Erfolgreich"** mit „8 URLs erkannt".

Falls der Status „Konnte nicht abgerufen werden" zeigt:

```bash
curl -I https://www.dyadenpraxis.de/sitemap.xml
```

Erwartet: `HTTP/2 200` und `content-type: application/xml; charset=utf-8`.

## C. URL-Inspektion und Indexierung anfordern (einmalig pro URL, je ~30 s)

Für jede der folgenden URLs einzeln vorgehen:

```
https://www.dyadenpraxis.de/
https://www.dyadenpraxis.de/dyaden-meditation
https://www.dyadenpraxis.de/tools
https://www.dyadenpraxis.de/tools/dyaden-fragen-generator
https://www.dyadenpraxis.de/tools/check-in-fragen-paare
https://www.dyadenpraxis.de/tools/konflikt-reflexion
https://www.dyadenpraxis.de/impressum
https://www.dyadenpraxis.de/datenschutz
```

Pro URL:

1. Die URL in das Inspektionsfeld oben in GSC eintragen → Enter.
2. Google zeigt zunächst entweder „URL ist im Google Index" oder „URL ist nicht im Google Index". Bei brandneuen URLs ist letzteres normal.
3. Knopf **„Live-URL testen"** klicken. Google rendert die Seite in Echtzeit. Wichtig im Ergebnis:
   - **„Seite ist für Google verfügbar"** muss erscheinen.
   - Im Tab **„Gerendertes HTML"** das Markup inspizieren — die statischen Inhalte (H1, Lead-Absatz, FAQ-Sektion) müssen sichtbar sein. Bei der App-Wurzel `/` reicht es, wenn Title und JSON-LD enthalten sind.
   - **Screenshot-Tab** zeigt, wie Google die Seite sieht.
4. Wenn der Live-Test grün ist: Knopf **„Indexierung anfordern"** klicken. Google nimmt den Auftrag in seine Crawl-Queue.
5. Bestätigungsmeldung abwarten ("URL wurde zur priorisierten Crawl-Warteschlange hinzugefügt") und zur nächsten URL.

Tatsächliche Indexierung passiert typischerweise nach 1–7 Tagen — nicht sofort. Nach 7 Tagen erneut prüfen, ob „URL ist im Google Index" steht.

## D. Performance-Bericht beobachten (täglich oder wöchentlich)

1. Linke Sidebar → **Leistung → Suchergebnisse**.
2. Zeitraum oben rechts: „Letzte 28 Tage" (Default).
3. Vier Hauptmetriken oben:
   - **Impressionen** — wie oft eine deiner URLs in Suchergebnissen angezeigt wurde
   - **Klicks** — wie oft jemand drauf geklickt hat
   - **Durchschnittliche CTR** — Klicks ÷ Impressionen
   - **Durchschnittliche Position** — wo deine Treffer im Schnitt rangieren
4. Tabs unten: **„Suchanfragen"** (welche Begriffe), **„Seiten"** (welche URLs), **„Länder"**, **„Geräte"**.

Erste Impressionen sollten nach 3–10 Tagen erscheinen, sofern Schritt C erfolgreich war.

## E. Häufige Probleme und Lösungen

| Symptom | Ursache | Lösung |
|---|---|---|
| „URL ist nicht im Google Index" trotz Anforderung | Brandneue URL, Google braucht 1–7 Tage | Geduld; nach 7 Tagen erneut prüfen |
| Live-Test zeigt nur die SPA-Shell statt statischem Inhalt | Vercel-Rewrite hat nicht gefeuert | `curl -A "Googlebot" https://www.dyadenpraxis.de/<pfad>` lokal testen — wenn die SPA-Shell zurückkommt, vercel.json prüfen |
| Sitemap-Status „Konnte nicht abgerufen werden" | Falscher Content-Type, 404 oder Redirect | `curl -I https://www.dyadenpraxis.de/sitemap.xml` muss `200` + `application/xml` liefern |
| „Soft 404" auf einer URL | Google hält die Seite für inhaltsarm | Inhalt prüfen, ggf. FAQ-Sektion ausbauen |
| DNS-Verifikation schlägt fehl | TXT-Record noch nicht propagiert oder unter `www.` statt `@` eingetragen | 10 min warten; sicherstellen, dass Host `@` ist und Proxy `DNS only` |
| Indexierungsanforderung gibt Fehler „Vorübergehend nicht verfügbar" | Rate Limit von Google (selten) | 30 min warten, dann erneut |

## F. Bing Webmaster Tools (optional, ~5 min)

Bing erfasst auch Microsoft Copilot und einen Teil der Search-Indexierung, die Google nicht erreicht.

1. https://www.bing.com/webmasters → mit einem Microsoft-Konto einloggen.
2. „Add a site" → `https://www.dyadenpraxis.de` eintragen.
3. Verifikation: GSC-Token-Import wählen (einfachster Weg, wenn GSC schon verifiziert ist).
4. Linke Sidebar → **Sitemaps** → `https://www.dyadenpraxis.de/sitemap.xml` einreichen.

## G. Schema-Markup gezielt testen (optional, ~10 min)

Rich Results Test prüft, ob Google die JSON-LD-Daten korrekt versteht.

1. https://search.google.com/test/rich-results öffnen.
2. Folgende URLs einzeln testen:
   - `https://www.dyadenpraxis.de/dyaden-meditation` → erwartet: Erkennung von `Article`, `HowTo`, `FAQPage`
   - `https://www.dyadenpraxis.de/tools/dyaden-fragen-generator` → erwartet: `FAQPage`, `BreadcrumbList`
   - `https://www.dyadenpraxis.de/tools/check-in-fragen-paare` → erwartet: `FAQPage`, `BreadcrumbList`
   - `https://www.dyadenpraxis.de/tools/konflikt-reflexion` → erwartet: `HowTo`, `FAQPage`, `BreadcrumbList`
   - `https://www.dyadenpraxis.de/` → erwartet: `Organization`, `WebSite`
3. Bei Fehlern oder Warnungen: die JSON-LD-Blöcke in den jeweiligen `public/*.html` Dateien prüfen.

## H. Was erwartet wird, in welchem Zeitfenster

| Zeitraum | Erwartetes Signal |
|---|---|
| Sofort nach Submit | Sitemap-Status „Erfolgreich", Live-Tests grün |
| 1–7 Tage | „URL ist im Google Index" für die 8 angefragten URLs |
| 3–10 Tage | Erste Impressionen im Performance-Bericht |
| 2–4 Wochen | Erste Klicks für Long-Tail-Suchen wie „Dyade-Meditation", „Dyaden Fragen Generator", „Check-in Fragen Paare" |
| 4–8 Wochen | Stabile Position für die Marken-Phrase „Dyadenpraxis" (Position 1–3 für die genaue Domain, Position 10–30 für generische Treffer wie „Dyade Meditation online") |

---

**Bei Bedarf:** sobald die ersten Impressionen da sind, kann der nächste Audit-Pass nutzen, welche konkreten Suchanfragen wirklich Traffic bringen — und die Inhalte gezielt für diese Anfragen schärfen. Das ist Phase 5-Material.
