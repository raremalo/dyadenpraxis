import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../../contexts/SettingsContext';
import { ArrowLeft } from 'lucide-react';

const Impressum: React.FC = () => {
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
          <span>{t.footer.impressumLink}</span>
        </button>

        <h1 className="text-4xl md:text-5xl font-serif mb-6">{t.impressum.title}</h1>

        <div className="space-y-6 font-light leading-relaxed">
          {/* Verantwortlicher */}
          <section>
            <h2 className="text-xl font-medium mb-3 text-[var(--c-text-main)]">{t.impressum.responsibleHeading}</h2>
            <p className="text-[var(--c-text-muted)]">{t.impressum.name}</p>
            <p className="text-[var(--c-text-muted)]">{t.impressum.address}</p>
          </section>

          {/* Kontakt */}
          <section>
            <h2 className="text-xl font-medium mb-3 text-[var(--c-text-main)]">{t.impressum.contactHeading}</h2>
            <p className="text-[var(--c-text-muted)]">{t.impressum.phone}</p>
            <p className="text-[var(--c-text-muted)]">{t.impressum.email}</p>
          </section>

          {/* Online-Streitbeilegung */}
          <section>
            <h2 className="text-xl font-medium mb-3 text-[var(--c-text-main)]">{t.impressum.onlineDisputeHeading}</h2>
            <p className="text-[var(--c-text-muted)] mb-2">{t.impressum.onlineDisputeText}</p>
            <p className="text-[var(--c-text-muted)]">{t.impressum.onlineDisputeNote}</p>
          </section>

          {/* Haftungsausschluss */}
          <section>
            <h2 className="text-xl font-medium mb-3 text-[var(--c-text-main)]">{t.impressum.disclaimerHeading}</h2>
            <p className="text-[var(--c-text-muted)]">{t.impressum.disclaimerContent}</p>
          </section>

          {/* Haftung für Links */}
          <section>
            <h2 className="text-xl font-medium mb-3 text-[var(--c-text-main)]">{t.impressum.linksHeading}</h2>
            <p className="text-[var(--c-text-muted)]">{t.impressum.linksContent}</p>
          </section>

          {/* Urheberrecht */}
          <section>
            <h2 className="text-xl font-medium mb-3 text-[var(--c-text-main)]">{t.impressum.copyrightHeading}</h2>
            <p className="text-[var(--c-text-muted)]">{t.impressum.copyrightContent}</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Impressum;
