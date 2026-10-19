import React from 'react';
import LayoutSidebarHeader from '../LayoutSidebarHeader';
import AppSidebar from '../appLayout/AppSidebar';
import type { SidebarFolderConfig, SidebarMenuItem, TranslateFn } from './types';
import { isMenuFolderVisible } from './utils';

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
  const shouldRenderFolder = (folder: SidebarFolderConfig): boolean =>
    isMenuFolderVisible(folder, isLoadingModulos);

  return (
    <AppSidebar
      sidebarRef={sidebarRef}
      sidebarOpen={sidebarOpen}
      folders={folders}
      t={t}
      onCloseSidebar={onCloseSidebar}
      shouldRenderFolder={shouldRenderFolder}
      header={
        <LayoutSidebarHeader
          companyName={companyName}
          isMobile={isMobile}
          onCloseSidebar={onCloseSidebar}
        />
      }
    />
  );
};

export type { SidebarMenuItem };

export default Sidebar;
