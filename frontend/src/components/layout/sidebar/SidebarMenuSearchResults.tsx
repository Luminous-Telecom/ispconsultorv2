import React from 'react';
import SidebarFolderItemButton from '../SidebarFolderItemButton';
import SidebarFolderIconSlot from '../SidebarFolderIconSlot';
import { NavLinkButton } from 'components/ui';
import type { SidebarMenuItem, TranslateFn } from '../layout/types';
import type { SidebarMenuSearchGroup, SidebarMenuSearchNestedGroup } from './sidebarMenuSearchUtils';

interface SidebarMenuSearchNestedFolderProps {
  group: SidebarMenuSearchNestedGroup;
  t: TranslateFn;
  onItemClick: (item: SidebarMenuItem) => void;
}

const SidebarMenuSearchNestedFolder: React.FC<SidebarMenuSearchNestedFolderProps> = ({
  group,
  t,
  onItemClick,
}) => {
  const { folder, items } = group;

  return (
    <div className="accordion sidebar-accordion border-0" id={folder.accordionId}>
      <div className="accordion-item border-0 bg-transparent">
        <h2 className="accordion-header" id={folder.headingId}>
          <NavLinkButton
            type="button"
            className="accordion-button nav-link text-start w-100 d-flex align-items-center"
            aria-expanded="true"
            tabIndex={-1}
            ariaLabel={t(folder.titleKey)}
          >
            <SidebarFolderIconSlot />
            <span>{t(folder.titleKey)}</span>
          </NavLinkButton>
        </h2>
        <div
          id={folder.collapseId}
          className="accordion-collapse collapse show"
          aria-labelledby={folder.headingId}
        >
          <div className="accordion-body p-0">
            {items.map((item) => (
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

interface SidebarMenuSearchFolderProps {
  group: SidebarMenuSearchGroup;
  t: TranslateFn;
  onItemClick: (item: SidebarMenuItem) => void;
}

const SidebarMenuSearchFolder: React.FC<SidebarMenuSearchFolderProps> = ({
  group,
  t,
  onItemClick,
}) => {
  const { folder, directItems, nestedGroups } = group;

  return (
    <div className="accordion sidebar-accordion" id={folder.accordionId}>
      <div className="accordion-item border-0 bg-transparent">
        <h2 className="accordion-header" id={folder.headingId}>
          <NavLinkButton
            type="button"
            className="accordion-button nav-link text-start w-100 d-flex align-items-center"
            aria-expanded="true"
            tabIndex={-1}
            ariaLabel={folder.title}
          >
            <SidebarFolderIconSlot />
            <span>{folder.title}</span>
          </NavLinkButton>
        </h2>
        <div
          id={folder.collapseId}
          className="accordion-collapse collapse show"
          aria-labelledby={folder.headingId}
        >
          <div className="accordion-body p-0">
            {directItems.map((item) => (
              <SidebarFolderItemButton
                key={item.id}
                item={item}
                onItemClick={() => onItemClick(item)}
              />
            ))}
            {nestedGroups.map((nestedGroup) => (
              <SidebarMenuSearchNestedFolder
                key={nestedGroup.folder.accordionId}
                group={nestedGroup}
                t={t}
                onItemClick={onItemClick}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

interface SidebarMenuSearchResultsProps {
  groups: SidebarMenuSearchGroup[];
  emptyMessage: string;
  t: TranslateFn;
  onItemClick: (item: SidebarMenuItem) => void;
}

const SidebarMenuSearchResults: React.FC<SidebarMenuSearchResultsProps> = ({
  groups,
  emptyMessage,
  t,
  onItemClick,
}) => {
  if (groups.length === 0) {
    return (
      <p className="sidebar-menu-search-empty text-muted small mb-0 px-2 py-2">
        {emptyMessage}
      </p>
    );
  }

  return (
    <>
      {groups.map((group) => (
        <SidebarMenuSearchFolder
          key={group.folder.accordionId}
          group={group}
          t={t}
          onItemClick={onItemClick}
        />
      ))}
    </>
  );
};

export default SidebarMenuSearchResults;
