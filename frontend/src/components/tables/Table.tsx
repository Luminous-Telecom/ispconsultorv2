import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import { TableConfig, TableAction, BulkAction, SortDirection, TableActions } from './types';
import { FilterValue } from 'types/common';
import { useTable } from './useTable';
import { useColumnResizing } from 'hooks/useColumnResizing';
import TableLayoutWrapper from './TableLayoutWrapper';
import TableMobileView from './TableMobileView';
import TableDesktopView from './TableDesktopView';
import TableToolbar from './TableToolbar';
import TablePaginationNav from './TablePaginationNav';
import { useIsMobile } from 'hooks/useMediaQuery';
import { useTableHeader } from 'contexts/TableHeaderContext';
import { useI18n } from 'contexts/I18nContext';
import {
  ACTIONS_COLUMN_WIDTH_PX,
  CHECKBOX_COLUMN_WIDTH_PX,
  DEFAULT_COLUMN_WIDTH_PX,
  getColumnMinWidth,
  measureColumnWidths,
  resolveColumnWidthPx,
} from './columnWidthUtils';
import { normalizePagination } from './tableUtils';
import { computeTablePaginationValues } from './tablePaginationUtils';
import { useTableHeaderSync } from './useTableHeaderSync';

export interface TableProps<T = Record<string, unknown>> {
  config: TableConfig<T>;
  onActionClick?: (action: TableAction<T>, item: T, index: number) => void;
  onBulkActionClick?: (action: BulkAction<T>, selectedItems: T[]) => void;
  onRowClick?: (item: T, index: number) => void;
  onRowDoubleClick?: (item: T, index: number) => void;
  onSelectionChange?: (selectedItems: T[]) => void;
  onSort?: (column: string, direction: SortDirection) => void;
  onFilter?: (filters: Record<string, FilterValue>) => void;
  search?: string;
  onSearch?: (term: string, field: string) => void;
  onSearchFieldChange?: (field: string) => void;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onRefresh?: () => void;
  onAudit?: (item: T) => void | Promise<void>;
  auditEntity?: string;
  onSelectAllPages?: () => T[] | Promise<T[]>;
  className?: string;
  tableId?: string;
  title?: string;
  syncWithHeader?: boolean;
  layoutWrapper?: boolean;
}

function Table<T extends { id: number | string }>({
  config,
  onActionClick,
  onBulkActionClick,
  onRowClick,
  onRowDoubleClick,
  onSelectionChange,
  onSort,
  onFilter,
  search,
  onSearch,
  onPageChange,
  onPageSizeChange,
  onRefresh,
  onAudit,
  auditEntity,
  onSelectAllPages,
  onSearchFieldChange,
  className = '',
  tableId,
  title,
  syncWithHeader = true,
  layoutWrapper,
}: TableProps<T>) {
  const uniqueTableId = tableId || `table-${Math.random().toString(36).substr(2, 9)}`;
  const isMobile = useIsMobile();
  const { t } = useI18n();
  const { searchField: headerSearchField } = useTableHeader();

  const [headerReady, setHeaderReady] = useState(syncWithHeader);
  useLayoutEffect(() => {
    setHeaderReady(true);
  }, [syncWithHeader]);

  const {
    columns,
    data,
    loading = false,
    pagination: configPagination,
    filters = [],
    actions: tableActionsList = [],
    bulkActions = [],
    searchable = true,
    searchPlaceholder,
    sortable = true,
    sortColumn,
    sortDirection,
    selectable = true,
    multiSelect = false,
    emptyMessage,
    loadingMessage,
    customControls,
    customControlsAfterActions,
    customFilters,
    searchField: configSearchField = '',
    searchFields: configSearchFields,
    showToolbar: showToolbarFromConfig = true,
  } = config;

  const showToolbar = showToolbarFromConfig !== false;
  const defaultSearchPlaceholder = searchPlaceholder || t('layout.searchPlaceholder');
  const defaultEmptyMessage = emptyMessage || t('messages.noData');
  const defaultLoadingMessage = loadingMessage || t('messages.loading');

  const [localSearchField, setLocalSearchField] = useState<string>(() => {
    if (!configSearchFields?.length) return configSearchField || '';
    const hasTodos = configSearchFields.some((f) => f.key === 'todos');
    if (hasTodos) return 'todos';
    const hasId = configSearchFields.some((f) => f.key === 'id');
    return hasId ? 'id' : configSearchField || configSearchFields[0].key;
  });

  const selectedSearchField = syncWithHeader ? headerSearchField || localSearchField : localSearchField;

  const {
    columnWidths,
    handleResizeStart,
    isResizing,
    resizeGuideX,
  } = useColumnResizing({
    tableId: uniqueTableId,
    columns: config.columns,
    getMinWidthForColumn: (columnKey: string) => {
      const column = config.columns.find((col) => col.key === columnKey);
      if (!column) return 40;
      const colMin = getColumnMinWidth(column);
      if (colMin != null) return colMin;
      if (!column.label) return 40;
      return Math.max(40, column.label.length * 6 + 24);
    },
  });

  const tableRef = useRef<HTMLTableElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const onRefreshRef = useRef(onRefresh);
  const tableActionsRef = useRef<TableActions<T> | null>(null);
  const autoRowsAppliedRef = useRef(false);
  const hasCustomWidths = Object.keys(columnWidths).length > 0;
  const [resizeGuideStyle, setResizeGuideStyle] = useState<{ left: number; top: number; height: number } | null>(null);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const [openActionDropdown, setOpenActionDropdown] = useState<number | string | null>(null);
  const [isLoadingSelectAllPages, setIsLoadingSelectAllPages] = useState(false);

  const filteredData = useMemo(() => {
    if (!customFilters) return data;
    return customFilters(data);
  }, [data, customFilters]);

  const handleSelectionChange = useCallback(
    (selectedItems: T[]) => {
      onSelectionChange?.(selectedItems);
    },
    [onSelectionChange]
  );

  const {
    state,
    actions: tableActions,
    paginatedData,
    totalPages,
    isAllSelected,
  } = useTable({
    data: filteredData,
    columns,
    pagination: configPagination,
    filters,
    searchable,
    sortable,
    sortColumn,
    sortDirection,
    selectable,
    multiSelect,
    onSelectionChange: handleSelectionChange,
    onSort,
    onFilter,
    onSearch: onSearch ? (term, field) => onSearch(term, field || selectedSearchField) : undefined,
    onPageChange,
    onPageSizeChange,
    onRefresh,
  });

  tableActionsRef.current = tableActions;
  onRefreshRef.current = onRefresh;

  const normalizedPagination = useMemo(
    () => normalizePagination(configPagination),
    [configPagination]
  );

  const paginationValues = useMemo(
    () =>
      computeTablePaginationValues({
        normalizedPagination,
        localCurrentPage: state.currentPage,
        localPageSize: state.pageSize,
        localTotalPages: totalPages,
        dataLength: data.length,
      }),
    [normalizedPagination, state.currentPage, state.pageSize, totalPages, data.length]
  );

  const tableMinWidth = useMemo(() => {
    const cols = columns.filter((col) => !col.hidden);
    let total = 0;
    cols.forEach((col) => {
      total += resolveColumnWidthPx(col, columnWidths, hasCustomWidths) ?? DEFAULT_COLUMN_WIDTH_PX;
    });
    if (selectable) total += CHECKBOX_COLUMN_WIDTH_PX;
    if (tableActionsList.length > 0) total += ACTIONS_COLUMN_WIDTH_PX;
    return total;
  }, [columns, columnWidths, hasCustomWidths, selectable, tableActionsList.length]);

  const visibleColumns = useMemo(
    () => columns.filter((col) => !col.hidden),
    [columns]
  );

  const handleReloadClick = useCallback(() => {
    if (onRefreshRef.current) {
      onRefreshRef.current();
    } else {
      setTimeout(() => tableActionsRef.current?.refresh(), 0);
    }
  }, []);

  const { handleLocalSearchFieldChange, bindHeaderSearchHandler } = useTableHeaderSync({
    syncWithHeader,
    search,
    title,
    searchable,
    showToolbar,
    configSearchFields,
    configSearchField,
    defaultSearchPlaceholder,
    searchTerm: state.searchTerm,
    setSearchTerm: tableActions.setSearchTerm,
    localSearchField,
    setLocalSearchField,
    onSearchFieldChange,
    handleReloadClick,
    t,
  });

  useEffect(() => {
    bindHeaderSearchHandler((term, field) => onSearch?.(term, field || ''));
  }, [onSearch, bindHeaderSearchHandler]);

  const handleGoToPage = useCallback(
    (page: number) => {
      if (normalizedPagination) {
        onPageChange?.(page);
      } else {
        tableActions.setPage(page);
      }
    },
    [normalizedPagination, onPageChange, tableActions]
  );

  const handleSelectAllPages = useCallback(async () => {
    if (!onSelectAllPages || !tableActions.setSelectedItems) return;
    const total = normalizedPagination?.total ?? 0;
    const allPagesSelected = state.selectedItems.length >= total && total > 0;
    if (allPagesSelected) {
      tableActions.clearSelection?.();
      return;
    }
    setIsLoadingSelectAllPages(true);
    try {
      const result = await onSelectAllPages();
      tableActions.setSelectedItems(Array.isArray(result) ? result : []);
    } finally {
      setIsLoadingSelectAllPages(false);
    }
  }, [onSelectAllPages, tableActions, state.selectedItems.length, normalizedPagination]);

  const showSelectAllPagesCheckbox = Boolean(
    selectable &&
      multiSelect &&
      onSelectAllPages &&
      normalizedPagination &&
      (normalizedPagination.total ?? 0) > (normalizedPagination.perPage ?? 15) &&
      isAllSelected
  );

  const isAllPagesSelected = Boolean(
    showSelectAllPagesCheckbox &&
      state.selectedItems.length >= (normalizedPagination?.total ?? 0) &&
      (normalizedPagination?.total ?? 0) > 0
  );

  const handleAuditClick = useCallback(async () => {
    if (!onAudit || state.selectedItems.length !== 1) return;
    const selectedItem = state.selectedItems[0];
    if (!selectedItem) return;
    try {
      const result = onAudit(selectedItem);
      if (result instanceof Promise) await result;
    } catch {
      // auditoria pode falhar sem quebrar a UI
    } finally {
      setTimeout(() => {
        onRefreshRef.current?.();
        tableActionsRef.current?.refresh?.();
      }, 0);
    }
  }, [onAudit, state.selectedItems]);

  const handleColumnResizeStart = useCallback(
    (columnKey: string, startX: number, currentWidth: number) => {
      const snapshot =
        !hasCustomWidths && tableRef.current
          ? measureColumnWidths(tableRef.current, visibleColumns, selectable)
          : undefined;
      handleResizeStart(columnKey, startX, currentWidth, snapshot);
    },
    [hasCustomWidths, handleResizeStart, visibleColumns, selectable]
  );

  useLayoutEffect(() => {
    if (resizeGuideX == null || !tableScrollRef.current || !tableRef.current) {
      setResizeGuideStyle(null);
      return;
    }
    const container = tableScrollRef.current;
    const table = tableRef.current;
    const containerRect = container.getBoundingClientRect();
    setResizeGuideStyle({
      left: resizeGuideX - containerRect.left + container.scrollLeft,
      top: table.offsetTop,
      height: table.offsetHeight,
    });
  }, [resizeGuideX]);

  useEffect(() => {
    if (!normalizedPagination || !onPageSizeChange || autoRowsAppliedRef.current) return;

    const calculateAndApply = () => {
      const container = tableContainerRef.current;
      if (!container) return;

      if (!syncWithHeader) {
        const responsive = container.querySelector('.table-responsive-custom') as HTMLElement | null;
        if (!responsive || responsive.offsetHeight < 100) return;
        const headH = (container.querySelector('thead') as HTMLElement | null)?.offsetHeight ?? 32;
        const optimalRows = Math.max(5, Math.min(50, Math.floor((responsive.offsetHeight - headH) / 32)));
        if (normalizedPagination.perPage !== optimalRows) {
          onPageSizeChange(optimalRows);
          autoRowsAppliedRef.current = true;
        }
        return;
      }

      const scrollContainer =
        container.closest('[style*="flex: 1"]') || container.closest('[style*="overflow: auto"]');
      if (!scrollContainer) return;
      const availableHeight = scrollContainer.getBoundingClientRect().height;
      const optimalRows = Math.max(5, Math.min(30, Math.floor((availableHeight - 120) / 35)));
      if (normalizedPagination.perPage !== optimalRows) {
        onPageSizeChange(optimalRows);
        autoRowsAppliedRef.current = true;
      }
    };

    const timer = setTimeout(calculateAndApply, 50);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedPagination ? 'ready' : 'waiting']);

  useEffect(() => {
    if (openDropdown === null) return;
    const handleClickOutside = () => setOpenDropdown(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openDropdown]);

  const showToolbarBlock =
    headerReady &&
    showToolbar &&
    (bulkActions.length > 0 ||
      searchable ||
      normalizedPagination ||
      (!normalizedPagination && data.length > 0));

  const tableElement = (
    <div
      ref={tableContainerRef}
      className={`${className} table-container-custom`}
      style={{ ['--table-min-width' as string]: `${tableMinWidth}px` }}
    >
      {!isMobile && showToolbarBlock && (
        <TableToolbar
          uniqueTableId={uniqueTableId}
          bulkActions={bulkActions}
          selectedItems={state.selectedItems}
          customControlsAfterActions={customControlsAfterActions}
          customControls={customControls}
          searchable={searchable}
          searchInputValue={state.searchInputValue}
          onSearchInputChange={tableActions.setSearchInputValue}
          onSearch={(value, field) => {
            tableActions.setSearchTerm(value);
            onSearch?.(value, field);
          }}
          searchPlaceholder={defaultSearchPlaceholder}
          searchField={selectedSearchField}
          onSearchFieldChange={handleLocalSearchFieldChange}
          searchFields={configSearchFields || []}
          showSelectAllPagesCheckbox={showSelectAllPagesCheckbox}
          isAllPagesSelected={isAllPagesSelected}
          isLoadingSelectAllPages={isLoadingSelectAllPages}
          onSelectAllPages={handleSelectAllPages}
          showPagination={Boolean(normalizedPagination || data.length > 0)}
          paginationValues={paginationValues}
          onGoToPage={handleGoToPage}
          onAudit={onAudit ? handleAuditClick : undefined}
          auditEntity={auditEntity}
          loading={loading}
          canAudit={state.selectedItems.length === 1}
          onRefresh={onRefresh}
          openDropdownIndex={openDropdown}
          onOpenDropdownChange={setOpenDropdown}
        />
      )}

      {isMobile ? (
        <TableMobileView
          columns={columns}
          paginatedData={paginatedData}
          loading={loading}
          loadingMessage={defaultLoadingMessage}
          emptyMessage={defaultEmptyMessage}
          bulkActions={bulkActions}
          actions={tableActionsList}
          selectedItems={state.selectedItems}
          onActionClick={onActionClick}
          onBulkActionClick={onBulkActionClick}
          onRowClick={onRowClick}
          t={t}
        >
          {showToolbar && (normalizedPagination || data.length > 0) && (
            <div className="table-mobile-pagination">
              <TablePaginationNav
                values={paginationValues}
                variant="mobile-compact"
                onGoToPage={handleGoToPage}
              />
            </div>
          )}
        </TableMobileView>
      ) : (
        <TableDesktopView
          tableRef={tableRef}
          tableScrollRef={tableScrollRef}
          tableMinWidth={tableMinWidth}
          isResizing={isResizing}
          hasCustomWidths={hasCustomWidths}
          resizeGuideStyle={resizeGuideStyle}
          selectable={selectable}
          uniqueTableId={uniqueTableId}
          isAllSelected={isAllSelected}
          onToggleSelectAll={tableActions.selectAll}
          onClearSelection={tableActions.clearSelection}
          visibleColumns={visibleColumns}
          columnWidths={columnWidths}
          sortColumn={state.sortColumn}
          sortDirection={state.sortDirection}
          onSort={tableActions.setSort}
          onResizeStart={handleColumnResizeStart}
          actions={tableActionsList}
          loading={loading}
          loadingMessage={defaultLoadingMessage}
          emptyMessage={defaultEmptyMessage}
          paginatedData={paginatedData}
          selectedItems={state.selectedItems}
          onToggleSelection={tableActions.toggleSelection}
          onRowClick={onRowClick}
          onRowDoubleClick={onRowDoubleClick}
          onActionClick={onActionClick}
          openActionDropdown={openActionDropdown}
          onOpenActionDropdown={setOpenActionDropdown}
          actionsMenuLabel={t('ui.actionsMenu')}
        />
      )}
    </div>
  );

  const shouldWrapLayout = layoutWrapper ?? !syncWithHeader;
  if (shouldWrapLayout) {
    return <TableLayoutWrapper>{tableElement}</TableLayoutWrapper>;
  }

  return tableElement;
}

export default Table;
