import type { ButtonVariant } from 'components/ui/Button';

/** Variantes permitidas em bulk actions de modais (sem `unstyled`). */
type ListModalBulkActionVariant = Exclude<ButtonVariant, 'unstyled'>;

export interface ListModalColumn<T> {
  key: string;
  label: string;
  sortable?: boolean;
  searchable?: boolean;
  width?: string | number;
  minWidth?: string | number;
  maxWidth?: string | number;
  resizable?: boolean;
  sortValue?: (row: T) => unknown;
  badgeLabels?: string[];
  render: (item: T) => React.ReactNode;
}

export interface ListModalConfig<T> {
  title: string;
  columns: ListModalColumn<T>[];
  searchPlaceholder?: string;
  searchField?: string;
  searchFields?: Array<{ key: string; label: string }>;
  emptyMessage?: string;
  multiSelect?: boolean;
  showRefresh?: boolean;
  showFilters?: boolean;
  filters?: Array<{
    key: string;
    label: string;
    type: 'text' | 'select' | 'date' | 'dateRange' | 'number' | 'boolean';
    options?: Array<{ value: string | number; label: string }>;
    placeholder?: string;
  }>;
}

export interface ListModalProps<T> {
  show: boolean;
  onClose: () => void;
  config: ListModalConfig<T>;
  data: T[];
  loading?: boolean;
  /** Refetch em background (ex.: `isFetching` do React Query). */
  fetching?: boolean;
  selectedItems?: T[];
  onSelectionChange?: (items: T[]) => void;
  onRowDoubleClick?: (item: T) => void;
  search?: string;
  onSearchChange?: (search: string, field: string) => void;
  onSearchFieldChange?: (field: string) => void;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSortChange?: (column: string, direction: 'asc' | 'desc') => void;
  pagination?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
  };
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  limit?: number;
  onLimitChange?: (limit: number) => void;
  onRefresh?: () => void;
  refreshQueryKeys?: string[];
  refreshQueryFn?: () => void;
  bulkActions?: Array<{
    label: string;
    variant?: ListModalBulkActionVariant;
    requiresSelection?: boolean;
    disabled?: boolean | (() => boolean) | ((selectedItems: T[]) => boolean);
    action?: (() => void) | ((selectedItems: T[]) => void);
    dropdown?: {
      label: string;
      action: (selectedItems?: T[]) => void;
      disabled?: boolean | ((selectedItems: T[]) => boolean);
    }[];
  }>;
  onAudit?: (item: T) => void | Promise<void>;
  auditEntity?: string;
  skipWrapper?: boolean;
  /** Exibe título abaixo das abas (EmbeddedTablePanel) quando embutido em modal com abas */
  showEmbeddedTableTitle?: boolean;
  customControlsAfterActions?: React.ReactNode;
  /** ID estável da tabela para persistir larguras de colunas no localStorage (redimensionamento) */
  tableId?: string;
  /** ID do DraggableModal (quando não usa skipWrapper) */
  modalId?: string;
  onRowClick?: (item: T) => void;
  sortable?: boolean;
  striped?: boolean;
  hover?: boolean;
  responsive?: boolean;
  modalSize?: 'sm' | 'md' | 'lg' | 'xl';
  /** Título do DraggableModal; se omitido, usa `config.title`. */
  wrapperTitle?: string;
  onSelectAllPages?: () => T[] | Promise<T[]>;
}
