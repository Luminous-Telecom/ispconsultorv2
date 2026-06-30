import type { MouseEvent } from 'react';
import { SIDEBAR_FOLDER_ICON_CLOSED, SIDEBAR_FOLDER_ICON_OPEN } from './sidebarFolderIcons';

/** Alterna ícone de pasta no accordion da sidebar após o collapse do Bootstrap. */
export function handleSidebarAccordionFolderIconClick(event: MouseEvent<HTMLButtonElement>) {
  const button = event.currentTarget;
  const folderIcon = button.querySelector('.folder-icon');
  window.setTimeout(() => {
    if (!folderIcon) return;
    if (button.classList.contains('collapsed')) {
      folderIcon.className = SIDEBAR_FOLDER_ICON_CLOSED;
    } else {
      folderIcon.className = SIDEBAR_FOLDER_ICON_OPEN;
    }
  }, 10);
}
