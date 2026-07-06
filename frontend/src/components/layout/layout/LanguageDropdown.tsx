import React from 'react';
import { NavLinkButton } from 'components/ui';
import type { Language } from 'contexts/I18nContext';

interface LanguageOption {
  code: Language;
  flag: string;
  name: string;
}

interface LanguageDropdownProps {
  showLanguageDropdown: boolean;
  language: Language;
  availableLanguages: LanguageOption[];
  languageDropdownRef: React.RefObject<HTMLDivElement | null>;
  onSelectLanguage: (code: Language) => void;
}

/** Lista de idiomas expandida dentro do menu do usuário (evita flyout cortado na borda da tela). */
const LanguageDropdown: React.FC<LanguageDropdownProps> = ({
  showLanguageDropdown,
  language,
  availableLanguages,
  languageDropdownRef,
  onSelectLanguage,
}) => {
  if (!showLanguageDropdown) {
    return null;
  }

  return (
    <div ref={languageDropdownRef} data-language-dropdown className="layout-user-dropdown__languages">
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
          <span className="text-truncate">{lang.name}</span>
          {language === lang.code && (
            <i className="bi bi-check-lg ms-auto text-primary" aria-hidden />
          )}
        </NavLinkButton>
      ))}
    </div>
  );
};

export default LanguageDropdown;
