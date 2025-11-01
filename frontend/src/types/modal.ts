export interface ListModalColumn<T> {
  key: string;
  label: string;
  sortable?: boolean;
  searchable?: boolean;
  width?: string;
  render: (item: T) => React.ReactNode;
}

export interface ListModalConfig<T> {
  title: string;
  columns: ListModalColumn<T>[];
  searchPlaceholder?: string;
  emptyMessage?: string;
  multiSelect?: boolean;
  showRefresh?: boolean;
  showFilters?: boolean;
}

export interface ListModalProps<T> {
  show: boolean;
  onClose: () => void;
  config: ListModalConfig<T>;
  data: T[];
  loading?: boolean;
  selectedItems?: T[];
  onSelectionChange?: (items: T[]) => void;
  search?: string;
  onSearchChange?: (search: string) => void;
  pagination?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
  };
  onPageChange?: (page: number) => void;
  limit?: number;
  onLimitChange?: (limit: number) => void;
  onRefresh?: () => void;
  // Props para refresh automático
  refreshQueryKeys?: string[];
  refreshQueryFn?: () => void;
  bulkActions?: Array<{
    label: string;
    variant?: 'primary' | 'secondary' | 'danger';
    disabled?: () => boolean;
    action: () => void;
  }>;
}
