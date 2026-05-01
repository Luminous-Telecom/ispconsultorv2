// Tipos para sistema de tabelas unificado
import React from 'react';
import { RenderFunction, FilterValue } from 'types/common';

export type SortDirection = 'asc' | 'desc';
export type TableSize = 'sm' | 'md' | 'lg';
export type TableVariant = 'default' | 'striped' | 'bordered' | 'borderless' | 'hover';

export interface TableColumn<T = Record<string, unknown>> {
  key: string;
  label: string;
  render?: RenderFunction<T>;
  className?: string;
  sortable?: boolean;
  /** Labels possíveis do badge - minWidth calculado dinamicamente pelo maior texto */
  badgeLabels?: string[];
  width?: string | number;
  minWidth?: string | number;
  maxWidth?: string | number;
  align?: 'left' | 'center' | 'right';
  headerAlign?: 'left' | 'center' | 'right';
  resizable?: boolean;
  fixed?: 'left' | 'right';
  hidden?: boolean;
  searchable?: boolean;
  filterable?: boolean;
  filterOptions?: Array<{ value: FilterValue; label: string }>;
  tooltip?: string;
  /** Valor usado só para ordenação quando `key` não reflete o dado exibido (ex.: objeto aninhado). */
  sortValue?: (row: T) => unknown;
}

export interface TableAction<T = Record<string, unknown>> {
  key: string;
  label: string;
  icon?: string;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean | ((item: T) => boolean);
  hidden?: boolean | ((item: T) => boolean);
  onClick: (item: T, index: number) => void;
  confirm?: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
  };
}

export interface BulkAction<T = Record<string, unknown>> {
  /** Opcional: usado em menus mobile (fallback deriva do label). */
  key?: string;
  label: string;
  icon?: string;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark';
  /** Se false, o botão permanece ativo mesmo sem itens selecionados (ex: Backup Manual, Novo) */
  requiresSelection?: boolean;
  disabled?: boolean | ((selectedItems: T[]) => boolean);
  hidden?: boolean | ((selectedItems: T[]) => boolean);
  onClick?: (selectedItems: T[]) => void;
  confirm?: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
  };
  dropdown?: {
    label: string;
    action: (selectedItems?: T[]) => void;
    disabled?: boolean | ((selectedItems: T[]) => boolean);
  }[];
}

export interface TablePagination {
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
  from?: number;
  to?: number;
}

export interface TableFilter {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'dateRange' | 'number' | 'boolean';
  options?: Array<{ value: string | number; label: string }>;
  placeholder?: string;
  defaultValue?: FilterValue;
}

export interface TableConfig<T = Record<string, unknown>> {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  pagination?: TablePagination | {
    current_page?: number;
    last_page?: number;
    per_page?: number;
    currentPage?: number;
    lastPage?: number;
    perPage?: number;
    total: number;
    from?: number;
    to?: number;
  };
  filters?: TableFilter[];
  actions?: TableAction<T>[];
  bulkActions?: BulkAction<T>[];
  searchable?: boolean;
  searchPlaceholder?: string;
  searchField?: string;
  searchFields?: Array<{ key: string; label: string }>;
  onSearchFieldChange?: (field: string) => void;
  sortable?: boolean;
  sortColumn?: string;
  sortDirection?: SortDirection;
  selectable?: boolean;
  multiSelect?: boolean;
  emptyMessage?: string;
  loadingMessage?: string;
  size?: TableSize;
  variant?: TableVariant;
  striped?: boolean;
  hover?: boolean;
  bordered?: boolean;
  borderless?: boolean;
  responsive?: boolean;
  stickyHeader?: boolean;
  stickyActions?: boolean;
  className?: string;
  customControls?: React.ReactNode;
  customControlsAfterActions?: React.ReactNode;
  customFilters?: (data: T[]) => T[];
  /** Se false, oculta a barra superior da tabela (busca inline, paginação e atualizar). Padrão: true */
  showToolbar?: boolean;
}

export interface TableState<T = Record<string, unknown>> {
  data: T[];
  filteredData: T[];
  selectedItems: T[];
  searchTerm: string;
  /** Valor digitado no input (antes de executar busca com Enter/lupa) */
  searchInputValue: string;
  sortColumn: string;
  sortDirection: SortDirection;
  filters: Record<string, FilterValue>;
  currentPage: number;
  pageSize: number;
  isLoading: boolean;
  isFiltered: boolean;
  isSorted: boolean;
}

export interface TableActions<T = Record<string, unknown>> {
  setData: (data: T[]) => void;
  setSelectedItems: (items: T[]) => void;
  setSearchTerm: (term: string) => void;
  setSearchInputValue: (term: string) => void;
  executeSearch: () => void;
  setSort: (column: string, direction: SortDirection) => void;
  setFilter: (key: string, value: FilterValue) => void;
  setFilters: (filters: Record<string, FilterValue>) => void;
  clearFilters: () => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  refresh: () => void;
  selectAll: () => void;
  clearSelection: () => void;
  toggleSelection: (item: T) => void;
}

export interface UseTableOptions<T = Record<string, unknown>> {
  data: T[];
  columns: TableColumn<T>[];
  pagination?: TablePagination | {
    current_page?: number;
    last_page?: number;
    per_page?: number;
    currentPage?: number;
    lastPage?: number;
    perPage?: number;
    total: number;
    from?: number;
    to?: number;
  };
  filters?: TableFilter[];
  searchable?: boolean;
  sortable?: boolean;
  sortColumn?: string;
  sortDirection?: SortDirection;
  selectable?: boolean;
  multiSelect?: boolean;
  onDataChange?: (data: T[]) => void;
  onSelectionChange?: (selectedItems: T[]) => void;
  onSort?: (column: string, direction: SortDirection) => void;
  onFilter?: (filters: Record<string, FilterValue>) => void;
  onSearch?: (term: string, field?: string) => void;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onRefresh?: () => void;
  onAudit?: (item: T) => void | Promise<void>;
  auditEntity?: string; // Nome da entidade para auditoria (ex: 'Cliente', 'Contrato')
}

export interface UseTableReturn<T = Record<string, unknown>> {
  state: TableState<T>;
  actions: TableActions<T>;
  filteredData: T[];
  paginatedData: T[];
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  isAllSelected: boolean;
  isPartiallySelected: boolean;
}

// Tipos para eventos
export interface TableEvent<T = Record<string, unknown>> {
  type: 'select' | 'sort' | 'filter' | 'search' | 'page' | 'action';
  data?: T | T[];
  column?: string;
  direction?: SortDirection;
  filters?: Record<string, FilterValue>;
  searchTerm?: string;
  page?: number;
  pageSize?: number;
  action?: string;
}

// Tipos para configuração de exportação
export interface ExportConfig {
  format: 'csv' | 'xlsx' | 'pdf';
  filename?: string;
  includeHeaders?: boolean;
  includeFilters?: boolean;
  columns?: string[];
  excludeColumns?: string[];
}

// Tipos para configuração de impressão
export interface PrintConfig {
  title?: string;
  includeHeaders?: boolean;
  includeFilters?: boolean;
  columns?: string[];
  excludeColumns?: string[];
  orientation?: 'portrait' | 'landscape';
  pageSize?: 'A4' | 'A3' | 'Letter';
}
