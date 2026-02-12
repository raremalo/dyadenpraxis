Die Links sind gültig und führen genau zu den Ressourcen, die Dan im Video verwendet; du kannst damit sein Selbst‑Validierungs-Prinzip 1:1 in deinem eigenen Projekt nachbauen, indem du Claude‑Code‑Hooks mit kleinen Validator‑Skripten kombinierst.

Links kurz verifiziert und eingeordnet

Auf Basis der Seitendaten und einer Websuche passen die Links exakt zu dem, was Dan im Video beschreibt:

Agentic Finance Review Codebase
https://github.com/disler/agentic-finance-review (https://github.com/disler/agentic-finance-review)
Das ist das Beispiel‑Repo aus dem Video (inkl. ‎⁠.claude/commands/review-finances.md⁠ etc.). ​⁠https://github.com/disler/agentic-finance-review

Tactical Agentic Coding (Kurs)
https://agenticengineer.com/tactical-agentic-coding (https://agenticengineer.com/tactical-agentic-coding) – Landingpage für Dans Kurs, erklärt die Taktiken, „Core Four“ usw. ​⁠https://agenticengineer.com/tactical-agentic-coding

Code‑Snippets zum Video
https://gist.github.com/disler/d9f1285892b9faf573a0699aad70658f (https://gist.github.com/disler/d9f1285892b9faf573a0699aad70658f) – Gist mit den fertigen Snippets aus dem Video (u.a. CSV‑Validator / Hook‑Beispiele, wie im Description‑Text verlinkt).

Claude Code Hooks
https://code.claude.com/docs/en/hooks (https://code.claude.com/docs/en/hooks) – offizielle Referenz zu allen Hook‑Events (PreToolUse, PostToolUse, Stop usw.). ​⁠https://code.claude.com/docs/en/hooks

Subagent Hooks
https://code.claude.com/docs/en/sub-agents#define-hooks-for-subagents (https://code.claude.com/docs/en/sub-agents#define-hooks-for-subagents) – Doku, wie du Hooks direkt an Subagents hängst (z.B. Finance‑Subagent mit eigenen Checks). ​⁠https://code.claude.com/docs/en/hooks

Skill Hooks
https://code.claude.com/docs/en/skills#define-hooks-for-skills (https://code.claude.com/docs/en/skills#define-hooks-for-skills) – wie du Hooks in Skills‑Frontmatter definierst (lokalisierte, wiederverwendbare Validierung). ​⁠https://code.claude.com/docs/de/hooks

Custom Slash Command Hooks
https://code.claude.com/docs/en/slash-commands#define-hooks-for-commands (https://code.claude.com/docs/en/slash-commands#define-hooks-for-commands) – genau das, was er im Video mit ‎⁠/review finances⁠ und dem CSV‑Edit‑Command zeigt.

Alle Domains (github.com, agenticengineer.com, code.claude.com, gist.github.com) sind konsistent mit der Beschreibung im Video und liefern den erwarteten Inhalt.

Wie du das Prinzip konkret in deinem Coding‑Projekt einsetzt

Ich formuliere das so, dass es für dein typisches Setup (Node/TypeScript, Claude Code, Agenten‑Orchestrierung) direkt passt. Die Idee: ein Agent macht die Arbeit, ein Hook ruft dein Validator‑Script auf und erzwingt Qualität.

Schritt 1: Einen klaren, spezialisierten Use‑Case wählen

Wähle für dein Projekt genau eine Sache, die sich gut validieren lässt, z.B.:

CSV‑Export deiner App (Buchungen, Sessions, Kunden etc.)

JSON‑Konfigurationen für deine App / AI‑Skills

oder z.B. Migrations‑Skripte (SQL/Prisma) für deine Datenbank

Wichtig: Es muss ein Zustand sein, den du deterministisch prüfen kannst (Schema, Felder, Summen, Datumsformate).

Schritt 2: Claude‑Slash‑Command für diesen Use‑Case bauen

In deinem Projekt‑Repo:

Erstelle ‎⁠.claude/commands/⁠ (falls noch nicht da).

Lege eine Datei wie ‎⁠csv_edit.md⁠ oder ‎⁠config_fix.md⁠ an.

Oben Frontmatter mit Command‑Name, Modell usw. und Hook‑Placeholder (siehe Docs „Custom Slash Command Hooks“).

Inhaltlich sollte der Prompt:

ganz eng gefasst sein (z.B. „bearbeite NUR diese CSV / diese Config nach dieser Beschreibung“),

die Eingaben klar definieren (Pfad, Änderungsbeschreibung),

ankündigen, dass nach dem Tool‑Call eine Validierung kommt und der Agent ggf. automatisch repariert.

Damit machst du aus Claude Code einen spezialisierten Agenten, keinen Generalisten.

Schritt 3: Validator‑Script in deinem Stack schreiben

Lege z.B. einen Ordner ‎⁠validators/⁠ an und schreibe dort ein Script in der Sprache, in der dein Projekt sowieso lebt (bei dir vermutlich TypeScript/Node oder Python, beides okay):

Für CSV:

▫ prüfe mit ‎⁠csv-parse⁠/‎⁠papaparse⁠ oder ‎⁠pandas⁠,

▫ ob alle Zeilen dieselbe Spaltenanzahl haben,

▫ ob Pflichtfelder nicht leer sind,

▫ ob Datums‑/Zahlenspalten korrekt parsebar sind.

Für JSON/Config:

▫ nutze ein Schema‑Tool (z.B. Zod, AJV),

▫ validiere gegen ein festes Schema,

▫ gib eine klare Fehlermeldung + optionalen Auto‑Fix zurück.

Das Script sollte als CLI funktionieren, z.B.:node validators/validateCsv.mjs --file path/to/file.csv

und per Exit‑Code + JSON auf stdout signalisieren:

‎⁠0⁠: alles ok

‎⁠1⁠ o.ä.: Fehler + Infos, was kaputt ist

optional: Pfad zur reparierten Version

Schritt 4: Hook in ‎⁠.claude/settings.json⁠ einrichten

In deinem Projektroot:

Lege ‎⁠.claude/settings.json⁠ an (oder erweitere, falls schon da).

Definiere einen ‎⁠PostToolUse⁠‑Hook, der nach bestimmten Tools (z.B. ‎⁠Write|Edit⁠ oder nach deinem Slash‑Command) immer dein Validator‑Script aufruft.

Ganz grob (Schema, genaue Felder siehst du in der Hooks‑Doku):{

"hooks": {

"PostToolUse": [

{

"matcher": "Write|Edit",

"hooks": [

{

"type": "command",

"command": "\"$CLAUDE_PROJECT_DIR\"/validators/validate-csv.sh"

}

]

}

]

}

}

Das Script bekommt das JSON‑Event von Claude Code über stdin (Toolname, Pfad etc.), extrahiert den betroffenen Pfad und validiert ihn. ​⁠https://code.claude.com/docs/en/hooks

Wenn du es nur an deinen speziellen Slash‑Command hängen willst, kannst du statt ‎⁠Write|Edit⁠ den konkreten Tool‑/Command‑Namen matchen (steht im Hook‑Input unter ‎⁠tool_name⁠).

Schritt 5: Den Closed Loop fertig machen

Jetzt baust du den „Closed Loop“, der im Video zentral ist:

Agent macht Änderung (z.B. CSV umformatieren)

PostToolUse‑Hook ruft deinen Validator auf

Validator:

▫ OK → nichts tun, Agent ist fertig

▫ Fehler →

⁃ entweder: Abbruch + klare Meldung in Claude („CSV invalid, Grund: …“),

⁃ oder: Script versucht Auto‑Fix, schreibt Datei neu und (optional) validiert nochmal.

Damit hast du für deinen Use‑Case genau das, was Dan zeigt: ein Agent, der seine Arbeit selbst checkt und ggf. selbst korrigiert, statt dass du ständig manuell nachprüfst.

Schritt 6: Auf dein größeres Agentic‑System übertragen

Wenn das für einen Teilbereich funktioniert, kannst du dasselbe Muster auf dein gesamtes Coding‑Projekt anwenden:

Subagents:
Für spezielle Aufgaben (z.B. „Migrations‑Agent“, „Refactor‑Agent“, „Finance‑Agent“) eigene Hooks definieren, die domain‑spezifisch validieren (z.B. Migrations nur, wenn Tests grün; Finance‑Agent nur, wenn Summen stimmen). ​⁠https://code.claude.com/docs/en/hooks

Skills:
Wiederverwendbare Validierungs‑Bausteine (z.B. „ensure-json-schema-valid“, „ensure-types-pass-tsc“), die du in verschiedenen Agenten nutzen kannst. ​⁠https://code.claude.com/docs/de/hooks

Slash‑Commands:
Für deine typischen Workflows (‎⁠/review_finances⁠, ‎⁠/migrate_db⁠, ‎⁠/refactor_module⁠) jeweils ein Command mit eigenem Hook‑Set, das deinen Qualitätsstandard erzwingt.

Damit wird dein Projekt schrittweise zu dem, was Dan „Agentic Layer“ nennt: Eine Schicht von Agenten + Hooks, die für dich arbeiten und deine Engineering‑Standards deterministisch einhalten.

Kurz gesagt: Die Links sind sauber, und der praktische Weg für dich ist, dir einen realen Workflow aus deinem Projekt zu nehmen (z.B. Finanz‑CSV aus deinem Coaching‑Business oder Logs/Configs deiner App), ihn mit einem klaren Slash‑Command + Validator‑Hook auszustatten – und dann das Pattern auf deinen restlichen Code und deine Agenten zu übertragen.

Dein Setup & deine Schlussfolgerung stimmen:
Mit genau diesen Links + einem kleinen Validator‑Script kannst du Dans Selbst‑Validierungs‑Prinzip 1:1 nachbauen und in dein eigenes Agent‑System integrieren.

Damit du es wirklich „copy/paste‑bar“ hast, fasse ich dein Konzept einmal schlank als umsetzbare Blaupause zusammen und ergänze konkrete Artefakte.

1. Pattern in einem Satz
Ein spezialisierter Agent (Slash‑Command / Subagent / Skill) macht eine klar umrissene Änderung → ein Hook ruft dein Validator‑Script auf → Validator entscheidet deterministisch „OK“ oder „Fehler“ und erzwingt ggf. Auto‑Reparatur.

2. Minimaler Workflow, den du direkt nachbauen kannst
Ich gehe von Node/TypeScript + Claude Code aus.

Use‑Case: CSV bearbeiten & validieren
Ziel:
Command /edit_csv formatiert oder verändert eine CSV, Hook ruft validators/validateCsv.ts auf, das prüft Schema & Felder.

2.1 Slash‑Command anlegen
Datei: .claude/commands/edit-csv.md (Name frei wählbar, z.B. csv_edit.md)

md


---
name: edit_csv
description: "Bearbeite NUR die angegebene CSV-Datei nach den Instruktionen."
model: claude-3.5-sonnet
tools:
  - Write
  - Edit
# optional: falls du Hooks pro Command in der Frontmatter definierst, siehe Slash-Command-Doku
---
Du bist ein spezialisierter CSV-Editor in diesem Projekt.
Aufgabe:
- Bearbeite ausschließlich die CSV-Datei unter dem angegebenen Pfad.
- Führe nur die beschriebenen Änderungen aus (keine zusätzlichen „Verbesserungen“).
Input:
- Pfad zur CSV-Datei im Repo
- Klare Änderungsbeschreibung (z.B. Spalte hinzufügen, Datumsformat ändern, Duplikate entfernen)
Wichtige Regeln:
- Behalte alle vorhandenen Spaltennamen bei, außer sie sollen explizit umbenannt werden.
- Schreibe die Datei so zurück, dass ALLE Zeilen dieselbe Spaltenanzahl haben.
- Lasse keine Pflichtfelder leer.
Nach deiner Änderung wird automatisch ein Validator-Script ausgeführt.
Wenn der Validator Fehler meldet, musst du deine Änderung korrigieren, bis der Validator durchläuft.
Exakte Frontmatter‑Optionen für Hooks bitte aus der Slash‑Command‑Hook‑Doku übernehmen, dein Text zeigt ja schon auf die richtige Seite.

2.2 Validator‑Script (TypeScript)
Ordner: validators/validateCsv.ts
Simple Variante mit csv‑parse + ein paar Checks:

ts


#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
type ValidationResult =
  | { ok: true }
  | { ok: false; errors: string[] };
function validateCsv(filePath: string): ValidationResult {
  if (!fs.existsSync(filePath)) {
    return { ok: false, errors: [`Datei nicht gefunden: ${filePath}`] };
  }
  const content = fs.readFileSync(filePath, "utf-8");
  let records: string[][];
  try {
    records = parse(content, {
      columns: false,
      skip_empty_lines: true,
    });
  } catch (e: any) {
    return { ok: false, errors: [`CSV-Parsing-Fehler: ${e.message}`] };
  }
  if (records.length === 0) {
    return { ok: false, errors: ["CSV ist leer."] };
  }
  const errors: string[] = [];
  const expectedColumns = records[0].length;
  records.forEach((row, index) => {
    if (row.length !== expectedColumns) {
      errors.push(
        `Zeile ${index + 1} hat ${row.length} Spalten, erwartet: ${expectedColumns}.`
      );
    }
  });
  // Beispiel: erste Spalte darf nicht leer sein (Pflichtfeld)
  records.forEach((row, index) => {
    if (!row[0] || row[0].trim() === "") {
      errors.push(`Zeile ${index + 1}: Pflichtfeld in Spalte 1 ist leer.`);
    }
  });
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true };
}
function main() {
  const args = process.argv.slice(2);
  const fileArgIndex = args.indexOf("--file");
  if (fileArgIndex === -1 || !args[fileArgIndex + 1]) {
    console.error(
      JSON.stringify({
        ok: false,
        errors: ["Missing --file argument"],
      })
    );
    process.exit(1);
  }
  const filePath = path.resolve(process.cwd(), args[fileArgIndex + 1]);
  const result = validateCsv(filePath);
  if (result.ok) {
    console.log(JSON.stringify({ ok: true }));
    process.exit(0);
  } else {
    console.error(JSON.stringify(result));
    process.exit(1);
  }
}
main();
Kompilieren (falls du TS baust) und dann über ein kleines Shell‑Script aufrufen.

2.3 Wrapper‑Script für Hooks
Datei: validators/validate-csv.sh

bash


#!/usr/bin/env bash
set -euo pipefail
# Hook-Event von Claude Code kommt über stdin als JSON
EVENT_JSON=$(cat)
# Beispiel: Pfad zur Datei aus dem Event lesen.
# Exaktes Feld hängt vom Hook-Event-Schema ab – dort steht z.B. der betroffene Pfad.
# Hier pseudo:
FILE_PATH=$(echo "$EVENT_JSON" | jq -r '.tool_output.file_path')
if [ -z "$FILE_PATH" ] || [ "$FILE_PATH" = "null" ]; then
  echo '{"ok": false, "errors": ["Kein file_path im Hook-Event gefunden."]}' >&2
  exit 1
fi
# Validator aufrufen (angepasst an deinen Build-Pfad)
node "$CLAUDE_PROJECT_DIR/dist/validators/validateCsv.js" --file "$FILE_PATH"
Die genaue Struktur des Hook‑Events bitte in der Hooks‑Doku (PostToolUse) nachschauen; Feldnamen wie tool_output.file_path sind exemplarisch.

2.4 Hook in .claude/settings.json verdrahten
Schematisch (bitte an offizielle Struktur anpassen):

jsonc


{
  "hooks": {
    "PostToolUse": [
      {
        // Nur deinen spezifischen Slash-Command matchen:
        "matcher": {
          "tool_name": "edit_csv" // oder der tatsächliche Name des Commands/Tools
        },
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/validators/validate-csv.sh"
          }
        ]
      }
    ]
  }
}
Damit passiert:

Du rufst in Claude Code /edit_csv auf.
Command nutzt Tools (Write/Edit) und ändert die CSV.
Nach dem Tool‑Call feuert PostToolUse.
Dein Hook‑Command erhält das Event‑JSON, extrahiert Dateipfad, ruft Validator.
Exit‑Code 0 ⇒ alles gut. ≠0 ⇒ Claude zeigt die Fehlermeldungen / du kannst einen „Bitte reparieren“‑Loop bauen.
3. Übertrag auf dein größeres Agent‑System
Wenn der CSV‑Use‑Case läuft, kannst du das Muster 1:1 wiederverwenden:

JSON/Configs:
Zod/AJV‑Validator, Hook triggert validateJsonConfig.ts mit Schema‑Check.
Migrations (z.B. Prisma/SQL):
Hook ruft npm test oder gezielte Migration‑Checks; nur „grün“ = OK.
Finance / Controlling (wie Dan):
Summenprüfungen, Balancing, Datumsbereichs‑Checks etc. im Validator erzwingen.
4. Nächster konkret hilfreicher Schritt
Wenn du magst, können wir jetzt:

einen konkreten Use‑Case aus deinem Projekt auswählen (z.B. Logs, Config, CSV aus deinem Coaching‑Business) und
dafür den Validator + Hook‑Konfiguration komplett durchschreiben, inkl. genauer jq‑Pfad/Hook‑Event‑Felder und der gewünschten Fehlermeldungs‑Strategie („hart abbrechen“ vs. Auto‑Fix).
Was wäre für dich der erste realistische Kandidat: CSV, JSON‑Config, Migrations – oder etwas anderes?







