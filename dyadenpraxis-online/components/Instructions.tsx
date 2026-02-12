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
        </div>
      </div>
    </div>
  );
};

export default Instructions;
