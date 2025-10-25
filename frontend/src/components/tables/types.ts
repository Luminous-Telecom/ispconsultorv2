// Tipos para sistema de tabelas unificado

export type SortDirection = 'asc' | 'desc';
export type TableSize = 'sm' | 'md' | 'lg';
export type TableVariant = 'default' | 'striped' | 'bordered' | 'borderless' | 'hover';

export interface TableColumn<T = any> {
  key: string;
  label: string;
  render?: (item: T, index: number) => React.ReactNode;
  className?: string;
  sortable?: boolean;
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
  filterOptions?: Array<{ value: any; label: string }>;
  tooltip?: string;
}

export interface TableAction<T = any> {
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

export interface BulkAction<T = any> {
  key: string;
  label: string;
  icon?: string;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark';
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
    action: () => void;
  }[];
}

export interface TablePagination {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from?: number;
  to?: number;
}

export interface TableFilter {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'dateRange' | 'number' | 'boolean';
  options?: Array<{ value: any; label: string }>;
  placeholder?: string;
  defaultValue?: any;
}

export interface TableConfig<T = any> {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  pagination?: TablePagination;
  filters?: TableFilter[];
  actions?: TableAction<T>[];
  bulkActions?: BulkAction<T>[];
  searchable?: boolean;
  searchPlaceholder?: string;
  sortable?: boolean;
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
  customFilters?: (data: T[]) => T[];
}

export interface TableState<T = any> {
  data: T[];
  filteredData: T[];
  selectedItems: T[];
  searchTerm: string;
  sortColumn: string;
  sortDirection: SortDirection;
  filters: Record<string, any>;
  currentPage: number;
  pageSize: number;
  isLoading: boolean;
  isFiltered: boolean;
  isSorted: boolean;
}

export interface TableActions<T = any> {
  setData: (data: T[]) => void;
  setSelectedItems: (items: T[]) => void;
  setSearchTerm: (term: string) => void;
  setSort: (column: string, direction: SortDirection) => void;
  setFilter: (key: string, value: any) => void;
  setFilters: (filters: Record<string, any>) => void;
  clearFilters: () => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  refresh: () => void;
  selectAll: () => void;
  clearSelection: () => void;
  toggleSelection: (item: T) => void;
}

export interface UseTableOptions<T = any> {
  data: T[];
  columns: TableColumn<T>[];
  pagination?: TablePagination;
  filters?: TableFilter[];
  searchable?: boolean;
  sortable?: boolean;
  selectable?: boolean;
  multiSelect?: boolean;
  onDataChange?: (data: T[]) => void;
  onSelectionChange?: (selectedItems: T[]) => void;
  onSort?: (column: string, direction: SortDirection) => void;
  onFilter?: (filters: Record<string, any>) => void;
  onSearch?: (term: string) => void;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onRefresh?: () => void;
}

export interface UseTableReturn<T = any> {
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
export interface TableEvent<T = any> {
  type: 'select' | 'sort' | 'filter' | 'search' | 'page' | 'action';
  data?: T | T[];
  column?: string;
  direction?: SortDirection;
  filters?: Record<string, any>;
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
