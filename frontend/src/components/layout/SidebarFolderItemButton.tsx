import React from 'react';
import { NavLinkButton } from 'components/ui';
import type { SidebarMenuItem } from './layout/types';

export interface SidebarFolderItemButtonProps {
  item: SidebarMenuItem;
  onItemClick: () => void;
  isActive?: boolean;
}

const SidebarFolderItemButton: React.FC<SidebarFolderItemButtonProps> = ({
  item,
  onItemClick,
  isActive = false,
}) => (
  <NavLinkButton
    className={`nav-link text-start w-100 sidebar-folder-item d-flex align-items-center${isActive ? ' active' : ''}`}
    onClick={onItemClick}
    type="button"
    ariaLabel={item.label}
    aria-current={isActive ? 'page' : undefined}
  >
    <span>{item.label}</span>
  </NavLinkButton>
);

export default SidebarFolderItemButton;
