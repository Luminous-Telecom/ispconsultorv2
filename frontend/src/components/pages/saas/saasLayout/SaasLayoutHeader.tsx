import React from 'react';
import type { SaasCurrentUser } from 'services/saas/saasAuthService';
import type { SearchFieldOption } from 'components/ui/SearchBar';
import AppLayoutHeader from 'components/layout/appLayout/AppLayoutHeader';
import type { TranslateFn } from 'components/layout/layout/types';

interface SaasLayoutHeaderProps {
  isMobile: boolean;
  currentUser: SaasCurrentUser | null;
  showUserMenu: boolean;
  theme: string;
  searchValue: string;
  setSearchValue: (value: string) => void;
  searchPlaceholder?: string;
  searchField?: string;
  setSearchField?: (field: string) => void;
  availableSearchFields?: SearchFieldOption[];
  userMenuRef: React.RefObject<HTMLDivElement | null>;
  t: TranslateFn;
  onToggleSidebar: () => void;
  onToggleUserMenu: () => void;
  onToggleTheme: () => void;
  onLogout: () => void;
  onSearch: (value: string) => void;
}

const SaasLayoutHeader: React.FC<SaasLayoutHeaderProps> = (props) => (
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
    searchBarIdPrefix="saas"
    menuAriaLabel="Abrir menu"
    userTitleFallback="SaaS"
  />
);

export default SaasLayoutHeader;
