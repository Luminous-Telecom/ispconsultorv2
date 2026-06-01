import React from 'react';
import type { Language } from 'contexts/I18nContext';
import LanguageDropdown from '../layout/LanguageDropdown';
import type { TranslateFn } from '../layout/types';

interface LanguageOption {
  code: Language;
  flag: string;
  name: string;
}

export interface AppUserMenuUser {
  nome?: string | null;
  email?: string | null;
  nivel_acesso?: string | null;
}

export interface AppUserMenuProps {
  currentUser: AppUserMenuUser | null;
  showUserMenu: boolean;
  theme: string;
  userMenuRef: React.RefObject<HTMLDivElement | null>;
  t: TranslateFn;
  onToggleUserMenu: () => void;
  onToggleTheme: () => void;
  onLogout: () => void;
  userTitleFallback: string;
  showLanguage?: boolean;
  showLanguageDropdown?: boolean;
  isMobile?: boolean;
  language?: Language;
  availableLanguages?: LanguageOption[];
  languageTriggerRef?: React.RefObject<HTMLButtonElement | null>;
  languageDropdownRef?: React.RefObject<HTMLDivElement | null>;
  languageDropdownPosition?: { top: number; left: number };
  onToggleLanguageDropdown?: () => void;
  onSelectLanguage?: (code: Language) => void;
}

const AppUserMenu: React.FC<AppUserMenuProps> = ({
  currentUser,
  showUserMenu,
  theme,
  userMenuRef,
  t,
  onToggleUserMenu,
  onToggleTheme,
  onLogout,
  userTitleFallback,
  showLanguage = false,
  showLanguageDropdown = false,
  isMobile = false,
  language,
  availableLanguages = [],
  languageTriggerRef,
  languageDropdownRef,
  languageDropdownPosition = { top: 0, left: 0 },
  onToggleLanguageDropdown,
  onSelectLanguage,
}) => (
  <div className="layout-user-area d-flex align-items-center justify-content-end">
    <div className="layout-user-menu text-end" ref={userMenuRef}>
      <button
        type="button"
        className="layout-user-trigger"
        onClick={onToggleUserMenu}
        aria-expanded={showUserMenu}
        aria-haspopup="true"
        title={currentUser?.nome || userTitleFallback}
      >
        <span className="layout-user-trigger__avatar" aria-hidden>
          <i className="bi bi-person" />
        </span>
      </button>
      {showUserMenu && (
        <ul className="layout-user-dropdown layout-table-dropdown">
          <li className="layout-user-dropdown__header">
            <div className="layout-user-dropdown__name text-truncate">
              {currentUser?.nome || userTitleFallback}
            </div>
            <small className="layout-user-dropdown__email text-truncate">{currentUser?.email}</small>
            {currentUser?.nivel_acesso && (
              <small className="d-block mt-1 text-warning text-uppercase" style={{ fontSize: '0.65rem' }}>
                {currentUser.nivel_acesso}
              </small>
            )}
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
          {showLanguage && onToggleLanguageDropdown && onSelectLanguage && languageTriggerRef && (
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
              {isMobile && languageDropdownRef && language && (
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
          )}
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
      {showLanguage && !isMobile && languageDropdownRef && language && onSelectLanguage && (
        <LanguageDropdown
          isMobile={false}
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

export default AppUserMenu;
