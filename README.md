# Dyaden Praxis

Online-Anwendung fuer Dyaden-Meditation und kontemplative Zwiegespraeche. Die App ermoeglicht strukturierte, zeitgesteuerte Sitzungen zu zweit mit Echtzeit-Video, KI-generierten Gespraechsimpulsen und Benutzerkonten.

## Features

- **Video-Gespraeche**: Echtzeit-Videoanrufe zwischen zwei Teilnehmern via Daily.co (WebRTC)
- **KI-generierte Fragen**: Kontext-sensitive Dyaden-Impulse ueber Google Gemini, waehlbar nach Kategorie
- **Statische Fragenbibliothek**: Fallback auf kuratierte Fragen ohne KI-Anfrage
- **Kategorien**: Thematische Filterung der Gespraechsimpulse
- **Sitzungs-Timer**: Zeitsteuerung mit Glocken-Signalen fuer Sprecher- und Zuhoerer-Wechsel
- **Partner-Verbindung**: Einladungslinks und Echtzeit-Praesenz fuer Session-Partner
- **Gruppen und Kalender**: Gemeinsame Uebungsgruppen und Terminplanung
- **Benutzerprofil**: Authentifizierung, Einstellungen und Accountverwaltung
- **Push-Benachrichtigungen**: Web-Push fuer Sitzungseinladungen
- **Dark Mode / Theme**: Anpassbares Erscheinungsbild

## Tech-Stack

| Bereich | Technologie |
|---------|-------------|
| Frontend | React 19, TypeScript 5.8, Vite 6 |
| Styling | Tailwind CSS 4 |
| Routing | React Router 7 |
| State / Fetching | TanStack React Query 5 |
| Authentifizierung | Supabase Auth |
| Datenbank | Supabase (PostgreSQL + Realtime) |
| Video | Daily.co (`@daily-co/daily-js`, `@daily-co/daily-react`) |
| KI-Impulse | Google Gemini (`@google/genai`) |
| API-Routen | Vercel Serverless Functions |
| Deployment | Vercel |
| Tests | Vitest, Testing Library |

## Voraussetzungen

- Node.js 20 oder neuer
- npm 10 oder neuer
- Supabase-Projekt (kostenloser Tier ausreichend)
- Daily.co Account (kostenloser Tier ausreichend)
- Google Gemini API-Schluessel
- Vercel-Account (fuer Deployment und serverlose API-Routen)

## Installation

```bash
cd dyadenpraxis-online
npm install
```

Konfigurationsdatei `.env.local` im Verzeichnis `dyadenpraxis-online/` anlegen (siehe Abschnitt Umgebungsvariablen) und dann:

```bash
npm run dev
```

Die App ist dann unter `http://localhost:5173` erreichbar.

### Build

```bash
npm run build
npm run preview
```

### Tests

```bash
npm test
```

## Umgebungsvariablen

Datei `dyadenpraxis-online/.env.local` anlegen und folgende Variablen setzen:

```env
# Supabase (Frontend)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# Web Push (Frontend + API)
VITE_VAPID_PUBLIC_KEY=

# Supabase Service Role (nur API-Routen, nie im Frontend verwenden)
SUPABASE_SERVICE_ROLE_KEY=

# Daily.co (nur API-Routen)
DAILY_API_KEY=

# Google Gemini (nur API-Routen)
GEMINI_API_KEY=

# Web Push VAPID (nur API-Routen)
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=
```

Die mit `VITE_` praefixierten Variablen werden vom Vite-Build-System in den Browser-Bundle eingebettet. Alle anderen Variablen werden ausschliesslich in den Vercel Serverless Functions (`api/`) verwendet und verlassen den Server nicht.

## Projektstruktur

```
dyaden-praxis/
├── dyadenpraxis-online/     # Hauptanwendung (Vite + React SPA)
│   ├── api/                 # Vercel Serverless Functions
│   ├── components/          # React-Komponenten
│   ├── contexts/            # React Contexts (Auth, Session, Settings)
│   ├── hooks/               # Custom Hooks
│   ├── lib/                 # Supabase-Client und Hilfsfunktionen
│   ├── services/            # Externe Dienste (Gemini)
│   └── data/                # Statische Fragenbibliothek
├── migrations/              # SQL-Migrationen fuer Supabase
├── docs/                    # Architekturdokumentation
├── sound/                   # Audio-Assets (Meditationsglocken)
└── supabase/                # Supabase-Projektkonfiguration
```

## Lizenz

Dieses Projekt steht unter der [GNU Affero General Public License v3.0](LICENSE).
