import React from 'react';
import type { CurrentUser } from 'services/authService';
import type { Language } from 'contexts/I18nContext';
import LanguageDropdown from './LanguageDropdown';
import type { TranslateFn } from './types';

interface LanguageOption {
  code: Language;
  flag: string;
  name: string;
}

interface UserMenuProps {
  currentUser: CurrentUser | null;
  showUserMenu: boolean;
  showLanguageDropdown: boolean;
  isMobile: boolean;
  theme: string;
  language: Language;
  availableLanguages: LanguageOption[];
  userMenuRef: React.RefObject<HTMLDivElement | null>;
  languageTriggerRef: React.RefObject<HTMLButtonElement | null>;
  languageDropdownRef: React.RefObject<HTMLDivElement | null>;
  languageDropdownPosition: { top: number; left: number };
  t: TranslateFn;
  onToggleUserMenu: () => void;
  onToggleLanguageDropdown: () => void;
  onToggleTheme: () => void;
  onSelectLanguage: (code: Language) => void;
  onLogout: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({
  currentUser,
  showUserMenu,
  showLanguageDropdown,
  isMobile,
  theme,
  language,
  availableLanguages,
  userMenuRef,
  languageTriggerRef,
  languageDropdownRef,
  languageDropdownPosition,
  t,
  onToggleUserMenu,
  onToggleLanguageDropdown,
  onToggleTheme,
  onSelectLanguage,
  onLogout,
}) => (
  <div className="layout-user-area d-flex justify-content-end">
    <div className="layout-user-menu text-end" ref={userMenuRef}>
      <button
        type="button"
        className="layout-user-trigger"
        onClick={onToggleUserMenu}
        aria-expanded={showUserMenu}
        aria-haspopup="true"
        title={currentUser?.nome || t('layout.user')}
      >
        <span className="layout-user-trigger__avatar" aria-hidden>
          <i className="bi bi-person" />
        </span>
      </button>
      {showUserMenu && (
        <ul className="layout-user-dropdown layout-table-dropdown">
          <li className="layout-user-dropdown__header">
            <div className="layout-user-dropdown__name text-truncate">{currentUser?.nome || t('layout.user')}</div>
            <small className="layout-user-dropdown__email text-truncate">{currentUser?.email}</small>
          </li>
          <li>
            <button
              type="button"
              className="layout-user-dropdown__row"
              onClick={(e) => {
                e.stopPropagation();
                onToggleTheme();
              }}
            >
              <i className="bi bi-circle-half" aria-hidden />
              <span>{theme === 'light' ? t('layout.darkMode') : t('layout.lightMode')}</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              ref={languageTriggerRef}
              className="layout-user-dropdown__row"
              onClick={(e) => {
                e.stopPropagation();
                onToggleLanguageDropdown();
              }}
            >
              <i className="bi bi-translate" aria-hidden />
              <span>{t('layout.language')}</span>
              <i
                className={`bi layout-user-dropdown__chevron ${showLanguageDropdown ? 'bi-chevron-down' : 'bi-chevron-right'}`}
                aria-hidden
              />
            </button>
            {isMobile && (
              <LanguageDropdown
                isMobile={isMobile}
                showLanguageDropdown={showLanguageDropdown}
                language={language}
                availableLanguages={availableLanguages}
                languageDropdownRef={languageDropdownRef}
                languageDropdownPosition={languageDropdownPosition}
                onSelectLanguage={onSelectLanguage}
              />
            )}
          </li>
          <li>
            <button
              type="button"
              className="layout-user-dropdown__row layout-user-dropdown__row--danger layout-user-dropdown__row--last"
              onClick={onLogout}
            >
              <i className="bi bi-box-arrow-right" aria-hidden />
              <span>{t('nav.logout')}</span>
            </button>
          </li>
        </ul>
      )}
      {!isMobile && (
        <LanguageDropdown
          isMobile={isMobile}
          showLanguageDropdown={showLanguageDropdown}
          language={language}
          availableLanguages={availableLanguages}
          languageDropdownRef={languageDropdownRef}
          languageDropdownPosition={languageDropdownPosition}
          onSelectLanguage={onSelectLanguage}
        />
      )}
    </div>
  </div>
);

export default UserMenu;
