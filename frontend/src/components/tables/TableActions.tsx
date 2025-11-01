import React from 'react';
import { TableAction, BulkAction } from './types';
import Button from '../ui/Button';

interface TableActionsProps<T = Record<string, unknown>> {
  item?: T;
  index?: number;
  actions?: TableAction<T>[];
  bulkActions?: BulkAction<T>[];
  selectedItems?: T[];
  onActionClick?: (action: TableAction<T>, item: T, index: number) => void;
  onBulkActionClick?: (action: BulkAction<T>, selectedItems: T[]) => void;
  className?: string;
}

const TableActions = <T extends { id: number | string }>({
  item,
  index = 0,
  actions = [],
  bulkActions = [],
  selectedItems = [],
  onActionClick,
  onBulkActionClick,
  className = '',
}: TableActionsProps<T>) => {
  // Renderizar ações individuais
  const renderItemActions = () => {
    if (!item || actions.length === 0) return null;

    const visibleActions = actions.filter(action => {
      if (action.hidden === true) return false;
      if (typeof action.hidden === 'function') {
        return !action.hidden(item);
      }
      return true;
    });

    if (visibleActions.length === 0) return null;

    return (
      <div className="table-actions d-flex gap-1">
        {visibleActions.map((action) => {
          const isDisabled = typeof action.disabled === 'function' 
            ? action.disabled(item) 
            : action.disabled;

          return (
            <Button
              key={action.key}
              variant={action.variant || 'outline-secondary'}
              size="sm"
              icon={action.icon}
              disabled={isDisabled}
              onClick={() => {
                if (action.confirm) {
                  // TODO: Implementar modal de confirmação
                  if (window.confirm(action.confirm.message)) {
                    onActionClick?.(action, item, index);
                  }
                } else {
                  onActionClick?.(action, item, index);
                }
              }}
              tooltip={action.label}
            >
              {action.label}
            </Button>
          );
        })}
      </div>
    );
  };

  // Renderizar ações em massa
  const renderBulkActions = () => {
    if (bulkActions.length === 0 || selectedItems.length === 0) return null;

    const visibleBulkActions = bulkActions.filter(action => {
      if (action.hidden === true) return false;
      if (typeof action.hidden === 'function') {
        return !action.hidden(selectedItems);
      }
      return true;
    });

    if (visibleBulkActions.length === 0) return null;

    return (
      <div className="bulk-actions d-flex gap-2 align-items-center">
        <span className="text-muted small">
          {selectedItems.length} item(s) selecionado(s)
        </span>
        
        {visibleBulkActions.map((action) => {
          const isDisabled = typeof action.disabled === 'function' 
            ? action.disabled(selectedItems) 
            : action.disabled;

          return (
            <Button
              key={action.key}
              variant={action.variant || 'primary'}
              size="sm"
              icon={action.icon}
              disabled={isDisabled}
              onClick={() => {
                if (action.confirm) {
                  // TODO: Implementar modal de confirmação
                  if (window.confirm(action.confirm.message)) {
                    onBulkActionClick?.(action, selectedItems);
                  }
                } else {
                  onBulkActionClick?.(action, selectedItems);
                }
              }}
            >
              {action.label}
            </Button>
          );
        })}
      </div>
    );
  };

  // Se não há ações para renderizar
  if ((!item || actions.length === 0) && (bulkActions.length === 0 || selectedItems.length === 0)) {
    return null;
  }

  return (
    <div className={`table-actions-container ${className}`}>
      {renderItemActions()}
      {renderBulkActions()}
    </div>
  );
};

export default TableActions;
