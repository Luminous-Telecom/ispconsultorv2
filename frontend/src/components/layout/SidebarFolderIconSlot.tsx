import React from 'react';

/** Ícone de pasta com slot fixo — troca aberto/fechado via CSS (.collapsed no botão), sem mover o texto. */
const SidebarFolderIconSlot: React.FC = () => (
  <span className="sidebar-folder-icon-slot" aria-hidden>
    <i className="bi bi-folder folder-icon folder-icon--closed" />
    <i className="bi bi-folder2-open folder-icon folder-icon--open" />
  </span>
);

export default SidebarFolderIconSlot;
