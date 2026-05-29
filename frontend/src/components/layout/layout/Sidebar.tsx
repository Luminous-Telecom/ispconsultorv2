import React from 'react';
import LayoutSidebarHeader from '../LayoutSidebarHeader';
import SidebarAccordionFolder from './SidebarAccordionFolder';
import type { SidebarFolderConfig, SidebarMenuItem, TranslateFn } from './types';

interface SidebarProps {
  sidebarRef: React.RefObject<HTMLElement | null>;
  sidebarOpen: boolean;
  companyName: string;
  isMobile: boolean;
  isLoadingModulos: boolean;
  folders: SidebarFolderConfig[];
  t: TranslateFn;
  onCloseSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  sidebarRef,
  sidebarOpen,
  companyName,
  isMobile,
  isLoadingModulos,
  folders,
  t,
  onCloseSidebar,
}) => {
  const handleItemClick = (item: SidebarMenuItem) => {
    item.onClick();
    onCloseSidebar();
  };

  const shouldRenderFolder = (folder: SidebarFolderConfig): boolean => {
    if (folder.requireModulosLoaded) {
      return !isLoadingModulos && folder.items.length > 0;
    }
    if (folder.accordionId === 'rpkiAccordion') {
      return folder.items.length > 0;
    }
    return true;
  };

  return (
    <aside
      ref={sidebarRef}
      className={`d-flex flex-column flex-shrink-0 sidebar ${sidebarOpen ? 'open' : ''}`}
    >
      <LayoutSidebarHeader
        companyName={companyName}
        isMobile={isMobile}
        onCloseSidebar={onCloseSidebar}
      />

      <div className="sidebar-nav-scrollable flex-grow-1">
        <nav className="sidebar-nav nav nav-pills flex-column mb-auto px-2">
          {folders.map((folder) =>
            shouldRenderFolder(folder) ? (
              <SidebarAccordionFolder
                key={folder.accordionId}
                accordionId={folder.accordionId}
                collapseId={folder.collapseId}
                headingId={folder.headingId}
                title={folder.title}
                items={folder.items}
                nestedFolders={folder.nestedFolders}
                t={t}
                onItemClick={handleItemClick}
              />
            ) : null
          )}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
