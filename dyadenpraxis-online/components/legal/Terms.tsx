import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../../contexts/SettingsContext';
import { ArrowLeft } from 'lucide-react';

const Terms: React.FC = () => {
  const { t } = useSettings();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[var(--c-bg-app)] text-[var(--c-text-main)] p-6 md:p-12">
      <div className="max-w-2xl mx-auto space-y-8 fade-in">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[var(--c-text-muted)] hover:text-[var(--c-text-main)] transition-colors mb-8"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{t.footer.agbLink}</span>
        </button>

        <h1 className="text-4xl md:text-5xl font-serif mb-6">{t.agb.title}</h1>

        <div className="space-y-6 font-light leading-relaxed">
          {/* Einleitung */}
          <p className="text-[var(--c-text-muted)]">{t.agb.introText}</p>

          {/* § 1 Geltungsbereich */}
          <section>
            <h2 className="text-xl font-medium mb-3 text-[var(--c-text-main)]">{t.agb.scopeHeading}</h2>
            <p className="text-[var(--c-text-muted)]">{t.agb.scopeText}</p>
          </section>

          {/* § 2 Registrierung */}
          <section>
            <h2 className="text-xl font-medium mb-3 text-[var(--c-text-main)]">{t.agb.registrationHeading}</h2>
            <p className="text-[var(--c-text-muted)]">{t.agb.registrationText}</p>
          </section>

          {/* § 3 Dienstbeschreibung */}
          <section>
            <h2 className="text-xl font-medium mb-3 text-[var(--c-text-main)]">{t.agb.serviceHeading}</h2>
            <p className="text-[var(--c-text-muted)]">{t.agb.serviceText}</p>
          </section>

          {/* § 4 Nutzerverhalten */}
          <section>
            <h2 className="text-xl font-medium mb-3 text-[var(--c-text-main)]">{t.agb.conductHeading}</h2>
            <p className="text-[var(--c-text-muted)] mb-2">{t.agb.conductText}</p>
            <p className="text-[var(--c-text-muted)]">{t.agb.conductConsequence}</p>
          </section>

          {/* § 5 Datenschutz */}
          <section>
            <h2 className="text-xl font-medium mb-3 text-[var(--c-text-main)]">{t.agb.privacyHeading}</h2>
            <p className="text-[var(--c-text-muted)]">{t.agb.privacyText}</p>
          </section>

          {/* § 6 Dyaden-Sitzungen */}
          <section>
            <h2 className="text-xl font-medium mb-3 text-[var(--c-text-main)]">{t.agb.sessionsHeading}</h2>
            <p className="text-[var(--c-text-muted)]">{t.agb.sessionsText}</p>
          </section>

          {/* § 7 Verfügbarkeit */}
          <section>
            <h2 className="text-xl font-medium mb-3 text-[var(--c-text-main)]">{t.agb.availabilityHeading}</h2>
            <p className="text-[var(--c-text-muted)]">{t.agb.availabilityText}</p>
          </section>

          {/* § 8 Haftung */}
          <section>
            <h2 className="text-xl font-medium mb-3 text-[var(--c-text-main)]">{t.agb.liabilityHeading}</h2>
            <p className="text-[var(--c-text-muted)]">{t.agb.liabilityText}</p>
          </section>

          {/* § 9 Änderungen */}
          <section>
            <h2 className="text-xl font-medium mb-3 text-[var(--c-text-main)]">{t.agb.changesHeading}</h2>
            <p className="text-[var(--c-text-muted)]">{t.agb.changesText}</p>
          </section>

          {/* § 10 Schlussbestimmungen */}
          <section>
            <h2 className="text-xl font-medium mb-3 text-[var(--c-text-main)]">{t.agb.finalHeading}</h2>
            <p className="text-[var(--c-text-muted)] mb-2">{t.agb.finalText}</p>
            <p className="text-[var(--c-text-muted)]">{t.agb.finalSeverability}</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Terms;
