import React from 'react';
import AppSidebar from 'components/layout/appLayout/AppSidebar';
import type { SidebarFolderConfig, TranslateFn } from 'components/layout/layout/types';
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
}) => (
  <AppSidebar
    sidebarRef={sidebarRef}
    sidebarOpen={sidebarOpen}
    folders={folders}
    t={t}
    onCloseSidebar={onCloseSidebar}
    header={<SaasSidebarHeader isMobile={isMobile} t={t} onCloseSidebar={onCloseSidebar} />}
  />
);

export default SaasSidebar;
