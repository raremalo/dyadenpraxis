import React from 'react';
import { Link } from 'react-router-dom';
import { useSettings } from '../contexts/SettingsContext';

const Footer: React.FC = () => {
  const { t } = useSettings();

  return (
    <footer className="w-full pb-28 pt-8">
      <div className="flex flex-col items-center gap-3 text-xs text-[var(--c-text-muted)]">
        <nav className="flex items-center gap-4">
          <Link
            to="/impressum"
            className="hover:text-[var(--c-text-main)] transition-colors"
          >
            {t.footer.impressumLink}
          </Link>
          <span className="text-[var(--c-border)]">·</span>
          <Link
            to="/datenschutz"
            className="hover:text-[var(--c-text-main)] transition-colors"
          >
            {t.footer.datenschutzLink}
          </Link>
          <span className="text-[var(--c-border)]">·</span>
          <Link
            to="/agb"
            className="hover:text-[var(--c-text-main)] transition-colors"
          >
            {t.footer.agbLink}
          </Link>
        </nav>
        <p className="text-[var(--c-text-muted)]/60">
          © {new Date().getFullYear()} Dyadenpraxis
        </p>
      </div>
    </footer>
  );
};

export default Footer;
