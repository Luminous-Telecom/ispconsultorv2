import React from 'react';
import SidebarAccordionFolder from 'components/layout/layout/SidebarAccordionFolder';
import type { SidebarFolderConfig, SidebarMenuItem, TranslateFn } from 'components/layout/layout/types';
import SaasSidebarHeader from './SaasSidebarHeader';

interface SaasSidebarProps {
  sidebarRef: React.RefObject<HTMLElement | null>;
  sidebarOpen: boolean;
  isMobile: boolean;
  folders: SidebarFolderConfig[];
  t: TranslateFn;
  onCloseSidebar: () => void;
}

const SaasSidebar: React.FC<SaasSidebarProps> = ({
  sidebarRef,
  sidebarOpen,
  isMobile,
  folders,
  t,
  onCloseSidebar,
}) => {
  const handleItemClick = (item: SidebarMenuItem) => {
    item.onClick();
    onCloseSidebar();
  };

  return (
    <aside ref={sidebarRef} className={`d-flex flex-column flex-shrink-0 sidebar ${sidebarOpen ? 'open' : ''}`}>
      <SaasSidebarHeader isMobile={isMobile} t={t} onCloseSidebar={onCloseSidebar} />

      <div className="sidebar-nav-scrollable flex-grow-1">
        <nav className="sidebar-nav nav nav-pills flex-column mb-auto px-2">
          {folders.map((folder) => (
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
          ))}
        </nav>
      </div>
    </aside>
  );
};

export default SaasSidebar;
