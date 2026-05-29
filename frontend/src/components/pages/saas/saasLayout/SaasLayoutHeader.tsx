import React from 'react';
import type { SaasCurrentUser } from 'services/saas/saasAuthService';
import type { SearchFieldOption } from 'components/ui/SearchBar';
import LayoutSearchBar from 'components/layout/layout/LayoutSearchBar';
import type { TranslateFn } from 'components/layout/layout/types';
import SaasUserMenu from './SaasUserMenu';

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

const SaasLayoutHeader: React.FC<SaasLayoutHeaderProps> = ({
  isMobile,
  currentUser,
  showUserMenu,
  theme,
  searchValue,
  setSearchValue,
  searchPlaceholder,
  searchField,
  setSearchField,
  availableSearchFields,
  userMenuRef,
  t,
  onToggleSidebar,
  onToggleUserMenu,
  onToggleTheme,
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
              aria-label="Abrir menu"
            >
              <span className="navbar-toggler-icon"></span>
            </button>
          )}
        </div>

        <div className="d-flex justify-content-center flex-grow-1">
          {!isMobile && (
            <LayoutSearchBar
              id="saas-desktop-search"
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
              id="saas-mobile-search"
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

        <SaasUserMenu
          currentUser={currentUser}
          showUserMenu={showUserMenu}
          theme={theme}
          userMenuRef={userMenuRef}
          t={t}
          onToggleUserMenu={onToggleUserMenu}
          onToggleTheme={onToggleTheme}
          onLogout={onLogout}
        />
      </div>
    </div>
  </header>
);

export default SaasLayoutHeader;
