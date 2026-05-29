import type { MouseEvent } from 'react';

/** Alterna ícone de pasta no accordion da sidebar após o collapse do Bootstrap. */
export function handleSidebarAccordionFolderIconClick(event: MouseEvent<HTMLButtonElement>) {
  const button = event.currentTarget;
  const folderIcon = button.querySelector('.folder-icon');
  window.setTimeout(() => {
    if (!folderIcon) return;
    if (button.classList.contains('collapsed')) {
      folderIcon.className = 'bi bi-folder folder-icon me-2';
    } else {
      folderIcon.className = 'bi bi-folder2-open folder-icon me-2';
    }
  }, 10);
}
