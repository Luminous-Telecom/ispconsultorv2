import React from 'react';
import { NavLinkButton } from 'components/ui';
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
          <NavLinkButton
            key={lang.code}
            className={`layout-user-dropdown__subrow ${language === lang.code ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSelectLanguage(lang.code);
            }}
            ariaLabel={lang.name}
          >
            <span className="me-2">{lang.flag}</span>
            <span>{lang.name}</span>
            {language === lang.code && (
              <i className="bi bi-check-lg ms-auto text-primary" aria-hidden />
            )}
          </NavLinkButton>
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
          <NavLinkButton
            className={`layout-user-dropdown__subrow ${language === lang.code ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSelectLanguage(lang.code);
            }}
            ariaLabel={lang.name}
          >
            <span className="me-2">{lang.flag}</span>
            <span>{lang.name}</span>
            {language === lang.code && (
              <i className="bi bi-check-lg ms-auto text-primary"></i>
            )}
          </NavLinkButton>
        </div>
      ))}
    </div>
  );
};

export default LanguageDropdown;
