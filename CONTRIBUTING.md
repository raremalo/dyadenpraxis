# Beitragen zu Dyaden Praxis

Vielen Dank fuer dein Interesse an Dyaden Praxis! Dieses Dokument beschreibt, wie du zum Projekt beitragen kannst.

## Erste Schritte

1. Forke das Repository
2. Erstelle einen Feature-Branch (`git checkout -b feature/mein-feature`)
3. Richte die Entwicklungsumgebung ein (siehe [README.md](README.md))

## Entwicklungsumgebung

```bash
cd dyadenpraxis-online
npm install
cp .env.example .env.local  # Eigene API-Keys eintragen
npm run dev
```

## Code-Standards

- **TypeScript**: Strikter Modus, keine `any`-Types
- **Komponenten**: PascalCase, Entity im Namen (z.B. `SessionTimer`, nicht `Timer`)
- **Hooks**: `use[Entity][Action]` (z.B. `useVideoCall`, `useSession`)
- **Commit-Format**: `<type>(<scope>): <Beschreibung>`
  - Types: `feat`, `fix`, `refactor`, `chore`, `docs`
- **Sprache**: Alle User-facing Texte auf Deutsch

## Quality Gates

Vor jedem Commit muessen alle Checks bestehen:

```bash
cd dyadenpraxis-online
npx tsc --noEmit       # TypeScript fehlerfrei
npx vite build         # Build erfolgreich
npx vitest run         # Tests bestehen
```

## Pull Requests

1. Beschreibe klar, was dein PR aendert und warum
2. Stelle sicher, dass alle Quality Gates bestehen
3. Ein PR pro logische Aenderung
4. Aktualisiere die Dokumentation bei Bedarf

## Issues

- Nutze die GitHub Issue Templates
- Beschreibe Bugs mit Schritten zur Reproduktion
- Feature-Vorschlaege mit Kontext und Motivation

## Lizenz

Mit deinem Beitrag stimmst du zu, dass dieser unter der [AGPL-3.0 Lizenz](LICENSE) veroeffentlicht wird.
