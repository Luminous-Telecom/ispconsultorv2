import React, { useState } from 'react';
import SidebarFolderItemButton from '../SidebarFolderItemButton';
import SidebarFolderIconSlot from '../SidebarFolderIconSlot';
import { NavLinkButton } from 'components/ui';
import { usePrefersRealHover } from 'hooks/usePrefersRealHover';
import type { SidebarMenuItem, SidebarNestedFolderConfig, TranslateFn } from './types';

interface SidebarFolderShellProps {
  accordionId: string;
  collapseId: string;
  headingId: string;
  title: string;
  borderless?: boolean;
  children: React.ReactNode;
}

/** Pasta do menu: no desktop abre ao passar o mouse; no touch continua por clique. */
const SidebarFolderShell: React.FC<SidebarFolderShellProps> = ({
  accordionId,
  collapseId,
  headingId,
  title,
  borderless = false,
  children,
}) => {
  const prefersHover = usePrefersRealHover();
  const [isOpen, setIsOpen] = useState(false);

  const handleMouseEnter = () => {
    if (prefersHover) {
      setIsOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (prefersHover) {
      setIsOpen(false);
    }
  };

  const handleToggleClick = () => {
    if (prefersHover) {
      return;
    }
    setIsOpen((open) => !open);
  };

  return (
    <div
      className={`accordion sidebar-accordion${borderless ? ' border-0' : ''}`}
      id={accordionId}
    >
      <div
        className="accordion-item border-0 bg-transparent"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <h2 className="accordion-header" id={headingId}>
          <NavLinkButton
            className={`accordion-button${isOpen ? '' : ' collapsed'} nav-link text-start w-100 d-flex align-items-center`}
            type="button"
            aria-expanded={isOpen}
            aria-controls={collapseId}
            ariaLabel={title}
            onClick={handleToggleClick}
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
};

interface SidebarNestedFolderProps {
  folder: SidebarNestedFolderConfig;
  t: TranslateFn;
  onItemClick: (item: SidebarMenuItem) => void;
}

const SidebarNestedFolder: React.FC<SidebarNestedFolderProps> = ({ folder, t, onItemClick }) => {
  if (folder.items.length === 0) {
    return null;
  }

  return (
    <SidebarFolderShell
      accordionId={folder.accordionId}
      collapseId={folder.collapseId}
      headingId={folder.headingId}
      title={t(folder.titleKey)}
      borderless
    >
      {folder.items.map((item) => (
        <SidebarFolderItemButton
          key={item.id}
          item={item}
          onItemClick={() => onItemClick(item)}
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
  onItemClick: (item: SidebarMenuItem) => void;
}

const SidebarAccordionFolder: React.FC<SidebarAccordionFolderProps> = ({
  accordionId,
  collapseId,
  headingId,
  title,
  items,
  nestedFolders,
  t,
  onItemClick,
}) => (
  <SidebarFolderShell
    accordionId={accordionId}
    collapseId={collapseId}
    headingId={headingId}
    title={title}
  >
    {items.map((item) => (
      <SidebarFolderItemButton
        key={item.id}
        item={item}
        onItemClick={() => onItemClick(item)}
      />
    ))}
    {nestedFolders?.map((folder) => (
      <SidebarNestedFolder
        key={folder.accordionId}
        folder={folder}
        t={t}
        onItemClick={onItemClick}
      />
    ))}
  </SidebarFolderShell>
);

export default SidebarAccordionFolder;
