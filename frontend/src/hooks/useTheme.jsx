import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('crppr_theme');
    // Only use stored value if the user explicitly chose it
    if (stored === 'dark' || stored === 'light') {
      const explicit = localStorage.getItem('crppr_theme_explicit');
      if (explicit === 'true') return stored === 'dark';
    }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  });

  // Listen for system preference changes when user hasn't explicitly chosen
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const handler = (e) => {
      const explicit = localStorage.getItem('crppr_theme_explicit');
      if (explicit !== 'true') setDark(e.matches);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('crppr_theme', dark ? 'dark' : 'light');

    // Update favicon based on current theme
    document.querySelectorAll("link[rel='icon']").forEach((link) => {
      link.href = dark ? '/crppr-dark.svg' : '/crppr.svg';
    });
  }, [dark]);

  const toggle = () => {
    localStorage.setItem('crppr_theme_explicit', 'true');
    setDark((d) => !d);
  };

  return (
    <ThemeContext.Provider value={{ dark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>');
  return ctx;
}
