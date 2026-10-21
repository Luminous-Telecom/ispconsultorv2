import React, { useEffect, useMemo, useState } from 'react';
import { useModal } from 'contexts/ModalContext';
import SidebarAccordionFolder from '../layout/SidebarAccordionFolder';
import SidebarMenuSearch from '../sidebar/SidebarMenuSearch';
import SidebarMenuSearchResults from '../sidebar/SidebarMenuSearchResults';
import { buildSearchMenuGroups } from '../sidebar/sidebarMenuSearchUtils';
import { useSidebarFolderHover } from '../layout/hooks/useSidebarFolderHover';
import { findFolderPathForItem } from '../layout/sidebarFolderPath';
import type { SidebarFolderConfig, SidebarMenuItem, TranslateFn } from '../layout/types';

export interface AppSidebarProps {
  sidebarRef: React.RefObject<HTMLElement | null>;
  sidebarOpen: boolean;
  folders: SidebarFolderConfig[];
  t: TranslateFn;
  onCloseSidebar: () => void;
  header: React.ReactNode;
  shouldRenderFolder?: (folder: SidebarFolderConfig) => boolean;
}

const defaultShouldRenderFolder = () => true;

const AppSidebar: React.FC<AppSidebarProps> = ({
  sidebarRef,
  sidebarOpen,
  folders,
  t,
  onCloseSidebar,
  header,
  shouldRenderFolder = defaultShouldRenderFolder,
}) => {
  const { activeModal } = useModal();
  const [menuSearch, setMenuSearch] = useState('');
  const isSearching = menuSearch.trim().length > 0;
  const {
    selectedItemId,
    selectedModalId,
    isFolderOpen,
    toggleFolder,
    selectItem,
    clearSelection,
  } = useSidebarFolderHover();

  const visibleFolders = useMemo(
    () => folders.filter(shouldRenderFolder),
    [folders, shouldRenderFolder]
  );

  const searchGroups = useMemo(
    () => buildSearchMenuGroups(visibleFolders, menuSearch, t),
    [visibleFolders, menuSearch, t]
  );

  useEffect(() => {
    if (!selectedModalId) {
      return;
    }
    if (activeModal !== selectedModalId) {
      clearSelection();
    }
  }, [activeModal, selectedModalId, clearSelection]);

  const handleItemClick = (item: SidebarMenuItem, folderPath?: string[]) => {
    const path = folderPath ?? findFolderPathForItem(visibleFolders, item.id);
    selectItem(item.id, item.modalId, path);
    item.onClick();
    setMenuSearch('');
    onCloseSidebar();
  };

  return (
    <aside
      ref={sidebarRef}
      className={`d-flex flex-column flex-shrink-0 sidebar ${sidebarOpen ? 'open' : ''}`}
    >
      <div className="sidebar-header-fixed d-flex flex-column">
        {header}
        <SidebarMenuSearch
          value={menuSearch}
          onChange={setMenuSearch}
          placeholder={t('layout.sidebarMenuSearchPlaceholder')}
        />
      </div>
      <div className={`sidebar-nav-scrollable flex-grow-1${isSearching ? ' sidebar-nav-scrollable--searching' : ''}`}>
        <nav className="sidebar-nav nav nav-pills flex-column mb-auto px-2">
          {isSearching ? (
            <SidebarMenuSearchResults
              groups={searchGroups}
              emptyMessage={t('layout.sidebarMenuSearchEmpty')}
              t={t}
              onItemClick={(item) => handleItemClick(item)}
            />
          ) : (
            visibleFolders.map((folder) => (
              <SidebarAccordionFolder
                key={folder.accordionId}
                accordionId={folder.accordionId}
                collapseId={folder.collapseId}
                headingId={folder.headingId}
                title={folder.title}
                items={folder.items}
                nestedFolders={folder.nestedFolders}
                t={t}
                isOpen={isFolderOpen(folder.accordionId)}
                selectedItemId={selectedItemId}
                isNestedOpen={isFolderOpen}
                onToggle={toggleFolder}
                onItemClick={handleItemClick}
              />
            ))
          )}
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;
