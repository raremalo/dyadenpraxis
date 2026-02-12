import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Calendar, Users, User, Search } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useSettings();

  const navItems = [
    { path: '/', icon: Home, label: t.nav.home },
    { path: '/calendar', icon: Calendar, label: t.nav.calendar },
    { path: '/partner-finder', icon: Search, label: t.nav.partner },
    { path: '/groups', icon: Users, label: t.nav.groups },
    { path: '/profile', icon: User, label: t.nav.profile },
  ];

  return (
    <div className="fixed bottom-6 left-0 right-0 flex justify-center z-40 px-4">
      <nav className="flex items-center gap-1 bg-[var(--c-bg-card)]/80 backdrop-blur-xl border border-[var(--c-border)] shadow-lg shadow-black/5 rounded-full px-4 py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`relative flex flex-col items-center justify-center w-16 h-14 rounded-2xl transition-all duration-300 ${
                isActive ? 'text-[var(--c-text-main)]' : 'text-[var(--c-text-muted)] hover:text-[var(--c-text-main)]'
              }`}
            >
              {isActive && (
                <div className="absolute inset-0 bg-[var(--c-bg-app)] rounded-2xl -z-10 scale-90" />
              )}
              <item.icon className={`w-6 h-6 mb-1 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default Navigation;
