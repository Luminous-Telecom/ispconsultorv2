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
import { resolveDefaultSearchField } from 'utils/resolveDefaultSearchField';

/** Altura aproximada de cada linha do tbody (2rem em _tables.scss). */
const TABLE_BODY_ROW_HEIGHT_PX = 32;
const MODAL_AUTO_ROWS_MAX = 50;
/** Com resumo embaixo o ResizeObserver recalcula; sem resumo, 1 linha a menos evita scroll. */
const MODAL_AUTO_ROWS_BUFFER_WITH_SUMMARY = 0;
const MODAL_AUTO_ROWS_BUFFER_DEFAULT = 1;
/** Tabela principal (header): uma linha a menos para evitar scroll aparente. */
const HEADER_AUTO_ROWS_BUFFER = 1;
const HEADER_AUTO_ROWS_MAX = 30;
/** Tempo mínimo do loading ao trocar de página (primeira troca). */
const TABLE_PAGE_LOADING_MIN_MS = 400;
/** Acréscimo sobre a duração medida — próximas trocas mantêm loading um pouco mais longo. */
const TABLE_PAGE_LOADING_EXTRA_MS = 120;

const TABLE_SUMMARY_SELECTORS = '.financeiro-resumo, .contrato-totais-resumo';

function hasVisibleTableSummary(container: HTMLElement): boolean {
  const scope =
    container.closest('.draggable-modal-body-custom') ??
    container.closest('.tab-content') ??
    container.closest('.embedded-table-panel')?.parentElement;
  if (!scope) return false;
  return Array.from(scope.querySelectorAll(TABLE_SUMMARY_SELECTORS)).some(
    (el) => (el as HTMLElement).offsetHeight > 0
  );
}

function computeModalOptimalRows(container: HTMLElement): number | null {
  const responsive = container.querySelector('.table-responsive-custom') as HTMLElement | null;
  if (!responsive || responsive.offsetHeight < 100) return null;
  const headH =
    (container.querySelector('thead') as HTMLElement | null)?.offsetHeight ?? TABLE_BODY_ROW_HEIGHT_PX;
  const rowBuffer = hasVisibleTableSummary(container)
    ? MODAL_AUTO_ROWS_BUFFER_WITH_SUMMARY
    : MODAL_AUTO_ROWS_BUFFER_DEFAULT;
  return Math.max(
    5,
    Math.min(
      MODAL_AUTO_ROWS_MAX,
      Math.floor((responsive.offsetHeight - headH) / TABLE_BODY_ROW_HEIGHT_PX) - rowBuffer
    )
  );
}

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
    fetching = false,
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

  const [localSearchField, setLocalSearchField] = useState<string>(() =>
    resolveDefaultSearchField(configSearchFields, configSearchField)
  );

  const selectedSearchField = syncWithHeader ? headerSearchField || localSearchField : localSearchField;

  const getMinWidthForColumn = useCallback((columnKey: string) => {
    const column = config.columns.find((col) => col.key === columnKey);
    if (!column) return 40;
    const colMin = getColumnMinWidth(column);
    if (colMin != null) return colMin;
    if (!column.label) return 40;
    return Math.max(40, column.label.length * 6 + 24);
  }, [config.columns]);

  const {
    columnWidths,
    handleResizeStart,
    isResizing,
    resizeGuideX,
  } = useColumnResizing({
    tableId: uniqueTableId,
    columns: config.columns,
    getMinWidthForColumn,
  });

  const tableRef = useRef<HTMLTableElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const onRefreshRef = useRef(onRefresh);
  const tableActionsRef = useRef<TableActions<T> | null>(null);
  const autoRowsAppliedRef = useRef(false);
  const modalAutoRowsAppliedRef = useRef(false);
  const hasCustomWidths = Object.keys(columnWidths).length > 0;
  const [resizeGuideStyle, setResizeGuideStyle] = useState<{ left: number; top: number; height: number } | null>(null);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const [openActionDropdown, setOpenActionDropdown] = useState<number | string | null>(null);
  const [isLoadingSelectAllPages, setIsLoadingSelectAllPages] = useState(false);
  const [isPageChanging, setIsPageChanging] = useState(false);
  const isPageChangingRef = useRef(false);
  const pageChangeStartedAtRef = useRef<number | null>(null);
  const pageChangeMinMsRef = useRef(TABLE_PAGE_LOADING_MIN_MS);
  const pageChangeClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const paginatedDataFingerprintRef = useRef('');
  const pageFetchStartedRef = useRef(false);

  useEffect(() => {
    isPageChangingRef.current = isPageChanging;
  }, [isPageChanging]);

  useEffect(
    () => () => {
      if (pageChangeClearTimerRef.current) {
        clearTimeout(pageChangeClearTimerRef.current);
      }
    },
    []
  );

  const finishPageChangeLoading = useCallback(() => {
    if (!isPageChangingRef.current || pageChangeStartedAtRef.current == null) return;

    if (pageChangeClearTimerRef.current) {
      clearTimeout(pageChangeClearTimerRef.current);
      pageChangeClearTimerRef.current = null;
    }

    const startedAt = pageChangeStartedAtRef.current;
    if (startedAt == null) {
      setIsPageChanging(false);
      return;
    }

    const elapsed = Date.now() - startedAt;
    const minMs = pageChangeMinMsRef.current;
    const remaining = Math.max(0, minMs - elapsed);

    const complete = () => {
      if (pageChangeStartedAtRef.current != null) {
        const totalMs = Date.now() - pageChangeStartedAtRef.current;
        pageChangeMinMsRef.current = Math.max(
          TABLE_PAGE_LOADING_MIN_MS,
          totalMs + TABLE_PAGE_LOADING_EXTRA_MS
        );
        pageChangeStartedAtRef.current = null;
      }
      pageChangeClearTimerRef.current = null;
      pageFetchStartedRef.current = false;
      setIsPageChanging(false);
    };

    if (remaining <= 0) {
      complete();
      return;
    }

    pageChangeClearTimerRef.current = setTimeout(complete, remaining);
  }, []);

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
  const paginationPerPage = normalizedPagination?.perPage;
  const paginationPerPageRef = useRef(paginationPerPage);
  paginationPerPageRef.current = paginationPerPage;

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
        if (page !== paginationValues.currentPage) {
          if (pageChangeClearTimerRef.current) {
            clearTimeout(pageChangeClearTimerRef.current);
            pageChangeClearTimerRef.current = null;
          }
          pageChangeStartedAtRef.current = Date.now();
          pageFetchStartedRef.current = false;
          setIsPageChanging(true);
        }
        onPageChange?.(page);
      } else {
        tableActions.setPage(page);
      }
    },
    [normalizedPagination, onPageChange, tableActions, paginationValues.currentPage]
  );

  const isTableContentLoading = loading || fetching || isPageChanging;

  const paginatedDataFingerprint = useMemo(
    () => paginatedData.map((item) => item.id).join('|'),
    [paginatedData]
  );

  useEffect(() => {
    if (loading || fetching) {
      if (isPageChangingRef.current) {
        pageFetchStartedRef.current = true;
      }
      return;
    }
    if (!isPageChangingRef.current) {
      pageFetchStartedRef.current = false;
      return;
    }
    if (pageFetchStartedRef.current) {
      finishPageChangeLoading();
    }
  }, [loading, fetching, finishPageChangeLoading]);

  useEffect(() => {
    if (!isPageChangingRef.current) {
      paginatedDataFingerprintRef.current = paginatedDataFingerprint;
      return;
    }
    if (paginatedDataFingerprint === paginatedDataFingerprintRef.current) return;
    paginatedDataFingerprintRef.current = paginatedDataFingerprint;
    finishPageChangeLoading();
  }, [paginatedDataFingerprint, finishPageChangeLoading]);

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
      const snapshot = tableRef.current
        ? measureColumnWidths(tableRef.current, visibleColumns, selectable)
        : undefined;
      handleResizeStart(columnKey, startX, currentWidth, snapshot);
    },
    [handleResizeStart, visibleColumns, selectable]
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
    modalAutoRowsAppliedRef.current = false;
  }, [uniqueTableId]);

  useEffect(() => {
    if (paginationPerPage == null || !onPageSizeChange) return;

    let rafId = 0;
    let observer: ResizeObserver | null = null;
    let attachTimer: ReturnType<typeof setTimeout>;

    const calculateAndApply = () => {
      const container = tableContainerRef.current;
      if (!container) return;

      if (!syncWithHeader) {
        if (modalAutoRowsAppliedRef.current) return;
        const optimalRows = computeModalOptimalRows(container);
        if (optimalRows == null) return;
        if (paginationPerPageRef.current !== optimalRows) {
          onPageSizeChange(optimalRows);
        }
        modalAutoRowsAppliedRef.current = true;
        return;
      }

      if (autoRowsAppliedRef.current) return;

      const scrollContainer =
        container.closest('[style*="flex: 1"]') || container.closest('[style*="overflow: auto"]');
      if (!scrollContainer) return;
      const availableHeight = scrollContainer.getBoundingClientRect().height;
      const optimalRows = Math.max(
        5,
        Math.min(
          HEADER_AUTO_ROWS_MAX,
          Math.floor((availableHeight - 160) / 35) - HEADER_AUTO_ROWS_BUFFER
        )
      );
      if (paginationPerPageRef.current !== optimalRows) {
        onPageSizeChange(optimalRows);
      }
      autoRowsAppliedRef.current = true;
    };

    const scheduleCalculate = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(calculateAndApply);
    };

    const initialTimer = setTimeout(scheduleCalculate, 50);

    if (!syncWithHeader && typeof ResizeObserver !== 'undefined' && !modalAutoRowsAppliedRef.current) {
      attachTimer = setTimeout(() => {
        const container = tableContainerRef.current;
        if (!container) return;
        const watchTarget =
          (container.querySelector('.table-responsive-custom') as HTMLElement | null) ??
          container.closest('.list-modal-table-wrapper');
        if (!watchTarget) return;
        observer = new ResizeObserver(() => scheduleCalculate());
        observer.observe(watchTarget);
      }, 50);
    }

    return () => {
      clearTimeout(initialTimer);
      clearTimeout(attachTimer);
      cancelAnimationFrame(rafId);
      observer?.disconnect();
    };
  }, [paginationPerPage, onPageSizeChange, syncWithHeader]);

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
          loading={isTableContentLoading}
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
          loading={isTableContentLoading}
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
