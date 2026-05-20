# GEO Audit Report: Dyadenpraxis Online

**Audit Date:** 2026-05-20
**URL:** https://dyadenpraxis.de (redirects to https://www.dyadenpraxis.de)
**Business Type:** Hybrid — Web application (free OSS dyad meditation practice tool) on a brand domain; not a content/marketing site today
**Pages Analyzed:** 11 paths probed (homepage + 10 candidate routes). All non-asset paths return an identical 4,002-byte SPA shell.
**Audit Method:** HTTP probing with browser UA (WebFetch is blocked by Cloudflare), direct read of repo sources, web search for brand mentions.

---

## Executive Summary

**Overall GEO Score: 4/100 (Critical)**

The site is effectively invisible to AI systems for two independent reasons, either of which alone would be sufficient. First, **all major AI crawlers are explicitly Disallowed** in the Cloudflare-managed robots.txt (Content-Signal: `ai-train=no`). Second, even if crawlers were allowed, **the site is a client-rendered Vite/React SPA with no SSR or prerendering** — the served HTML contains only `<title>Dyadenpraxis Online</title>` and an empty `<div id="root">`. There is no meta description, no Open Graph, no JSON-LD schema, no H1, no body copy, no llms.txt, and no real sitemap.xml (the SPA catch-all in `dyadenpraxis-online/vercel.json` returns the shell for every path, including `/sitemap.xml` and `/llms.txt`). A web search for "Dyadenpraxis" / "dyadenpraxis.de" surfaced unrelated competing providers (globaldyadmeditation.org, Susanne Heil, Annett Zupke, Empathikon) but did not surface this domain — brand authority signals are at zero.

**Before acting on this report you need to make a strategic decision:** is the goal of dyadenpraxis.de to be a private practice tool (in which case the current AI-hostile posture is consistent and the only fixes worth making are technical SEO basics on the legal pages and a small public landing zone), or is the goal also to attract new practitioners and be cited by AI assistants when people ask about "Dyad-Meditation online" (in which case the architecture and the crawler policy both need to change). The recommendations below split along that fork.

### Score Breakdown

| Category | Score | Weight | Weighted Score |
|---|---|---|---|
| AI Citability | 0/100 | 25% | 0.00 |
| Brand Authority | 5/100 | 20% | 1.00 |
| Content E-E-A-T | 0/100 | 20% | 0.00 |
| Technical GEO | 15/100 | 15% | 2.25 |
| Schema & Structured Data | 0/100 | 10% | 0.00 |
| Platform Optimization | 5/100 | 10% | 0.50 |
| **Overall GEO Score** | | | **4/100** |

---

## Critical Issues (Fix Immediately or Decide Not To)

**C1. All major AI crawlers blocked in robots.txt.** Cloudflare's managed robots.txt explicitly Disallows ClaudeBot, GPTBot, Google-Extended, Applebot-Extended, Amazonbot, Bytespider, CCBot, meta-externalagent, and CloudflareBrowserRenderingCrawler, with a global `Content-Signal: search=yes, ai-train=no`. PerplexityBot, Claude-Web/anthropic-ai, and cohere-ai are not named individually but are bound by the wildcard `ai-train=no` signal. AI assistants cannot ingest the site for grounding or citation. → **Decision required**: keep the privacy-respecting default, or opt in to AI access for some/all crawlers via the Cloudflare dashboard.

**C2. No server-rendered content anywhere.** Served HTML is a 4,002-byte SPA shell (`dyadenpraxis-online/index.html`). Even crawlers that ignore robots.txt or that are explicitly allowed would see no text. The `vercel.json` rewrite `"/(.*)" → "/index.html"` applies to every URL, so `/datenschutz`, `/impressum`, `/about`, `/calendar`, `/sessions`, etc. all return the same empty shell. → Fix requires SSR/prerendering or a static marketing surface (see Recommendations).

**C3. `/sitemap.xml` and `/llms.txt` do not exist.** Both URLs return HTTP 200 but with the SPA HTML body (because of the catch-all rewrite). Search and AI tools that probe these paths get a misleading 200 followed by no usable structure. → Add real `public/sitemap.xml` and `public/llms.txt` files, and exclude them from the SPA rewrite.

**C4. No structured data of any kind.** Zero JSON-LD, zero Microdata. Missing minimum: Organization, WebSite, and (if applicable) Service/HowTo for the practice itself.

**C5. No meta description, no Open Graph, no Twitter Card, no canonical, no hreflang.** The `<head>` contains only `<title>Dyadenpraxis Online</title>`, viewport, charset, font preconnect, and inline theme CSS. Social link previews and AI-generated snippets have nothing to use.

---

## High Priority Issues

**H1. Brand domain absent from generic-term search.** WebSearch for `"Dyadenpraxis" OR "dyadenpraxis.de" dyad meditation online` returned ten results — none of them this site. The term "Dyadenpraxis" is a German common noun used by many providers; the domain owns the .de but has no SEO/GEO presence on the term it occupies.

**H2. Legal pages (Impressum, Datenschutz) are not crawlable.** German law requires these to be reachable; their content (operator name, address, contact email kontakt@dyadenpraxis.de) is also a key E-E-A-T signal. Today they are rendered client-side only and invisible to any non-JS crawler. → Either prerender these two pages, or at minimum mirror the legal content into a static HTML fallback at `/impressum` and `/datenschutz`.

**H3. No `llms.txt` file (and no plan to add one).** llms.txt is the emerging AI-native standard for "here's the site map and what each page is about". Missing it removes the cheapest possible GEO win.

**H4. No author/operator identity in the served HTML.** Site title is generic; no Organization schema; no Person schema; no visible "betrieben von …". E-E-A-T cannot be assessed by an AI model from the HTML alone.

**H5. Title tag is brand-only and uninformative.** "Dyadenpraxis Online" tells neither humans nor LLMs what the page is. A descriptive title (e.g. "Dyadenpraxis Online – Dyade-Meditation zu zweit per Video") would carry intent in 60 chars.

---

## Medium Priority Issues

**M1. No favicon-set / web app manifest exposed beyond `favicon.ico`.** No `manifest.json` linked; reduces "real site" trust signals for some heuristic crawlers.

**M2. No `<meta name="robots">` directive on the page.** Defaults to index,follow, which is fine for search, but absence of any explicit policy makes the file's intent ambiguous next to the AI-hostile robots.txt.

**M3. apex domain redirects to www via HTTP 307, not 301.** 307 is non-cacheable and not treated as a permanent canonical signal by indexers.

**M4. No `dist/` precaching of legal/landing pages.** Vite SPA build produces a single `index.html` — even a static prerender of /impressum, /datenschutz, and a future /ueber-uns would close most of the indexability gap with zero infra change.

**M5. CSP / `referrer-policy` / `permissions-policy` not detected.** Not strictly a GEO blocker, but their absence reduces the trust signals some AI infrastructure scoring uses.

**M6. `sw.js` (4.5 KB service worker) is served but not referenced from `index.html`.** Verify it is still wanted; an orphaned service worker can confuse crawlers and caches.

---

## Low Priority Issues

**L1. Fonts loaded from Google Fonts at runtime** (preconnect to fonts.googleapis.com/gstatic.com). Minor performance / privacy nit; not GEO-relevant on its own.

**L2. `react` and `lucide-react` loaded from esm.sh in addition to local vendor bundles.** Duplicative loading pattern that can affect TTI; will not affect GEO ranking but does affect Core Web Vitals if a real landing page is added.

**L3. No `<html lang="de-DE">`.** Currently `lang="de"` only. German is correctly declared; the regional refinement is a polish-only improvement.

**L4. No structured navigation in HTML.** The nav menu only exists after React mounts. Even the static menu items from the recent commit `feat(layout): … Liberapay donate button to nav` are invisible to no-JS crawlers.

---

## Category Deep Dives

### AI Citability (0/100)
There is literally no extractable text on any URL. AI systems that fetch the page (and aren't blocked) see only the page title. There is no FAQ, no "What is dyad meditation?" passage, no instructional content, no quotable practice description. Citability requires content; the site has none server-rendered. Recommendation: introduce a small static content layer (a landing page, an "Was ist Dyade-Meditation?" page, an FAQ) that is prerendered, not part of the SPA. Even 800–1,200 words of structured, quotable copy would move this score from 0 toward 50.

### Brand Authority (5/100)
Domain exists, is on Vercel, has HTTPS and HSTS — that's all the search signal there is. No Wikipedia entry, no Reddit threads, no LinkedIn company page referencing the domain, no YouTube channel surfaced. Competing providers (globaldyadmeditation.org, sushigong.de, annett-zupke.de, simoneanliker.com, empathikon.de) dominate the SERP for "Dyad-Meditation" and "Dyadenpraxis". Recommendation: decide whether the project wants brand mentions at all; if yes, the cheapest first step is a GitHub README that lists the live URL (you already maintain the OSS repo), and a one-pager About/Impressum that ties the operator's name to the domain so AI systems can build the entity.

### Content E-E-A-T (0/100)
Nothing the model can read about who runs the site, what qualifies them, where they are based, what the practice involves, how it is structured, or what users have experienced. The Impressum/Datenschutz pages presumably contain this — but they are JS-rendered. Recommendation (privacy-respecting variant): static-prerender just Impressum and Datenschutz so the operator name, address, contact, and legal basis are visible to any HTTP client.

### Technical GEO (15/100)
Positives: Vercel + Cloudflare, x-vercel-cache HIT on the homepage (cached at edge), HTTP/2 + HTTP/3 (alt-svc h3), HSTS with 2-year max-age, valid TLS, fast TTFB. Negatives: pure CSR with no prerender, blanket SPA rewrite, no real sitemap, no llms.txt, no canonical, no robots meta, 307 (temp) apex→www redirect. The infra is excellent; the content surface is empty.

### Schema & Structured Data (0/100)
No JSON-LD anywhere in the HTML. Minimum starting kit: `Organization` (name, url, sameAs to GitHub repo, contactPoint with `kontakt@dyadenpraxis.de`), `WebSite` (with optional `potentialAction` SearchAction if you add search), and for the practice itself a `HowTo` describing the dyad cycle (question, listen, switch, integrate). If you add a public practice landing page, an `FAQPage` covers the most common AI-quotable format.

### Platform Optimization (5/100)
No presence detected on Google AI Overviews, ChatGPT, Perplexity, Gemini, or Bing Copilot for the brand term. No platform-specific signals (no Wikipedia, no public Reddit thread, no LinkedIn page) for entity recognition. Open Graph and Twitter Cards absent, so any social share of the URL renders as bare text. The GitHub repo is the only third-party surface — it does not currently link the live domain in a way that AI systems can easily traverse.

---

## Quick Wins (Implement This Week)

1. **Add a real `public/sitemap.xml` and `public/llms.txt` in `dyadenpraxis-online/public/`** and exclude both from the SPA rewrite by adding explicit Vercel rewrite rules above the catch-all (e.g., `{ "source": "/sitemap.xml", "destination": "/sitemap.xml" }`, same for llms.txt and robots.txt if you start serving your own). Even a 30-line llms.txt is the highest-ROI GEO change for this site.
2. **Set a real `<meta name="description">` and Open Graph block in `dyadenpraxis-online/index.html`.** This is a one-commit change that improves every share and every snippet.
3. **Add `Organization` and `WebSite` JSON-LD to `index.html`.** ~20 lines. Visible to every crawler the moment it's deployed.
4. **Decide on the AI-train policy and document it.** Either keep `ai-train=no` (and add a one-paragraph note in the README explaining the choice as a deliberate policy) or flip the Cloudflare AI Crawl Control settings to allow specific bots (ClaudeBot, PerplexityBot, GPTBot) and re-test the robots.txt.
5. **Switch the apex→www redirect from 307 to 308 (or move www→apex; pick one canonical and 301/308).** One Vercel/Cloudflare setting change.

## 30-Day Action Plan

### Week 1: Decide the strategic posture
- [ ] Owner decision: is the site a tool-only product, a brand-presence product, or both? Document the decision in `docs/`.
- [ ] If "tool only", scope GEO work to the minimum: legal pages crawlable, basic meta, structured data on Organization, and keep the AI crawler block.
- [ ] If "also brand-presence", commit to building a small static landing surface (see Week 2) and to revisiting the Cloudflare AI crawler policy.

### Week 2: Make the HTML head actually useful
- [ ] Add `<meta name="description">`, OG tags, Twitter card, canonical, and `<link rel="alternate" hreflang="de-DE">` to `index.html`.
- [ ] Add `Organization` + `WebSite` JSON-LD with operator name, contact email, and sameAs links to the GitHub repo (and any of operator's professional profiles you're comfortable disclosing).
- [ ] Replace the 307 apex→www redirect with a permanent canonical.

### Week 3: Make a small static surface
- [ ] Prerender or hand-author static HTML for `/impressum` and `/datenschutz` (the simplest path: ship them as `dyadenpraxis-online/public/impressum.html` and `public/datenschutz.html` and add Vercel rewrites that route those specific paths to the static files before the SPA catch-all). This single move solves H2, gives an E-E-A-T baseline, and is genuinely required for German legal compliance regardless of GEO.
- [ ] Add `dyadenpraxis-online/public/llms.txt` describing site purpose and listing the routable pages.
- [ ] Add `dyadenpraxis-online/public/sitemap.xml` listing the static pages (homepage, impressum, datenschutz, future landing).

### Week 4: Decide on a content layer
- [ ] If "also brand-presence": author a single "Was ist Dyade-Meditation?" landing page (800–1,200 words, in German, with H1/H2 structure, an FAQ section, and HowTo schema describing the dyad cycle). Ship it as static HTML or pre-rendered.
- [ ] Add `FAQPage` and `HowTo` JSON-LD on that page.
- [ ] Re-run this audit (`/oh-my-claudecode:` skill or `/geo-audit`) and compare the score delta.

---

## Decision Points the Audit Cannot Resolve

1. **AI-train policy.** The current Cloudflare default explicitly blocks training-use ingestion. If the operator's intent is privacy-first (which is consistent with a practice tool whose users discuss personal contemplative content), this should stay. If the intent is also discoverability, it must change. The audit will not assume.
2. **Public landing surface.** Today the homepage IS the app. A public marketing/landing page would be a product decision (does the operator want strangers landing on a marketing page before signing up?).
3. **Operator disclosure.** The legal pages need a real name and address (German Impressum requirement). How prominently the operator wants to be associated with the domain on the *crawlable surface* is a separate decision from legal compliance.

---

## Appendix: Pages Analyzed

| URL | HTTP | Content-Type | Bytes | Notes |
|---|---|---|---|---|
| `/` | 200 (after 307→www) | text/html | 4002 | SPA shell |
| `/datenschutz` | 200 | text/html | 4002 | SPA shell (identical) |
| `/impressum` | 200 | text/html | 4002 | SPA shell (identical) |
| `/about` | 200 | text/html | 4002 | SPA shell (route may not exist) |
| `/ueber-uns` | 200 | text/html | 4002 | SPA shell (route may not exist) |
| `/faq` | 200 | text/html | 4002 | SPA shell |
| `/kontakt` | 200 | text/html | 4002 | SPA shell |
| `/calendar` | 200 | text/html | 4002 | SPA shell (app route) |
| `/sessions` | 200 | text/html | 4002 | SPA shell (app route) |
| `/robots.txt` | 200 | text/plain | 1738 | Real file, Cloudflare-managed, blocks all major AI bots |
| `/sitemap.xml` | 200 | text/html | 4002 | **Misleading 200 — SPA shell, not a real sitemap** |
| `/llms.txt` | 200 | text/html | 4002 | **Misleading 200 — SPA shell, not a real llms.txt** |
| `/llms-full.txt` | 200 | text/html | 4002 | **Misleading 200 — SPA shell** |

Server stack confirmed via response headers: `server: cloudflare`, `x-vercel-id: fra1::…`, `x-vercel-cache: HIT`, `strict-transport-security: max-age=63072000`, HTTP/2 + HTTP/3.
