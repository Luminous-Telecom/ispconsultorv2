import React from 'react';
import LayoutSearchBar, { type SearchFieldOption } from '../layout/LayoutSearchBar';
import AppUserMenu, { type AppUserMenuProps, type AppUserMenuUser } from './AppUserMenu';
import type { TranslateFn } from '../layout/types';

export interface AppLayoutHeaderProps {
  isMobile: boolean;
  currentUser: AppUserMenuUser | null;
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
  searchBarIdPrefix: string;
  menuAriaLabel: string;
  userTitleFallback: string;
  userMenuProps?: Partial<AppUserMenuProps>;
}

const AppLayoutHeader: React.FC<AppLayoutHeaderProps> = ({
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
  searchBarIdPrefix,
  menuAriaLabel,
  userTitleFallback,
  userMenuProps,
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
              aria-label={menuAriaLabel}
            >
              <span className="navbar-toggler-icon" />
            </button>
          )}
        </div>

        <div className="d-flex justify-content-center flex-grow-1">
          {!isMobile && (
            <LayoutSearchBar
              id={`${searchBarIdPrefix}-desktop-search`}
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
              id={`${searchBarIdPrefix}-mobile-search`}
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

        <AppUserMenu
          currentUser={currentUser}
          showUserMenu={showUserMenu}
          theme={theme}
          userMenuRef={userMenuRef}
          t={t}
          onToggleUserMenu={onToggleUserMenu}
          onToggleTheme={onToggleTheme}
          onLogout={onLogout}
          userTitleFallback={userTitleFallback}
          {...userMenuProps}
        />
      </div>
    </div>
  </header>
);

export default AppLayoutHeader;
