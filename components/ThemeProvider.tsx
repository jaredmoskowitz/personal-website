'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { SchemeId } from '@/lib/data';

type Theme = 'dark' | 'light';

interface ThemeContextValue {
  theme: Theme;
  scheme: SchemeId;
  toggleTheme: () => void;
  setScheme: (s: SchemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  scheme: 'amber',
  toggleTheme: () => {},
  setScheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [scheme, setSchemeState] = useState<SchemeId>('amber');

  // Apply to html element
  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute('data-theme', theme);
    html.setAttribute('data-scheme', scheme);
  }, [theme, scheme]);

  // Persist to localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('tm-prefs');
      if (saved) {
        const prefs = JSON.parse(saved);
        if (prefs.theme) setTheme(prefs.theme);
        if (prefs.scheme) setSchemeState(prefs.scheme);
      }
    } catch {}
  }, []);

  const save = (t: Theme, s: SchemeId) => {
    try { localStorage.setItem('tm-prefs', JSON.stringify({ theme: t, scheme: s })); } catch {}
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    save(next, scheme);
  };

  const setScheme = (s: SchemeId) => {
    setSchemeState(s);
    save(theme, s);
  };

  return (
    <ThemeContext.Provider value={{ theme, scheme, toggleTheme, setScheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
