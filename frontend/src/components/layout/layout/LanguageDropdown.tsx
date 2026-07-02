import React from 'react';
import { useElementProperties } from 'hooks/useElementProperties';
import type { Language } from 'contexts/I18nContext';

interface LanguageOption {
  code: Language;
  flag: string;
  name: string;
}

interface LanguageDropdownProps {
  isMobile: boolean;
  showLanguageDropdown: boolean;
  language: Language;
  availableLanguages: LanguageOption[];
  languageDropdownRef: React.RefObject<HTMLDivElement | null>;
  languageDropdownPosition: { top: number; left: number };
  onSelectLanguage: (code: Language) => void;
}

const LanguageDropdown: React.FC<LanguageDropdownProps> = ({
  isMobile,
  showLanguageDropdown,
  language,
  availableLanguages,
  languageDropdownRef,
  languageDropdownPosition,
  onSelectLanguage,
}) => {
  useElementProperties(
    languageDropdownRef,
    isMobile
      ? {}
      : {
          top: `${languageDropdownPosition.top}px`,
          left: `${languageDropdownPosition.left}px`,
        },
    [isMobile, languageDropdownPosition.top, languageDropdownPosition.left],
  );

  if (!showLanguageDropdown) {
    return null;
  }

  if (isMobile) {
    return (
      <div ref={languageDropdownRef} data-language-dropdown>
        {availableLanguages.map((lang) => (
          <button
            key={lang.code}
            type="button"
            className={`layout-user-dropdown__subrow ${language === lang.code ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSelectLanguage(lang.code);
            }}
          >
            <span className="me-2">{lang.flag}</span>
            <span>{lang.name}</span>
            {language === lang.code && (
              <i className="bi bi-check-lg ms-auto text-primary" aria-hidden />
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div
      ref={languageDropdownRef}
      data-language-dropdown
      className="layout-language-dropdown-menu shadow dropdown-menu-min-w-160"
    >
      {availableLanguages.map((lang) => (
        <div key={lang.code}>
          <button
            type="button"
            className={`layout-user-dropdown__subrow ${language === lang.code ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSelectLanguage(lang.code);
            }}
          >
            <span className="me-2">{lang.flag}</span>
            <span>{lang.name}</span>
            {language === lang.code && (
              <i className="bi bi-check-lg ms-auto text-primary"></i>
            )}
          </button>
        </div>
      ))}
    </div>
  );
};

export default LanguageDropdown;
