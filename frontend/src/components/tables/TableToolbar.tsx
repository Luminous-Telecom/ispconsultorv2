import React from 'react';
import SearchBar from '../ui/SearchBar';
import { AuditarButton, RecarregarButton } from 'components/ui';
import { useI18n } from 'contexts/I18nContext';
import { BulkAction } from './types';
import TableBulkActionsRow from './TableBulkActionsRow';
import TablePaginationNav from './TablePaginationNav';
import { TablePaginationValues } from './tablePaginationUtils';

interface TableToolbarProps<T> {
  uniqueTableId: string;
  bulkActions: BulkAction<T>[];
  selectedItems: T[];
  customControlsAfterActions?: React.ReactNode;
  customControls?: React.ReactNode;
  searchable: boolean;
  searchInputValue: string;
  onSearchInputChange: (value: string) => void;
  onSearch: (value: string, field: string) => void;
  searchPlaceholder: string;
  searchField: string;
  onSearchFieldChange: (field: string) => void;
  searchFields: Array<{ key: string; label: string }>;
  showSelectAllPagesCheckbox: boolean;
  isAllPagesSelected: boolean;
  isLoadingSelectAllPages: boolean;
  onSelectAllPages: () => void;
  showPagination: boolean;
  paginationValues: TablePaginationValues;
  onGoToPage: (page: number) => void;
  onAudit?: () => void;
  auditEntity?: string;
  loading: boolean;
  canAudit: boolean;
  onRefresh?: () => void;
  openDropdownIndex: number | null;
  onOpenDropdownChange: (index: number | null) => void;
}

function TableToolbar<T>({
  uniqueTableId,
  bulkActions,
  selectedItems,
  customControlsAfterActions,
  customControls,
  searchable,
  searchInputValue,
  onSearchInputChange,
  onSearch,
  searchPlaceholder,
  searchField,
  onSearchFieldChange,
  searchFields,
  showSelectAllPagesCheckbox,
  isAllPagesSelected,
  isLoadingSelectAllPages,
  onSelectAllPages,
  showPagination,
  paginationValues,
  onGoToPage,
  onAudit,
  auditEntity,
  loading,
  canAudit,
  onRefresh,
  openDropdownIndex,
  onOpenDropdownChange,
}: TableToolbarProps<T>) {
  const { t } = useI18n();
  const hasBulkRow = bulkActions.length > 0 || Boolean(customControlsAfterActions);

  return (
    <div className="border-bottom table-header-custom">
      {hasBulkRow && (
        <div className="d-flex align-items-center justify-content-between table-header-content">
          <div className="d-flex align-items-center flex-wrap gap-2 table-header-flex">
            <TableBulkActionsRow
              bulkActions={bulkActions}
              selectedItems={selectedItems}
              openDropdownIndex={openDropdownIndex}
              onOpenDropdownChange={onOpenDropdownChange}
            />
          </div>
          {customControlsAfterActions && (
            <div className="d-flex align-items-center gap-2">{customControlsAfterActions}</div>
          )}
        </div>
      )}

      <div className="table-pagination-header">
        <div className="table-pagination-header__start">
          {showSelectAllPagesCheckbox && (
            <div className="d-flex align-items-center gap-2">
              <input
                className="form-check-input"
                type="checkbox"
                id={`select-all-pages-${uniqueTableId}`}
                checked={isAllPagesSelected}
                disabled={isLoadingSelectAllPages}
                onChange={onSelectAllPages}
              />
              <label
                className="form-check-label small text-muted whitespace-nowrap"
                htmlFor={`select-all-pages-${uniqueTableId}`}
                
              >
                {isLoadingSelectAllPages ? t('ui.loading') : t('ui.selectAllPages')}
              </label>
            </div>
          )}
          {searchable && (
            <SearchBar
              id={`${uniqueTableId}-search`}
              variant="table"
              value={searchInputValue}
              onChange={onSearchInputChange}
              onSearch={(value) => onSearch(value, searchField)}
              placeholder={searchPlaceholder}
              searchField={searchField}
              onSearchFieldChange={onSearchFieldChange}
              searchFields={searchFields}
              autoComplete="off"
            />
          )}
          {customControls && <div className="table-custom-controls">{customControls}</div>}
        </div>

        <div className="table-pagination-header__center">
          {showPagination && (
            <TablePaginationNav values={paginationValues} variant="desktop" onGoToPage={onGoToPage} />
          )}
        </div>

        <div className="table-pagination-header__end">
          {onAudit && auditEntity && (
            <AuditarButton
              onClick={onAudit}
              disabled={loading || !canAudit}
              title={
                canAudit
                  ? 'Auditar registro selecionado'
                  : 'Selecione exatamente 1 registro para auditar'
              }
            />
          )}
          <RecarregarButton onClick={onRefresh} title={t('ui.refresh')} />
        </div>
      </div>
    </div>
  );
}

export default TableToolbar;
