import React from 'react';

interface BulkAction {
  label: string;
  action: (selectedItems: any[]) => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'info';
  disabled?: (selectedItems: any[]) => boolean;
}

interface ModalHeaderActionsProps {
  bulkActions: BulkAction[];
  selectedItems: any[];
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  limit: number;
  onLimitChange: (limit: number) => void;
  pagination?: {
    from: number;
    to: number;
    total: number;
    current_page: number;
    last_page: number;
  };
  onPageChange: (page: number) => void;
  onRefresh?: () => void;
  idPrefix?: string;
}

const ModalHeaderActions: React.FC<ModalHeaderActionsProps> = ({
  bulkActions,
  selectedItems
}) => {
  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      {/* Apenas botões de ação em massa */}
      {bulkActions.map((bulkAction, index) => {
        const isNewButton = bulkAction.label.toLowerCase().includes('nova') || bulkAction.label.toLowerCase().includes('novo');
        const isDisabledBySelection = !isNewButton && selectedItems.length === 0;
        const isDisabledByCondition = bulkAction.disabled ? bulkAction.disabled(selectedItems) : false;
        const isDisabled = isDisabledBySelection || isDisabledByCondition;
        
        return (
          <button
            key={index}
            className={`btn btn-sm btn-${bulkAction.variant || 'primary'}`}
            onClick={() => {
              if (!isDisabled) {
                bulkAction.action(selectedItems);
              }
            }}
            disabled={isDisabled}
            style={{ flexShrink: 0 }}
          >
            {bulkAction.label}
          </button>
        );
      })}
    </div>
  );
};

export default ModalHeaderActions;
