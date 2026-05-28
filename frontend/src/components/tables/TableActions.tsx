import React, { useMemo, useCallback } from 'react';
import { TableAction, BulkAction } from './types';
import { BulkActionButton } from '../ui';

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
  // Memoizar ações visíveis para evitar recálculo desnecessário
  const visibleActions = useMemo(() => {
    if (!item || actions.length === 0) return [];
    
    return actions.filter(action => {
      if (action.hidden === true) return false;
      if (typeof action.hidden === 'function') {
        return !action.hidden(item);
      }
      return true;
    });
  }, [item, actions]);

  const visibleBulkActions = useMemo(() => {
    if (bulkActions.length === 0 || selectedItems.length === 0) return [];
    
    return bulkActions.filter(action => {
      if (action.hidden === true) return false;
      if (typeof action.hidden === 'function') {
        return !action.hidden(selectedItems);
      }
      return true;
    });
  }, [bulkActions, selectedItems]);

  // Callback memoizado para ações individuais
  const handleActionClick = useCallback(async (action: TableAction<T>) => {
    if (!item || index === undefined) return;
    
    if (action.confirm) {
      const msg = action.confirm.title ? `${action.confirm.title}\n\n${action.confirm.message}` : action.confirm.message;
      const confirmed = window.confirm(msg);
      if (confirmed) {
        onActionClick?.(action, item, index);
      }
    } else {
      onActionClick?.(action, item, index);
    }
  }, [item, index, onActionClick]);

  // Callback memoizado para ações em massa
  const handleBulkActionClick = useCallback(async (action: BulkAction<T>) => {
    if (action.confirm) {
      const msg = action.confirm.title ? `${action.confirm.title}\n\n${action.confirm.message}` : action.confirm.message;
      const confirmed = window.confirm(msg);
      if (confirmed) {
        onBulkActionClick?.(action, selectedItems);
      }
    } else {
      onBulkActionClick?.(action, selectedItems);
    }
  }, [selectedItems, onBulkActionClick]);

  // Renderizar ações individuais
  const renderItemActions = () => {
    if (visibleActions.length === 0) return null;

    return (
      <div className="table-actions d-flex gap-1">
        {visibleActions.map((action) => {
          const isDisabled = typeof action.disabled === 'function' 
            ? action.disabled(item!) 
            : action.disabled;

          return (
            <BulkActionButton
              key={action.key}
              label={action.label}
              variant={
                (action.variant as 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark') ||
                'secondary'
              }
              disabled={isDisabled}
              onClick={() => handleActionClick(action)}
              title={action.label}
            />
          );
        })}
      </div>
    );
  };

  // Renderizar ações em massa
  const renderBulkActions = () => {
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
            <BulkActionButton
              key={action.key}
              label={action.label}
              variant={
                (action.variant as 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark') || 'primary'
              }
              disabled={isDisabled}
              onClick={() => handleBulkActionClick(action)}
            />
          );
        })}
      </div>
    );
  };

  // Se não há ações para renderizar
  if ((!item || visibleActions.length === 0) && (visibleBulkActions.length === 0)) {
    return null;
  }

  return (
    <div className={`table-actions-container ${className}`}>
      {renderItemActions()}
      {renderBulkActions()}
    </div>
  );
};

// Memoizar componente para evitar re-renderizações desnecessárias
export default React.memo(TableActions) as typeof TableActions;
