import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../../contexts/SettingsContext';
import { ArrowLeft } from 'lucide-react';

const Datenschutz: React.FC = () => {
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
          <span>{t.footer.datenschutzLink}</span>
        </button>

        <h1 className="text-4xl md:text-5xl font-serif mb-6">{t.datenschutz.title}</h1>

        <div className="space-y-6 font-light leading-relaxed">
          {/* Einleitung */}
          <p className="text-[var(--c-text-muted)]">{t.datenschutz.introText}</p>

          {/* Verantwortliche Stelle */}
          <section>
            <h2 className="text-xl font-medium mb-3 text-[var(--c-text-main)]">{t.datenschutz.responsibleHeading}</h2>
            <p className="text-[var(--c-text-muted)]">{t.datenschutz.responsibleText}</p>
          </section>

          {/* Übersicht */}
          <section>
            <h2 className="text-xl font-medium mb-3 text-[var(--c-text-main)]">{t.datenschutz.overviewHeading}</h2>
            <p className="text-[var(--c-text-muted)]">{t.datenschutz.overviewText}</p>
          </section>

          {/* Supabase */}
          <section>
            <h2 className="text-xl font-medium mb-3 text-[var(--c-text-main)]">{t.datenschutz.supabaseHeading}</h2>
            <p className="text-[var(--c-text-muted)] mb-2">{t.datenschutz.supabaseText}</p>
            <p className="text-[var(--c-text-muted)] mb-2">{t.datenschutz.supabaseData}</p>
            <p className="text-[var(--c-text-muted)] mb-2">{t.datenschutz.supabaseStorage}</p>
            <p className="text-[var(--c-text-muted)]">{t.datenschutz.supabaseLegalBasis}</p>
          </section>

          {/* Daily.co */}
          <section>
            <h2 className="text-xl font-medium mb-3 text-[var(--c-text-main)]">{t.datenschutz.dailyHeading}</h2>
            <p className="text-[var(--c-text-muted)] mb-2">{t.datenschutz.dailyText}</p>
            <p className="text-[var(--c-text-muted)] mb-2">{t.datenschutz.dailyData}</p>
            <p className="text-[var(--c-text-muted)] mb-2">{t.datenschutz.dailyStorage}</p>
            <p className="text-[var(--c-text-muted)]">{t.datenschutz.dailyLegalBasis}</p>
          </section>

          {/* Vercel */}
          <section>
            <h2 className="text-xl font-medium mb-3 text-[var(--c-text-main)]">{t.datenschutz.vercelHeading}</h2>
            <p className="text-[var(--c-text-muted)] mb-2">{t.datenschutz.vercelText}</p>
            <p className="text-[var(--c-text-muted)] mb-2">{t.datenschutz.vercelData}</p>
            <p className="text-[var(--c-text-muted)]">{t.datenschutz.vercelStorage}</p>
          </section>

          {/* Google Gemini */}
          <section>
            <h2 className="text-xl font-medium mb-3 text-[var(--c-text-main)]">{t.datenschutz.geminiHeading}</h2>
            <p className="text-[var(--c-text-muted)] mb-2">{t.datenschutz.geminiText}</p>
            <p className="text-[var(--c-text-muted)] mb-2">{t.datenschutz.geminiData}</p>
            <p className="text-[var(--c-text-muted)]">{t.datenschutz.geminiLegalBasis}</p>
          </section>

          {/* Nutzerrechte */}
          <section>
            <h2 className="text-xl font-medium mb-3 text-[var(--c-text-main)]">{t.datenschutz.rightsHeading}</h2>
            <p className="text-[var(--c-text-muted)] mb-2">{t.datenschutz.rightsText}</p>
            <p className="text-[var(--c-text-muted)]">{t.datenschutz.rightsDelete}</p>
          </section>

          {/* Kontakt */}
          <section>
            <h2 className="text-xl font-medium mb-3 text-[var(--c-text-main)]">{t.datenschutz.contactHeading}</h2>
            <p className="text-[var(--c-text-muted)]">{t.datenschutz.contactText}</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Datenschutz;
