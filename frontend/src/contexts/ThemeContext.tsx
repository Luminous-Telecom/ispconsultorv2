import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

export type Theme = 'light' | 'dark';

const STORAGE_KEY_SITE = 'theme-site';
const STORAGE_KEY_SYSTEM = 'theme-system';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  /** Chave do localStorage: 'site' ou 'system' — temas independentes */
  storageKey?: 'site' | 'system';
}

/** Provider que escolhe theme-site ou theme-system conforme a rota. Deve estar dentro de Router. */
export const RouteAwareThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isSystem = location.pathname.startsWith('/adm') || location.pathname.startsWith('/saas') || location.pathname === '/login';
  return <ThemeProvider storageKey={isSystem ? 'system' : 'site'}>{children}</ThemeProvider>;
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children, storageKey = 'system' }) => {
  const key = storageKey === 'site' ? STORAGE_KEY_SITE : STORAGE_KEY_SYSTEM;

  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem(key) as Theme;
    return (saved === 'light' || saved === 'dark') ? saved : 'light';
  });

  // Quando trocar de site para sistema (ou vice-versa), carregar o tema da nova chave
  useEffect(() => {
    const saved = localStorage.getItem(key) as Theme;
    const newTheme = (saved === 'light' || saved === 'dark') ? saved : 'light';
    setTheme(newTheme);
  }, [key]);

  useEffect(() => {
    localStorage.setItem(key, theme);
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-bs-theme', theme);
    document.body.setAttribute('data-theme', theme);
    document.body.classList.toggle('dark-theme', theme === 'dark');
    document.body.classList.toggle('light-theme', theme === 'light');
  }, [theme, key]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
