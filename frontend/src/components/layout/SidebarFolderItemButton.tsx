import React from 'react';
import { NavLinkButton } from 'components/ui';
import type { SidebarMenuItem } from './layout/types';

export interface SidebarFolderItemButtonProps {
  item: SidebarMenuItem;
  onItemClick: () => void;
}

const SidebarFolderItemButton: React.FC<SidebarFolderItemButtonProps> = ({ item, onItemClick }) => (
  <NavLinkButton
    className="nav-link text-start w-100 sidebar-folder-item d-flex align-items-center"
    onClick={onItemClick}
    type="button"
    ariaLabel={item.label}
  >
    <span>{item.label}</span>
  </NavLinkButton>
);

export default SidebarFolderItemButton;
