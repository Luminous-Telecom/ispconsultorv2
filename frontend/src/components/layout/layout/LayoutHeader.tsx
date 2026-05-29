import React from 'react';
import type { CurrentUser } from 'services/authService';
import type { Language } from 'contexts/I18nContext';
import LayoutSearchBar, { type SearchFieldOption } from './LayoutSearchBar';
import UserMenu from './UserMenu';
import type { TranslateFn } from './types';

interface LanguageOption {
  code: Language;
  flag: string;
  name: string;
}

interface LayoutHeaderProps {
  isMobile: boolean;
  currentUser: CurrentUser | null;
  showUserMenu: boolean;
  showLanguageDropdown: boolean;
  theme: string;
  language: Language;
  availableLanguages: LanguageOption[];
  searchValue: string;
  setSearchValue: (value: string) => void;
  searchPlaceholder?: string;
  searchField?: string;
  setSearchField?: (field: string) => void;
  availableSearchFields?: SearchFieldOption[];
  userMenuRef: React.RefObject<HTMLDivElement | null>;
  languageTriggerRef: React.RefObject<HTMLButtonElement | null>;
  languageDropdownRef: React.RefObject<HTMLDivElement | null>;
  languageDropdownPosition: { top: number; left: number };
  t: TranslateFn;
  onToggleSidebar: () => void;
  onToggleUserMenu: () => void;
  onToggleLanguageDropdown: () => void;
  onToggleTheme: () => void;
  onSelectLanguage: (code: Language) => void;
  onLogout: () => void;
  onSearch: (value: string) => void;
}

const LayoutHeader: React.FC<LayoutHeaderProps> = ({
  isMobile,
  currentUser,
  showUserMenu,
  showLanguageDropdown,
  theme,
  language,
  availableLanguages,
  searchValue,
  setSearchValue,
  searchPlaceholder,
  searchField,
  setSearchField,
  availableSearchFields,
  userMenuRef,
  languageTriggerRef,
  languageDropdownRef,
  languageDropdownPosition,
  t,
  onToggleSidebar,
  onToggleUserMenu,
  onToggleLanguageDropdown,
  onToggleTheme,
  onSelectLanguage,
  onLogout,
  onSearch,
}) => (
  <header className="navbar navbar-expand-md sticky-top main-navbar">
    <div className="container-fluid">
      <div className="d-flex flex-wrap align-items-center justify-content-between w-100">
        <div className="d-flex align-items-center">
          {isMobile && (
            <button
              className="navbar-toggler d-block border-0 p-0"
              type="button"
              onClick={onToggleSidebar}
              aria-label={t('layout.openMenu')}
            >
              <span className="navbar-toggler-icon"></span>
            </button>
          )}
        </div>

        <div className="d-flex justify-content-center flex-grow-1">
          {!isMobile && (
            <LayoutSearchBar
              id="desktop-search"
              variant="navbar"
              searchValue={searchValue}
              setSearchValue={setSearchValue}
              onSearch={onSearch}
              searchPlaceholder={searchPlaceholder}
              searchField={searchField}
              setSearchField={setSearchField}
              availableSearchFields={availableSearchFields}
              t={t}
            />
          )}

          {isMobile && (
            <LayoutSearchBar
              id="mobile-inline-search"
              variant="inline"
              searchValue={searchValue}
              setSearchValue={setSearchValue}
              onSearch={onSearch}
              searchPlaceholder={searchPlaceholder}
              searchField={searchField}
              setSearchField={setSearchField}
              availableSearchFields={availableSearchFields}
              t={t}
            />
          )}
        </div>

        <UserMenu
          currentUser={currentUser}
          showUserMenu={showUserMenu}
          showLanguageDropdown={showLanguageDropdown}
          isMobile={isMobile}
          theme={theme}
          language={language}
          availableLanguages={availableLanguages}
          userMenuRef={userMenuRef}
          languageTriggerRef={languageTriggerRef}
          languageDropdownRef={languageDropdownRef}
          languageDropdownPosition={languageDropdownPosition}
          t={t}
          onToggleUserMenu={onToggleUserMenu}
          onToggleLanguageDropdown={onToggleLanguageDropdown}
          onToggleTheme={onToggleTheme}
          onSelectLanguage={onSelectLanguage}
          onLogout={onLogout}
        />
      </div>
    </div>
  </header>
);

export default LayoutHeader;
