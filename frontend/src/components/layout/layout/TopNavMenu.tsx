import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useModal } from 'contexts/ModalContext';
import { NavLinkButton } from 'components/ui';
import { DynamicStyledElement } from 'components/ui/DynamicStyleElements';
import SidebarFolderItemButton from '../SidebarFolderItemButton';
import { findFolderPathForItem } from './sidebarFolderPath';
import { useTopNavMenu } from './hooks/useTopNavMenu';
import type {
  SidebarFolderConfig,
  SidebarMenuItem,
  SidebarNestedFolderConfig,
  TranslateFn,
} from './types';

export interface TopNavMenuProps {
  folders: SidebarFolderConfig[];
  isLoadingModulos: boolean;
  t: TranslateFn;
}

interface FlyoutPosition {
  left: number;
  top: number;
}

interface TopNavNestedFolderProps {
  folder: SidebarNestedFolderConfig;
  t: TranslateFn;
  selectedItemId: string | null;
  isOpen: boolean;
  onHoverIntent: () => void;
  onHoverLeave: () => void;
  onToggle: () => void;
  onFlyoutEnter: () => void;
  onFlyoutLeave: () => void;
  onItemClick: (item: SidebarMenuItem) => void;
}

const TopNavNestedFolder: React.FC<TopNavNestedFolderProps> = ({
  folder,
  t,
  selectedItemId,
  isOpen,
  onHoverIntent,
  onHoverLeave,
  onToggle,
  onFlyoutEnter,
  onFlyoutLeave,
  onItemClick,
}) => {
  const triggerRef = useRef<HTMLDivElement>(null);
  const [flyoutPos, setFlyoutPos] = useState<FlyoutPosition>({ left: 0, top: 0 });
  const title = t(folder.titleKey);
  const hasSelected = folder.items.some((item) => item.id === selectedItemId);

  const updateFlyoutPosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) {
      return;
    }
    const rect = el.getBoundingClientRect();
    const gap = 4;
    setFlyoutPos({
      left: Math.round(rect.right + gap),
      top: Math.round(rect.top),
    });
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }
    updateFlyoutPosition();
  }, [isOpen, updateFlyoutPosition]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const onReposition = () => updateFlyoutPosition();
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [isOpen, updateFlyoutPosition]);

  return (
    <>
      <div
        ref={triggerRef}
        className={`top-nav-menu__nested-item${isOpen ? ' top-nav-menu__nested-item--open' : ''}${hasSelected ? ' top-nav-menu__nested-item--active' : ''}`}
        onMouseEnter={onHoverIntent}
        onMouseLeave={onHoverLeave}
      >
        <NavLinkButton
          type="button"
          className="top-nav-menu__nested-trigger"
          aria-expanded={isOpen}
          aria-haspopup="true"
          ariaLabel={title}
          onClick={onToggle}
        >
          <span>{title}</span>
          <i className="bi bi-chevron-right top-nav-menu__nested-chevron" aria-hidden />
        </NavLinkButton>
      </div>

      {isOpen &&
        createPortal(
          <DynamicStyledElement
            className="top-nav-menu__flyout"
            role="menu"
            properties={{
              position: 'fixed',
              left: `${flyoutPos.left}px`,
              top: `${flyoutPos.top}px`,
              zIndex: 1080,
            }}
            deps={[flyoutPos.left, flyoutPos.top]}
            onMouseEnter={onFlyoutEnter}
            onMouseLeave={onFlyoutLeave}
          >
            {folder.items.map((item) => (
              <SidebarFolderItemButton
                key={item.id}
                item={item}
                isActive={selectedItemId === item.id}
                onItemClick={() => onItemClick(item)}
              />
            ))}
          </DynamicStyledElement>,
          document.body
        )}
    </>
  );
};

const TopNavMenu: React.FC<TopNavMenuProps> = ({ folders, isLoadingModulos, t }) => {
  const { activeModal } = useModal();
  const {
    selectedItemId,
    selectedModalId,
    isFolderOpen,
    isNestedFolderOpen,
    scheduleFolderOpen,
    cancelFolderOpen,
    scheduleNestedFolderOpen,
    scheduleNestedFolderClose,
    keepNestedFolderOpen,
    handleMenuMouseEnter,
    handleMenuMouseLeave,
    toggleFolder,
    toggleNestedFolder,
    selectItem,
    clearSelection,
  } = useTopNavMenu();

  const visibleFolders = useMemo(
    () =>
      folders.filter((folder) => {
        if (folder.requireModulosLoaded) {
          return !isLoadingModulos && folder.items.length > 0;
        }
        if (folder.accordionId === 'rpkiAccordion') {
          return folder.items.length > 0;
        }
        return true;
      }),
    [folders, isLoadingModulos]
  );

  useEffect(() => {
    if (!selectedModalId) {
      return;
    }
    if (activeModal !== selectedModalId) {
      clearSelection();
    }
  }, [activeModal, selectedModalId, clearSelection]);

  const handleItemClick = (item: SidebarMenuItem) => {
    selectItem(item.id, item.modalId);
    item.onClick();
  };

  return (
    <nav
      className="top-nav-menu"
      onMouseEnter={handleMenuMouseEnter}
      onMouseLeave={handleMenuMouseLeave}
    >
      <ul className="top-nav-menu__list">
        {visibleFolders.map((folder) => {
          const open = isFolderOpen(folder.accordionId);
          const hasSelected = Boolean(
            selectedItemId && findFolderPathForItem([folder], selectedItemId).length > 0
          );

          return (
            <li
              key={folder.accordionId}
              className={`top-nav-menu__item${open ? ' top-nav-menu__item--open' : ''}${hasSelected ? ' top-nav-menu__item--active' : ''}`}
              onMouseEnter={() => scheduleFolderOpen(folder.accordionId)}
              onMouseLeave={() => cancelFolderOpen(folder.accordionId)}
            >
              <NavLinkButton
                type="button"
                className="top-nav-menu__trigger"
                aria-expanded={open}
                aria-haspopup="true"
                ariaLabel={folder.title}
                onClick={() => toggleFolder(folder.accordionId)}
              >
                <span>{folder.title}</span>
                <i className="bi bi-chevron-down top-nav-menu__chevron" aria-hidden />
              </NavLinkButton>

              {open && (
                <div className="top-nav-menu__dropdown" role="menu">
                  {folder.items.map((item) => (
                    <SidebarFolderItemButton
                      key={item.id}
                      item={item}
                      isActive={selectedItemId === item.id}
                      onItemClick={() => handleItemClick(item)}
                    />
                  ))}
                  {folder.nestedFolders?.map((nested) =>
                    nested.items.length === 0 ? null : (
                      <TopNavNestedFolder
                        key={nested.accordionId}
                        folder={nested}
                        t={t}
                        selectedItemId={selectedItemId}
                        isOpen={isNestedFolderOpen(nested.accordionId)}
                        onHoverIntent={() => scheduleNestedFolderOpen(nested.accordionId)}
                        onHoverLeave={() => scheduleNestedFolderClose(nested.accordionId)}
                        onToggle={() => toggleNestedFolder(nested.accordionId)}
                        onFlyoutEnter={() => {
                          handleMenuMouseEnter();
                          keepNestedFolderOpen(nested.accordionId);
                        }}
                        onFlyoutLeave={() => scheduleNestedFolderClose(nested.accordionId)}
                        onItemClick={handleItemClick}
                      />
                    )
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default TopNavMenu;
