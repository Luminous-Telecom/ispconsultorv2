import React from 'react';
import SidebarAccordionFolder from '../layout/SidebarAccordionFolder';
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
  const handleItemClick = (item: SidebarMenuItem) => {
    item.onClick();
    onCloseSidebar();
  };

  return (
    <aside
      ref={sidebarRef}
      className={`d-flex flex-column flex-shrink-0 sidebar ${sidebarOpen ? 'open' : ''}`}
    >
      {header}
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

export default AppSidebar;
