import React from 'react';
import SidebarFolderItemButton from '../SidebarFolderItemButton';
import SidebarFolderIconSlot from '../SidebarFolderIconSlot';
import { NavLinkButton } from 'components/ui';
import type { SidebarMenuItem, SidebarNestedFolderConfig, TranslateFn } from './types';

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
    <div className="accordion sidebar-accordion border-0" id={folder.accordionId}>
      <div className="accordion-item border-0 bg-transparent">
        <h2 className="accordion-header" id={folder.headingId}>
          <NavLinkButton
            className="accordion-button collapsed nav-link text-start w-100 d-flex align-items-center"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target={`#${folder.collapseId}`}
            aria-expanded="false"
            aria-controls={folder.collapseId}
            ariaLabel={t(folder.titleKey)}
          >
            <SidebarFolderIconSlot />
            <span>{t(folder.titleKey)}</span>
          </NavLinkButton>
        </h2>
        <div
          id={folder.collapseId}
          className="accordion-collapse collapse"
          aria-labelledby={folder.headingId}
          data-bs-parent={`#${folder.accordionId}`}
        >
          <div className="accordion-body p-0">
            {folder.items.map((item) => (
              <SidebarFolderItemButton
                key={item.id}
                item={item}
                onItemClick={() => onItemClick(item)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
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
  <div className="accordion sidebar-accordion" id={accordionId}>
    <div className="accordion-item border-0 bg-transparent">
      <h2 className="accordion-header">
        <NavLinkButton
          className="accordion-button collapsed nav-link text-start w-100 d-flex align-items-center"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target={`#${collapseId}`}
          aria-expanded="false"
          aria-controls={collapseId}
          ariaLabel={title}
        >
          <SidebarFolderIconSlot />
          <span>{title}</span>
        </NavLinkButton>
      </h2>
      <div
        id={collapseId}
        className="accordion-collapse collapse"
        aria-labelledby={headingId}
        data-bs-parent={`#${accordionId}`}
      >
        <div className="accordion-body p-0">
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
        </div>
      </div>
    </div>
  </div>
);

export default SidebarAccordionFolder;
