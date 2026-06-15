import React from 'react';

import { useSettings } from '../contexts/SettingsContext';

const Footer: React.FC = () => {
  const { t } = useSettings();

  return (
    <footer className="w-full pb-28 pt-6">
      <div className="flex flex-col items-center gap-3 text-xs text-[var(--c-text-muted)]">
        <nav className="flex items-center gap-4">
          <a
            href="/impressum"
            className="hover:text-[var(--c-text-main)] transition-colors"
          >
            {t.footer.impressumLink}
          </a>
          <span className="text-[var(--c-border)]">·</span>
          <a
            href="/datenschutz"
            className="hover:text-[var(--c-text-main)] transition-colors"
          >
            {t.footer.datenschutzLink}
          </a>
          <span className="text-[var(--c-border)]">·</span>
          <a
            href="/agb"
            className="hover:text-[var(--c-text-main)] transition-colors"
          >
            {t.footer.agbLink}
          </a>
        </nav>
        <p className="text-[var(--c-text-muted)]/60">
          © {new Date().getFullYear()} Dyadenpraxis
        </p>
      </div>
    </footer>
  );
};

export default Footer;
