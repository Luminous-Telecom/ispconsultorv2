import React, { useMemo } from 'react';
import { NavLinkButton } from 'components/ui';
import { useTheme } from 'contexts/ThemeContext';
import { useFontSize, type FontSize } from 'contexts/FontSizeContext';
import { useI18n, type Language } from 'contexts/I18nContext';
import UserMenuFlyout from '../layout/UserMenuFlyout';
import type { TranslateFn } from '../layout/types';

export interface AppUserMenuUser {
  nome?: string | null;
  email?: string | null;
  nivel_acesso?: string | null;
}

export interface AppUserMenuProps {
  currentUser: AppUserMenuUser | null;
  showUserMenu: boolean;
  userMenuRef: React.RefObject<HTMLDivElement | null>;
  t: TranslateFn;
  onToggleUserMenu: () => void;
  onLogout: () => void;
  userTitleFallback: string;
  /** Mantidos por compatibilidade com AppLayoutHeader — não usados. */
  theme?: string;
  onToggleTheme?: () => void;
  showLanguage?: boolean;
  showLanguageDropdown?: boolean;
  isMobile?: boolean;
  language?: Language;
  availableLanguages?: unknown[];
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
  userMenuRef,
  t,
  onToggleUserMenu,
  onLogout,
  userTitleFallback,
}) => {
  const { theme, setTheme } = useTheme();
  const { fontSize, setFontSize } = useFontSize();
  const { language, setLanguage, availableLanguages } = useI18n();

  const displayName = currentUser?.nome || userTitleFallback;
  const initials = getInitials(currentUser?.nome, userTitleFallback.charAt(0).toUpperCase() || 'U');

  const themeOptions = useMemo(
    () => [
      {
        id: 'light',
        label: t('layout.lightMode'),
        active: theme === 'light',
        onSelect: () => setTheme('light'),
      },
      {
        id: 'dark',
        label: t('layout.darkMode'),
        active: theme === 'dark',
        onSelect: () => setTheme('dark'),
      },
    ],
    [t, theme, setTheme]
  );

  const languageOptions = useMemo(
    () =>
      availableLanguages.map((lang) => ({
        id: lang.code,
        label: lang.name,
        icon: lang.flag,
        active: language === lang.code,
        onSelect: () => {
          if (language !== lang.code) {
            setLanguage(lang.code);
          }
        },
      })),
    [availableLanguages, language, setLanguage]
  );

  const fontSizeOptions = useMemo(() => {
    const items: { id: FontSize; label: string }[] = [
      { id: 'sm', label: t('layout.fontSizeSmall') },
      { id: 'md', label: t('layout.fontSizeMedium') },
      { id: 'lg', label: t('layout.fontSizeLarge') },
    ];
    return items.map((item) => ({
      id: item.id,
      label: item.label,
      active: fontSize === item.id,
      onSelect: () => setFontSize(item.id),
    }));
  }, [t, fontSize, setFontSize]);

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
              <small
                className="layout-user-dropdown__email text-truncate"
                title={currentUser?.email || undefined}
              >
                {currentUser?.email}
              </small>
              {currentUser?.nivel_acesso && (
                <small className="layout-user-dropdown__role">{currentUser.nivel_acesso}</small>
              )}
            </li>

            <UserMenuFlyout
              label={t('layout.theme')}
              iconClassName="bi bi-circle-half"
              ariaLabel={t('layout.theme')}
              options={themeOptions}
            />

            <UserMenuFlyout
              label={t('layout.language')}
              iconClassName="bi bi-translate"
              ariaLabel={t('layout.language')}
              options={languageOptions}
            />

            <UserMenuFlyout
              label={t('layout.fontSize')}
              iconClassName="bi bi-fonts"
              ariaLabel={t('layout.fontSize')}
              options={fontSizeOptions}
            />

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
