import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface InstructionsProps {
  onBack: () => void;
}

const Instructions: React.FC<InstructionsProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-white text-slate-800 p-6 md:p-12">
      <div className="max-w-2xl mx-auto space-y-8 fade-in">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-800 transition-colors mb-8"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Zurück</span>
        </button>

        <h1 className="text-4xl md:text-5xl font-serif mb-6">Anleitung zur Dyade</h1>
        
        <div className="space-y-8 font-light leading-relaxed text-lg">
          <section>
            <h2 className="text-xl font-medium mb-3 text-slate-900">Was ist eine Dyade?</h2>
            <p className="text-slate-600">
              Eine Dyade ist eine meditative Übung zu zweit. Sie kombiniert Kontemplation (Inneres Erforschen) mit Kommunikation. Es geht nicht um ein normales Gespräch, sondern um das direkte Erfahren und Mitteilen der Wahrheit des Augenblicks.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3 text-slate-900">Der Ablauf</h2>
            <ul className="list-disc pl-5 space-y-2 text-slate-600">
              <li>Ihr werdet verbunden. Einer ist der <strong className="font-medium text-slate-800">Sprecher</strong>, einer der <strong className="font-medium text-slate-800">Zuhörer</strong>.</li>
              <li>Der Zuhörer gibt die Anweisung: "Sag mir, wer du bist" (oder die aktuelle Tagesfrage).</li>
              <li>Der Sprecher geht nach innen, findet eine Antwort (ein Gefühl, einen Gedanken, eine Wahrnehmung) und teilt sie mit.</li>
              <li>Der Zuhörer sagt nur "Danke". Er bewertet nicht, kommentiert nicht, nickt nur neutral.</li>
              <li>Dies wiederholt sich für ca. 5 Minuten, dann wird gewechselt.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3 text-slate-900">Die Haltung</h2>
            <p className="text-slate-600">
              Sei offen. Sei ehrlich. Versuche nicht, "gut" zu sein oder kluge Dinge zu sagen. Sage einfach, was jetzt gerade da ist. Wenn nichts da ist, sage: "Ich spüre gerade nichts." Auch das ist die Wahrheit.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3 text-slate-900">Geschichte & Ursprung</h2>
            <ul className="list-disc pl-5 space-y-2 text-slate-600">
              <li>Die Dyadenpraxis (von griechisch "Dyade" = Zweiheit) ist eine Form der kontemplativen Kommunikation.</li>
              <li>Entwickelt in den 1960er Jahren von <span className="font-medium text-slate-800">Charles Berner</span> als Teil seiner "Mind Clearing" Technik.</li>
              <li>Herzstück des <span className="font-medium text-slate-800">Enlightenment Intensive</span> — 10–14 tägige Retreats mit 10–12 Dyaden pro Tag.</li>
              <li>Heute wissenschaftlich fundiert durch das <span className="font-medium text-slate-800">ReConnect! Programm</span> von Prof. Dr. Tania Singer.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3 text-slate-900">Drei Hauptformen</h2>
            <ul className="list-disc pl-5 space-y-2 text-slate-600">
              <li>
                <span className="font-medium text-slate-800">Klassische Dyaden (Enlightenment Intensive)</span>: 40 Min pro Dyade (8x 5 Min), existenzielle Fragen ("Wer bin ich?", "Was ist Leben?"), intensive Retreat-Struktur.
              </li>
              <li>
                <span className="font-medium text-slate-800">Kontemplative Dyaden (Achtsamkeit)</span>: 2x 2 Min oder 2x 5 Min, thematische Leitfragen zu Stress, Gefühlen, Präsenz, flexibel in Workshops.
              </li>
              <li>
                <span className="font-medium text-slate-800">ReConnect! Dyaden (Wissenschaftlich)</span>: Tägliche Praxis über 8 Wochen, drei Typen (Affekt-, Perspektiv-, Mitgefühls-Dyaden), wechselnde Partner per App.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3 text-slate-900">Die vier Säulen</h2>
            <ul className="list-disc pl-5 space-y-2 text-slate-600">
              <li><span className="font-medium text-slate-800">Struktur</span> — Klare Zeitvorgaben, feste Abläufe und definierte Rollen schaffen einen sicheren Rahmen.</li>
              <li><span className="font-medium text-slate-800">Präsenz</span> — Vollständige Aufmerksamkeit im gegenwärtigen Moment ohne Ablenkung oder Bewertung.</li>
              <li><span className="font-medium text-slate-800">Authentizität</span> — Ehrliches Mitteilen dessen, was gerade wirklich in einem vorgeht.</li>
              <li><span className="font-medium text-slate-800">Kontemplation</span> — Tiefes Erforschen der Leitfrage durch wiederholtes Eintauchen und Reflektieren.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3 text-slate-900">Wissenschaftliche Grundlagen</h2>
            <p className="text-slate-600 mb-3">
              Prof. Dr. Tania Singer hat in über 25 Jahren Forschung die neurowissenschaftlichen Effekte untersucht. Messbare Wirkungen:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-600">
              <li>Reduktion von Stress und Einsamkeit</li>
              <li>Stärkung von Empathie und Mitgefühl</li>
              <li>Verbesserung der mentalen Gesundheit und emotionalen Resilienz</li>
              <li>Erhöhung sozialer Kohäsion und Abbau von Vorurteilen</li>
            </ul>
            <p className="text-slate-600 mt-3">
              Im Gegensatz zu Meditation alleine verbinden Dyaden kontemplative Praxis mit sozialer Interaktion.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3 text-slate-900">Erweiterte Rollenverteilung</h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-medium text-slate-800 mb-2">Sprecher:in — Was zu tun ist</h3>
                <ul className="list-disc pl-5 space-y-2 text-slate-600">
                  <li>Spontan antworten</li>
                  <li>Gedanken, Gefühle, Körperempfindungen teilen</li>
                  <li>Stille zulassen</li>
                  <li>Ich-Botschaften verwenden</li>
                </ul>
              </div>
              <div>
                <h3 className="text-base font-medium text-slate-800 mb-2">Sprecher:in — Was zu vermeiden ist</h3>
                <ul className="list-disc pl-5 space-y-2 text-slate-600">
                  <li>Lange nachdenken / "richtige" Antwort suchen</li>
                  <li>Du-Botschaften</li>
                  <li>Füllen von Stille erzwingen</li>
                </ul>
              </div>
              <div>
                <h3 className="text-base font-medium text-slate-800 mb-2">Zuhörer:in — Was zu tun ist</h3>
                <ul className="list-disc pl-5 space-y-2 text-slate-600">
                  <li>Voll präsent sein</li>
                  <li>Blickkontakt halten (optional)</li>
                  <li>Mitfühlend und urteilsfrei sein</li>
                  <li>Raum halten</li>
                </ul>
              </div>
              <div>
                <h3 className="text-base font-medium text-slate-800 mb-2">Zuhörer:in — Was zu vermeiden ist</h3>
                <ul className="list-disc pl-5 space-y-2 text-slate-600">
                  <li>Unterbrechen</li>
                  <li>Kommentieren (verbal/nonverbal)</li>
                  <li>Ratschläge geben</li>
                  <li>Bewerten oder interpretieren</li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Instructions;
