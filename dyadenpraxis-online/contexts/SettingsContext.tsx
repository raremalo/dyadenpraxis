import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, translations } from '../translations';
import { GongTimerConfig, GongMode } from '../types';

export type { Language };

export type Theme = 'light' | 'dark' | 'warm' | 'nature';

const DEFAULT_GONG_CONFIG: GongTimerConfig = {
  intervalSeconds: 60,
  mode: 'single' as GongMode,
  soundId: 'big-bowl',
};

interface SettingsContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  gongConfig: GongTimerConfig;
  setGongConfig: (config: GongTimerConfig) => void;
  t: typeof translations['de'];
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Try to load from localStorage or default
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('dyad_lang');
    return (saved === 'en' || saved === 'de') ? saved : 'de';
  });

  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('dyad_theme');
    return (saved === 'light' || saved === 'dark' || saved === 'warm' || saved === 'nature') ? saved : 'light';
  });

  const [gongConfig, setGongConfigState] = useState<GongTimerConfig>(() => {
    const saved = localStorage.getItem('dyad_gong_config');
    if (saved) {
      try { return JSON.parse(saved) as GongTimerConfig; } catch { /* fallthrough */ }
    }
    return DEFAULT_GONG_CONFIG;
  });

  useEffect(() => {
    localStorage.setItem('dyad_lang', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('dyad_theme', theme);
    // Apply theme class to body
    document.body.className = `theme-${theme}`;
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('dyad_gong_config', JSON.stringify(gongConfig));
  }, [gongConfig]);

  const setLanguage = (lang: Language) => setLanguageState(lang);
  const setTheme = (t: Theme) => setThemeState(t);
  const setGongConfig = (config: GongTimerConfig) => setGongConfigState(config);

  const t = translations[language];

  return (
    <SettingsContext.Provider value={{ language, setLanguage, theme, setTheme, gongConfig, setGongConfig, t }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};