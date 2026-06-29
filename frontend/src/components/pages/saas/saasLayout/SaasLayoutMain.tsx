import React from 'react';
import { Outlet } from 'react-router-dom';
import { useTheme } from 'contexts/ThemeContext';
import { useI18n } from 'contexts/I18nContext';
import { useIsMobile } from 'hooks/useMediaQuery';
import { useTableHeader } from 'contexts/TableHeaderContext';
import { useModal } from 'contexts/ModalContext';
import { useLoading } from 'contexts/LoadingContext';
import { useApiLoading } from 'hooks/useApiLoading';
import { LoadingBar } from 'components/ui';
import SingleModalWrapper from 'components/common/SingleModalWrapper';
import SidebarOverlay from 'components/layout/layout/SidebarOverlay';
import { useSidebarState } from 'components/layout/layout/hooks/useSidebarState';
import SaasSidebar from './SaasSidebar';
import SaasLayoutHeader from './SaasLayoutHeader';
import { useSaasLayoutAuth } from './hooks/useSaasLayoutAuth';
import { useSaasUserMenu } from './hooks/useSaasUserMenu';
import { useSaasMenuItems } from './hooks/useSaasMenuItems';

const SaasLayoutMain: React.FC = () => {
  const { t } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const isMobile = useIsMobile();
  const tableHeader = useTableHeader();
  const { openModal } = useModal();
  const { isLoading } = useLoading();

  const { currentUser, authLoading, handleLogout } = useSaasLayoutAuth();
  const { sidebarOpen, setSidebarOpen, sidebarRef } = useSidebarState(isMobile);
  const { showUserMenu, setShowUserMenu, userMenuRef } = useSaasUserMenu();
  const { sidebarFolders } = useSaasMenuItems({ t, openModal });

  useApiLoading();

  const handleSearch = (value: string) => {
    tableHeader.onSearchClick?.(value);
  };

  if (authLoading) return null;

  return (
    <div className="app-layout">
      {isMobile && sidebarOpen && (
        <SidebarOverlay onClose={() => setSidebarOpen(false)} />
      )}

      <SaasSidebar
        sidebarRef={sidebarRef}
        sidebarOpen={sidebarOpen}
        isMobile={isMobile}
        folders={sidebarFolders}
        t={t}
        onCloseSidebar={() => setSidebarOpen(false)}
      />

      <div className="main-layout">
        <SaasLayoutHeader
          isMobile={isMobile}
          currentUser={currentUser}
          showUserMenu={showUserMenu}
          theme={theme}
          searchValue={tableHeader.searchValue}
          setSearchValue={tableHeader.setSearchValue}
          searchPlaceholder={tableHeader.searchPlaceholder}
          searchField={tableHeader.searchField}
          setSearchField={tableHeader.setSearchField}
          availableSearchFields={tableHeader.availableSearchFields}
          userMenuRef={userMenuRef}
          t={t}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onToggleUserMenu={() => setShowUserMenu(!showUserMenu)}
          onToggleTheme={toggleTheme}
          onLogout={handleLogout}
          onSearch={handleSearch}
        />

        {isLoading && (
          <div className="layout-loading-bar">
            <LoadingBar />
          </div>
        )}

        <main className="main-content">
          <Outlet />
        </main>

        <SingleModalWrapper />
      </div>
    </div>
  );
};

export default SaasLayoutMain;
