import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BulkActionButton, DropdownItemButton, PositionedFixed } from 'components/ui';
import { BulkAction } from './types';
import { drainPossiblePromise } from './tableUtils';

interface TableBulkActionsRowProps<T> {
  bulkActions: BulkAction<T>[];
  selectedItems: T[];
  openDropdownIndex: number | null;
  onOpenDropdownChange: (index: number | null) => void;
  hideMobilePrimaryActions?: boolean;
}

const DROPDOWN_GAP_PX = 4;
const DROPDOWN_VIEWPORT_MARGIN_PX = 8;
const DROPDOWN_FALLBACK_WIDTH_PX = 160;

function TableBulkActionsRow<T>({
  bulkActions,
  selectedItems,
  openDropdownIndex,
  onOpenDropdownChange,
  hideMobilePrimaryActions = false,
}: TableBulkActionsRowProps<T>) {
  const triggerRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const dropdownRef = useRef<HTMLUListElement | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ left: 0, top: 0 });

  const updateDropdownPosition = useCallback(() => {
    if (openDropdownIndex === null || typeof window === 'undefined') return;

    const trigger = triggerRefs.current.get(openDropdownIndex);
    if (!trigger) return;

    const triggerRect = trigger.getBoundingClientRect();
    const menuRect = dropdownRef.current?.getBoundingClientRect();
    const menuWidth = menuRect?.width || DROPDOWN_FALLBACK_WIDTH_PX;
    const menuHeight = menuRect?.height || 0;
    const maxLeft = window.innerWidth - menuWidth - DROPDOWN_VIEWPORT_MARGIN_PX;
    const left = Math.max(
      DROPDOWN_VIEWPORT_MARGIN_PX,
      Math.min(triggerRect.left, maxLeft)
    );
    const topBelow = triggerRect.bottom + DROPDOWN_GAP_PX;
    const topAbove = triggerRect.top - menuHeight - DROPDOWN_GAP_PX;
    const shouldOpenAbove =
      menuHeight > 0 && topBelow + menuHeight > window.innerHeight - DROPDOWN_VIEWPORT_MARGIN_PX;
    const top = shouldOpenAbove
      ? Math.max(DROPDOWN_VIEWPORT_MARGIN_PX, topAbove)
      : topBelow;

    setDropdownPosition((current) =>
      current.left === left && current.top === top ? current : { left, top }
    );
  }, [openDropdownIndex]);

  useLayoutEffect(() => {
    if (openDropdownIndex === null) return;

    updateDropdownPosition();
    window.addEventListener('resize', updateDropdownPosition);
    window.addEventListener('scroll', updateDropdownPosition, true);

    return () => {
      window.removeEventListener('resize', updateDropdownPosition);
      window.removeEventListener('scroll', updateDropdownPosition, true);
    };
  }, [openDropdownIndex, updateDropdownPosition]);

  return (
    <>
      {bulkActions.map((bulkAction, index) => {
        const label = bulkAction.label.toLowerCase();
        const isNewButton = label.includes('nova') || label.includes('novo');
        const isEditarButton = label.includes('editar');
        const isExcluirButton = label.includes('deletar');
        const isImprimirButton = label.includes('imprimir');
        const noSelectionRequired = bulkAction.requiresSelection === false || isNewButton || isImprimirButton;
        const isDisabledBySelection = !noSelectionRequired && selectedItems.length === 0;
        const isDisabledByCondition =
          typeof bulkAction.disabled === 'function'
            ? bulkAction.disabled(selectedItems)
            : Boolean(bulkAction.disabled);
        const isDisabled = isDisabledBySelection || isDisabledByCondition;

        if (hideMobilePrimaryActions && (isEditarButton || isNewButton || isExcluirButton)) {
          return null;
        }

        if (bulkAction.dropdown) {
          const isOpen = openDropdownIndex === index;
          const dropdownMenu =
            isOpen && typeof document !== 'undefined'
              ? createPortal(
                  <PositionedFixed
                    left={dropdownPosition.left}
                    top={dropdownPosition.top}
                    className="table-bulk-dropdown-fixed-host"
                  >
                    <ul ref={dropdownRef} className="dropdown-menu show table-bulk-dropdown-menu" role="menu">
                      {bulkAction.dropdown.map((item, itemIndex) => {
                        const isItemDisabled =
                          typeof item.disabled === 'function'
                            ? item.disabled(selectedItems)
                            : item.disabled || false;
                        return (
                          <li key={itemIndex} role="none">
                            <DropdownItemButton
                              label={item.label}
                              disabled={isItemDisabled}
                              role="menuitem"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (!isItemDisabled) {
                                  drainPossiblePromise(item.action(selectedItems));
                                  onOpenDropdownChange(null);
                                }
                              }}
                            />
                          </li>
                        );
                      })}
                    </ul>
                  </PositionedFixed>,
                  document.body
                )
              : null;

          return (
            <div
              key={index}
              ref={(element) => {
                if (element) {
                  triggerRefs.current.set(index, element);
                } else {
                  triggerRefs.current.delete(index);
                }
              }}
              className="dropdown table-dropdown-relative"
            >
              <BulkActionButton
                label={bulkAction.label}
                variant={
                  (bulkAction.variant as
                    | 'primary'
                    | 'secondary'
                    | 'success'
                    | 'danger'
                    | 'warning'
                    | 'info'
                    | 'light'
                    | 'dark') || 'primary'
                }
                dropdown
                disabled={isDisabled}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onOpenDropdownChange(isOpen ? null : index);
                }}
                aria-expanded={isOpen}
                aria-haspopup="menu"
              />
              {dropdownMenu}
            </div>
          );
        }

        return (
          <BulkActionButton
            key={index}
            label={bulkAction.label}
            variant={
              (bulkAction.variant as
                | 'primary'
                | 'secondary'
                | 'success'
                | 'danger'
                | 'warning'
                | 'info'
                | 'light'
                | 'dark') || 'primary'
            }
            disabled={isDisabled}
            onClick={() => {
              if (!isDisabled && bulkAction.onClick) {
                drainPossiblePromise(bulkAction.onClick(selectedItems));
              }
            }}
          />
        );
      })}
    </>
  );
}

export default TableBulkActionsRow;
