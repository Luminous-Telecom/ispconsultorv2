import React from 'react';
import { AppMenuDropdown, BulkActionButton } from 'components/ui';
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

        const variant =
          (bulkAction.variant as
            | 'primary'
            | 'secondary'
            | 'success'
            | 'danger'
            | 'warning'
            | 'info'
            | 'light'
            | 'dark') || 'primary';

        if (bulkAction.dropdown) {
          const isOpen = openDropdownIndex === index;
          return (
            <AppMenuDropdown
              key={index}
              open={isOpen}
              onOpenChange={(nextOpen) => onOpenDropdownChange(nextOpen ? index : null)}
              align="start"
              trigger={
                <BulkActionButton
                  label={bulkAction.label}
                  variant={variant}
                  dropdown
                  disabled={isDisabled}
                />
              }
              items={bulkAction.dropdown.map((item, itemIndex) => {
                const isItemDisabled =
                  typeof item.disabled === 'function'
                    ? item.disabled(selectedItems)
                    : item.disabled || false;
                return {
                  key: `${itemIndex}-${item.label}`,
                  label: item.label,
                  disabled: isItemDisabled,
                  onClick: () => {
                    drainPossiblePromise(item.action(selectedItems));
                  },
                };
              })}
            />
          );
        }

        return (
          <BulkActionButton
            key={index}
            label={bulkAction.label}
            variant={variant}
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
