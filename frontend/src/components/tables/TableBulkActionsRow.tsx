import React from 'react';
import { BulkActionButton } from 'components/ui';
import { BulkAction } from './types';
import { drainPossiblePromise } from './tableUtils';

interface TableBulkActionsRowProps<T> {
  bulkActions: BulkAction<T>[];
  selectedItems: T[];
  openDropdownIndex: number | null;
  onOpenDropdownChange: (index: number | null) => void;
  hideMobilePrimaryActions?: boolean;
}

function TableBulkActionsRow<T>({
  bulkActions,
  selectedItems,
  openDropdownIndex,
  onOpenDropdownChange,
  hideMobilePrimaryActions = false,
}: TableBulkActionsRowProps<T>) {
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
          return (
            <div key={index} className="dropdown table-dropdown-relative">
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
              />
              {isOpen && (
                <ul className="dropdown-menu show">
                  {bulkAction.dropdown.map((item, itemIndex) => {
                    const isItemDisabled =
                      typeof item.disabled === 'function'
                        ? item.disabled(selectedItems)
                        : item.disabled || false;
                    return (
                      <li key={itemIndex}>
                        <button
                          type="button"
                          className="dropdown-item"
                          disabled={isItemDisabled}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!isItemDisabled) {
                              drainPossiblePromise(item.action(selectedItems));
                              onOpenDropdownChange(null);
                            }
                          }}
                        >
                          {item.label}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
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
