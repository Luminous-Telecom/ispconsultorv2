import React from 'react';
import SidebarFolderItemBullet from './SidebarFolderItemBullet';
import type { SidebarMenuItem } from './layout/types';

interface SidebarFolderItemButtonProps {
  item: SidebarMenuItem;
  onItemClick: () => void;
}

const SidebarFolderItemButton: React.FC<SidebarFolderItemButtonProps> = ({ item, onItemClick }) => (
  <button
    className="nav-link text-start w-100 sidebar-folder-item d-flex align-items-center"
    onClick={onItemClick}
    type="button"
  >
    <SidebarFolderItemBullet />
    <span>{item.label}</span>
  </button>
);

export default SidebarFolderItemButton;
