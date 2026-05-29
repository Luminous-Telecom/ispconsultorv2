/* eslint-disable no-template-curly-in-string */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Language, TranslationKeys } from '../i18n/translationKeys';
import { translations } from '../i18n/translations';

export type { Language, TranslationKeys } from '../i18n/translationKeys';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof TranslationKeys, params?: Record<string, unknown>) => string;
  availableLanguages: { code: Language; name: string; flag: string }[];
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const availableLanguages = [
  { code: 'pt-BR' as Language, name: 'Português', flag: '🇧🇷' },
  { code: 'en-US' as Language, name: 'English', flag: '🇺🇸' },
  { code: 'es-ES' as Language, name: 'Español', flag: '🇪🇸' },
];

const normalizeLanguage = (lang: string): Language => {
  const langLower = lang.toLowerCase();
  if (langLower.startsWith('pt')) return 'pt-BR';
  if (langLower.startsWith('en')) return 'en-US';
  if (langLower.startsWith('es')) return 'es-ES';
  return 'pt-BR';
};

const getInitialLanguage = (): Language => {
  if (typeof window === 'undefined') return 'pt-BR';

  const savedLang = localStorage.getItem('app-language') as Language | null;
  if (savedLang && availableLanguages.some((lang) => lang.code === savedLang)) {
    return savedLang;
  }

  const browserLang = navigator.language || navigator.languages?.[0] || 'pt-BR';
  const normalizedLang = normalizeLanguage(browserLang);
  localStorage.setItem('app-language', normalizedLang);
  return normalizedLang;
};

export const I18nProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => getInitialLanguage());

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'app-language' && e.newValue) {
        const newLang = e.newValue as Language;
        if (availableLanguages.some((lang) => lang.code === newLang)) {
          setLanguageState(newLang);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app-language', lang);
  };

  const t = (key: keyof TranslationKeys, params?: Record<string, unknown>): string => {
    let translation = translations[language][key] || translations['pt-BR'][key] || key;

    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        translation = translation.replace(new RegExp(`\\$\\{${param}\\}`, 'g'), String(value));
      });
    }

    return translation;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, availableLanguages }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
