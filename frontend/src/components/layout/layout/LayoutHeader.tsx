import React from 'react';
import type { CurrentUser } from 'services/authService';
import type { Language } from 'contexts/I18nContext';
import AppLayoutHeader from '../appLayout/AppLayoutHeader';
import type { SearchFieldOption } from './LayoutSearchBar';
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
  t: TranslateFn;
  onToggleSidebar: () => void;
  onToggleUserMenu: () => void;
  onToggleLanguageDropdown: () => void;
  onToggleTheme: () => void;
  onSelectLanguage: (code: Language) => void;
  onLogout: () => void;
  onSearch: (value: string) => void;
}

const LayoutHeader: React.FC<LayoutHeaderProps> = (props) => (
  <AppLayoutHeader
    isMobile={props.isMobile}
    currentUser={props.currentUser}
    showUserMenu={props.showUserMenu}
    theme={props.theme}
    searchValue={props.searchValue}
    setSearchValue={props.setSearchValue}
    searchPlaceholder={props.searchPlaceholder}
    searchField={props.searchField}
    setSearchField={props.setSearchField}
    availableSearchFields={props.availableSearchFields}
    userMenuRef={props.userMenuRef}
    t={props.t}
    onToggleSidebar={props.onToggleSidebar}
    onToggleUserMenu={props.onToggleUserMenu}
    onToggleTheme={props.onToggleTheme}
    onLogout={props.onLogout}
    onSearch={props.onSearch}
    searchBarIdPrefix="app"
    menuAriaLabel={props.t('layout.openMenu')}
    userTitleFallback={props.t('layout.user')}
    userMenuProps={{
      showLanguage: true,
      showLanguageDropdown: props.showLanguageDropdown,
      isMobile: props.isMobile,
      language: props.language,
      availableLanguages: props.availableLanguages,
      languageTriggerRef: props.languageTriggerRef,
      languageDropdownRef: props.languageDropdownRef,
      onToggleLanguageDropdown: props.onToggleLanguageDropdown,
      onSelectLanguage: props.onSelectLanguage,
    }}
  />
);

export default LayoutHeader;
