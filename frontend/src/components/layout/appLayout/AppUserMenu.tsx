import React from 'react';
import { NavLinkButton } from 'components/ui';
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
  onToggleLanguageDropdown?: () => void;
  onSelectLanguage?: (code: Language) => void;
}

const getInitials = (name?: string | null, fallback = 'U'): string => {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase() || fallback;
};

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
  onToggleLanguageDropdown,
  onSelectLanguage,
}) => {
  const displayName = currentUser?.nome || userTitleFallback;
  const initials = getInitials(currentUser?.nome, userTitleFallback.charAt(0).toUpperCase() || 'U');

  return (
  <div className="layout-user-area d-flex align-items-center justify-content-end">
    <div className="layout-user-menu text-end" ref={userMenuRef}>
      <NavLinkButton
        className="layout-user-trigger"
        onClick={onToggleUserMenu}
        aria-expanded={showUserMenu}
        aria-haspopup="true"
        title={displayName}
        ariaLabel={displayName}
      >
        <span className="layout-user-trigger__avatar" aria-hidden>
          {initials}
        </span>
      </NavLinkButton>
      {showUserMenu && (
        <ul className="layout-user-dropdown layout-table-dropdown">
          <li className="layout-user-dropdown__header">
            <div className="layout-user-dropdown__name text-truncate">{displayName}</div>
            <small className="layout-user-dropdown__email text-truncate">{currentUser?.email}</small>
            {currentUser?.nivel_acesso && (
              <small className="layout-user-dropdown__role">{currentUser.nivel_acesso}</small>
            )}
          </li>
          <li>
            <NavLinkButton
              className="layout-user-dropdown__row"
              onClick={(e) => {
                e.stopPropagation();
                onToggleTheme();
              }}
              ariaLabel={theme === 'light' ? t('layout.darkMode') : t('layout.lightMode')}
            >
              <i className="bi bi-circle-half" aria-hidden />
              <span>{theme === 'light' ? t('layout.darkMode') : t('layout.lightMode')}</span>
            </NavLinkButton>
          </li>
          {showLanguage && onToggleLanguageDropdown && onSelectLanguage && languageTriggerRef && (
            <li>
              <NavLinkButton
                ref={languageTriggerRef}
                className="layout-user-dropdown__row"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleLanguageDropdown();
                }}
                ariaLabel={t('layout.language')}
              >
                <i className="bi bi-translate" aria-hidden />
                <span>{t('layout.language')}</span>
                <i
                  className={`bi layout-user-dropdown__chevron ${showLanguageDropdown ? 'bi-chevron-down' : 'bi-chevron-right'}`}
                  aria-hidden
                />
              </NavLinkButton>
              {languageDropdownRef && language && (
                <LanguageDropdown
                  showLanguageDropdown={showLanguageDropdown}
                  language={language}
                  availableLanguages={availableLanguages}
                  languageDropdownRef={languageDropdownRef}
                  onSelectLanguage={onSelectLanguage}
                />
              )}
            </li>
          )}
          <li className="layout-user-dropdown__footer">
            <NavLinkButton
              className="layout-user-dropdown__row layout-user-dropdown__row--danger"
              onClick={onLogout}
              ariaLabel={t('nav.logout')}
            >
              <i className="bi bi-box-arrow-right" aria-hidden />
              <span>{t('nav.logout')}</span>
            </NavLinkButton>
          </li>
        </ul>
      )}
    </div>
  </div>
  );
};

export default AppUserMenu;
