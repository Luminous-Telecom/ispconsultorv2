import React from 'react';
import SidebarFolderItemButton from '../SidebarFolderItemButton';
import SidebarFolderIconSlot from '../SidebarFolderIconSlot';
import { NavLinkButton } from 'components/ui';
import type { SidebarMenuItem, SidebarNestedFolderConfig, TranslateFn } from './types';

interface SidebarFolderShellProps {
  accordionId: string;
  collapseId: string;
  headingId: string;
  title: string;
  borderless?: boolean;
  isOpen: boolean;
  onHoverIntent: () => void;
  onHoverCancel: () => void;
  onToggle: () => void;
  children: React.ReactNode;
}

/** Pasta controlada pelo menu: hover abre; fechamento só ao sair do lateral. */
const SidebarFolderShell: React.FC<SidebarFolderShellProps> = ({
  accordionId,
  collapseId,
  headingId,
  title,
  borderless = false,
  isOpen,
  onHoverIntent,
  onHoverCancel,
  onToggle,
  children,
}) => (
  <div
    className={`accordion sidebar-accordion${borderless ? ' border-0' : ''}`}
    id={accordionId}
  >
    <div
      className="accordion-item border-0 bg-transparent"
      onMouseEnter={onHoverIntent}
      onMouseLeave={onHoverCancel}
    >
      <h2 className="accordion-header" id={headingId}>
        <NavLinkButton
          className={`accordion-button${isOpen ? '' : ' collapsed'} nav-link text-start w-100 d-flex align-items-center`}
          type="button"
          aria-expanded={isOpen}
          aria-controls={collapseId}
          ariaLabel={title}
          onClick={onToggle}
        >
          <SidebarFolderIconSlot />
          <span>{title}</span>
        </NavLinkButton>
      </h2>
      <div
        id={collapseId}
        className={`accordion-collapse collapse${isOpen ? ' show' : ''}`}
        aria-labelledby={headingId}
      >
        <div className="accordion-body p-0">{children}</div>
      </div>
    </div>
  </div>
);

interface SidebarNestedFolderProps {
  folder: SidebarNestedFolderConfig;
  parentFolderId: string;
  t: TranslateFn;
  isOpen: boolean;
  selectedItemId: string | null;
  onHoverIntent: () => void;
  onHoverCancel: () => void;
  onToggle: () => void;
  onItemClick: (item: SidebarMenuItem, folderPath: string[]) => void;
}

const SidebarNestedFolder: React.FC<SidebarNestedFolderProps> = ({
  folder,
  parentFolderId,
  t,
  isOpen,
  selectedItemId,
  onHoverIntent,
  onHoverCancel,
  onToggle,
  onItemClick,
}) => {
  if (folder.items.length === 0) {
    return null;
  }

  const folderPath = [parentFolderId, folder.accordionId];

  return (
    <SidebarFolderShell
      accordionId={folder.accordionId}
      collapseId={folder.collapseId}
      headingId={folder.headingId}
      title={t(folder.titleKey)}
      borderless
      isOpen={isOpen}
      onHoverIntent={onHoverIntent}
      onHoverCancel={onHoverCancel}
      onToggle={onToggle}
    >
      {folder.items.map((item) => (
        <SidebarFolderItemButton
          key={item.id}
          item={item}
          isActive={selectedItemId === item.id}
          onItemClick={() => onItemClick(item, folderPath)}
        />
      ))}
    </SidebarFolderShell>
  );
};

interface SidebarAccordionFolderProps {
  accordionId: string;
  collapseId: string;
  headingId: string;
  title: string;
  items: SidebarMenuItem[];
  nestedFolders?: SidebarNestedFolderConfig[];
  t: TranslateFn;
  isOpen: boolean;
  selectedItemId: string | null;
  isNestedOpen: (folderId: string) => boolean;
  onHoverIntent: (folderId: string) => void;
  onHoverCancel: (folderId: string) => void;
  onToggle: (folderId: string) => void;
  onItemClick: (item: SidebarMenuItem, folderPath: string[]) => void;
}

const SidebarAccordionFolder: React.FC<SidebarAccordionFolderProps> = ({
  accordionId,
  collapseId,
  headingId,
  title,
  items,
  nestedFolders,
  t,
  isOpen,
  selectedItemId,
  isNestedOpen,
  onHoverIntent,
  onHoverCancel,
  onToggle,
  onItemClick,
}) => (
  <SidebarFolderShell
    accordionId={accordionId}
    collapseId={collapseId}
    headingId={headingId}
    title={title}
    isOpen={isOpen}
    onHoverIntent={() => onHoverIntent(accordionId)}
    onHoverCancel={() => onHoverCancel(accordionId)}
    onToggle={() => onToggle(accordionId)}
  >
    {items.map((item) => (
      <SidebarFolderItemButton
        key={item.id}
        item={item}
        isActive={selectedItemId === item.id}
        onItemClick={() => onItemClick(item, [accordionId])}
      />
    ))}
    {nestedFolders?.map((folder) => (
      <SidebarNestedFolder
        key={folder.accordionId}
        folder={folder}
        parentFolderId={accordionId}
        t={t}
        isOpen={isNestedOpen(folder.accordionId)}
        selectedItemId={selectedItemId}
        onHoverIntent={() => onHoverIntent(folder.accordionId)}
        onHoverCancel={() => onHoverCancel(folder.accordionId)}
        onToggle={() => onToggle(folder.accordionId)}
        onItemClick={onItemClick}
      />
    ))}
  </SidebarFolderShell>
);

export default SidebarAccordionFolder;
