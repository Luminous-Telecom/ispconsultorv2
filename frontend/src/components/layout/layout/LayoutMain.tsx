import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useTheme } from 'contexts/ThemeContext';
import { useI18n } from 'contexts/I18nContext';
import { useIsMobile } from 'hooks/useMediaQuery';
import { useTableHeader } from 'contexts/TableHeaderContext';
import { useModal } from 'contexts/ModalContext';
import { useLoading } from 'contexts/LoadingContext';
import { useApiLoading } from 'hooks/useApiLoading';
import { usePlanoModulos } from 'hooks/usePlanoModulos';
import { LoadingBar } from 'components/ui';
import SingleModalWrapper from '../../common/SingleModalWrapper';
import ServerUnavailableScreen from './ServerUnavailableScreen';
import SidebarOverlay from './SidebarOverlay';
import Sidebar from './Sidebar';
import LayoutHeader from './LayoutHeader';
import MobileSearchPanel from './MobileSearchPanel';
import { useSidebarState } from './hooks/useSidebarState';
import { useLayoutMenus } from './hooks/useLayoutMenus';
import { useLayoutAuth } from './hooks/useLayoutAuth';
import { useCompanyName } from './hooks/useCompanyName';
import { useMenuItems } from './hooks/useMenuItems';

const LayoutMain: React.FC = () => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { t, language, setLanguage, availableLanguages } = useI18n();
  const isMobile = useIsMobile();
  const companyName = useCompanyName();
  const { hasModulo, isLoading: isLoadingModulos, serverUnavailable: isServerUnavailable } = usePlanoModulos();

  const { sidebarOpen, setSidebarOpen, sidebarRef } = useSidebarState(isMobile);
  const {
    showUserMenu,
    setShowUserMenu,
    showLanguageDropdown,
    setShowLanguageDropdown,
    userMenuRef,
    languageTriggerRef,
    languageDropdownRef,
  } = useLayoutMenus();
  const { currentUser, handleLogout } = useLayoutAuth(t);

  const tableHeader = useTableHeader();
  const { openModal } = useModal();
  const { isLoading } = useLoading();
  useApiLoading();

  const { handleOpenModal, sidebarFolders } = useMenuItems({
    t,
    openModal,
    hasModulo,
    userRole: currentUser?.role,
  });

  const handleSearch = (value: string) => {
    if (tableHeader.onSearchClick) {
      tableHeader.onSearchClick(value);
    } else if (location.pathname !== '/adm' && location.pathname !== '/adm/dashboard') {
      handleOpenModal('clientes');
    }
  };

  const handleSelectLanguage = (code: typeof language) => {
    if (language !== code) {
      setLanguage(code);
    }
    setShowLanguageDropdown(false);
  };

  if (isServerUnavailable) {
    return <ServerUnavailableScreen t={t} />;
  }

  return (
    <div className="app-layout">
      {isMobile && sidebarOpen && (
        <SidebarOverlay onClose={() => setSidebarOpen(false)} />
      )}

      <Sidebar
        sidebarRef={sidebarRef}
        sidebarOpen={sidebarOpen}
        companyName={companyName}
        isMobile={isMobile}
        isLoadingModulos={isLoadingModulos}
        folders={sidebarFolders}
        t={t}
        onCloseSidebar={() => setSidebarOpen(false)}
      />

      <div className="main-layout">
        <LayoutHeader
          isMobile={isMobile}
          currentUser={currentUser}
          showUserMenu={showUserMenu}
          showLanguageDropdown={showLanguageDropdown}
          theme={theme}
          language={language}
          availableLanguages={availableLanguages}
          searchValue={tableHeader.searchValue}
          setSearchValue={tableHeader.setSearchValue}
          searchPlaceholder={tableHeader.searchPlaceholder}
          searchField={tableHeader.searchField}
          setSearchField={tableHeader.setSearchField}
          availableSearchFields={tableHeader.availableSearchFields}
          userMenuRef={userMenuRef}
          languageTriggerRef={languageTriggerRef}
          languageDropdownRef={languageDropdownRef}
          t={t}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onToggleUserMenu={() => setShowUserMenu(!showUserMenu)}
          onToggleLanguageDropdown={() => setShowLanguageDropdown(!showLanguageDropdown)}
          onToggleTheme={toggleTheme}
          onSelectLanguage={handleSelectLanguage}
          onLogout={handleLogout}
          onSearch={handleSearch}
        />

        {isLoading && (
          <div className="layout-loading-bar">
            <LoadingBar />
          </div>
        )}

        {isMobile && tableHeader.showMobileSearch && tableHeader.showSearch && (
          <MobileSearchPanel
            searchValue={tableHeader.searchValue}
            setSearchValue={tableHeader.setSearchValue}
            onSearch={tableHeader.onSearchClick ?? undefined}
            searchPlaceholder={tableHeader.searchPlaceholder}
            searchField={tableHeader.searchField}
            setSearchField={tableHeader.setSearchField}
            availableSearchFields={tableHeader.availableSearchFields}
            onClose={() => tableHeader.setShowMobileSearch(false)}
            t={t}
          />
        )}

        <main className="main-content">
          <Outlet />
        </main>

        <SingleModalWrapper />
      </div>
    </div>
  );
};

export default LayoutMain;
