import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { TableConfig, TableAction, BulkAction, SortDirection, TablePagination } from './types';
import { FilterValue } from 'types/common';
import { useTable } from './useTable';
import { useColumnResizing } from 'hooks/useColumnResizing';
import TableColumn from './TableColumn';
import TableLayoutWrapper from './TableLayoutWrapper';
import Spinner from '../ui/Spinner';
import SearchBar from '../ui/SearchBar';
import { useIsMobile } from 'hooks/useMediaQuery';
import { useTableHeader } from 'contexts/TableHeaderContext';
import { useI18n } from 'contexts/I18nContext';
import { AuditarButton, BulkActionButton, RecarregarButton } from 'components/ui';

// Calcula minWidth dinâmico a partir dos labels do badge (~7px/char + 24px padding)
function getMinWidthFromBadgeLabels(labels: string[]): number {
  if (!labels?.length) return 0;
  const maxLen = Math.max(...labels.map(l => (l || '').length));
  return maxLen * 7 + 24;
}

// Largura mínima do título do cabeçalho (~7px/char + 28px para padding + ícone de sort)
function getTitleMinWidth(label?: string): number {
  if (!label) return 40;
  return Math.max(40, label.length * 7 + 28);
}

/** Largura fixa da coluna de seleção (checkbox) — alinhada com `.col-checkbox` em `_tables.scss` */
const CHECKBOX_COLUMN_WIDTH_PX = 35;
const ACTIONS_COLUMN_WIDTH_PX = 120;

function getColumnMinWidth(column: { badgeLabels?: string[]; minWidth?: string | number; label?: string }): number | undefined {
  const titleMin = getTitleMinWidth(column.label);
  if (column.badgeLabels?.length) {
    const badgeMin = getMinWidthFromBadgeLabels(column.badgeLabels);
    return Math.max(badgeMin, titleMin);
  }
  if (column.minWidth != null) {
    const explicit = typeof column.minWidth === 'number' ? column.minWidth : parseInt(String(column.minWidth).replace('px', ''), 10);
    return Math.max(explicit, titleMin);
  }
  return undefined;
}

/**
 * Handlers podem ser `async` e usar `mutateAsync`; o `onError` do React Query já pode ter
 * exibido o toast, mas a Promise ainda rejeita e, sem `.catch`, vira overlay de runtime.
 */
function drainPossiblePromise(result: unknown): void {
  if (result != null && typeof (result as PromiseLike<unknown>).then === 'function') {
    void Promise.resolve(result).catch(() => {});
  }
}

// Helper para normalizar paginação (aceita snake_case da API ou camelCase interno)
const normalizePagination = (pagination: TableConfig<unknown>['pagination']): TablePagination | undefined => {
  if (!pagination) return undefined;
  
  const pag = pagination as TablePagination & {
    current_page?: number;
    last_page?: number;
    per_page?: number;
  };
  
  return {
    currentPage: pag.currentPage ?? pag.current_page ?? 1,
    lastPage: pag.lastPage ?? pag.last_page ?? 1,
    perPage: pag.perPage ?? pag.per_page ?? 15,
    total: pag.total,
    from: pag.from,
    to: pag.to,
  };
};

interface TableProps<T = Record<string, unknown>> {
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
  /** Se false, não sincroniza com o header global (use em modais) */
  syncWithHeader?: boolean;
  /** Envolve em layout flex/scroll de modal. Padrão: igual a `!syncWithHeader`. */
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
  layoutWrapper
}: TableProps<T>) {
  // Gerar ID único para a tabela
  const uniqueTableId = tableId || `table-${Math.random().toString(36).substr(2, 9)}`;
  
  // Detectar mobile
  const isMobile = useIsMobile();

  // Em modais (syncWithHeader=false), o toolbar local precisa existir no mesmo ciclo de commit do portal.
  // useEffect + requestAnimationFrame rodava depois da pintura: ao trocar de aba a tabela remontava e
  // havia um frame sem busca/ações — sensação de modal "piscando". useLayoutEffect atualiza antes da pintura.
  const [headerReady, setHeaderReady] = useState(syncWithHeader);
  useLayoutEffect(() => {
    setHeaderReady(true);
  }, [syncWithHeader]);
  
  // Internationalization
  const { t } = useI18n();

  // Hook para redimensionamento de colunas
  const {
    columnWidths,
    handleResizeStart,
    isResizing
  } = useColumnResizing({
    tableId: uniqueTableId,
    columns: config.columns,
    getMinWidthForColumn: (columnKey: string) => {
      const column = config.columns.find(col => col.key === columnKey);
      if (!column) return 40;

      // getColumnMinWidth já retorna max(badge, título)
      const colMin = getColumnMinWidth(column);
      if (colMin != null) return colMin;

      if (!column.label) return 40;
      return Math.max(40, column.label.length * 6 + 24);
    },
    onResizeEnd: () => {
      // Quando o redimensionamento termina, não fazer nada aqui
      // A limpeza da flag é feita no componente TableColumn
    }
  });

  // Table header context (para botões no header do Layout)
  const {
    setTitle: setHeaderTitle,
    setShowSearch: setHeaderShowSearch,
    setShowReload: setHeaderShowReload,
    setOnSearchClick: setHeaderOnSearchClick,
    setSearchPlaceholder: setHeaderSearchPlaceholder,
    setOnReloadClick: setHeaderOnReloadClick,
    setSearchValue: setHeaderSearchValue,
    searchValue: headerSearchValue,
    searchField: headerSearchField,
    setSearchField: setHeaderSearchField,
    availableSearchFields: headerAvailableSearchFields,
    setAvailableSearchFields: setHeaderAvailableSearchFields,
  } = useTableHeader();

  // Estado para controlar abertura do menu FAB
  const [isFabOpen, setIsFabOpen] = useState(false);
  
  // Fechar FAB ao clicar fora
  useEffect(() => {
    if (!isMobile || !isFabOpen) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (fabContainerRef.current && !fabContainerRef.current.contains(e.target as Node)) {
        setIsFabOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobile, isFabOpen]);
  
  // Estado para controlar linhas expandidas no mobile
  const [expandedRows, setExpandedRows] = useState<Set<number | string>>(new Set());
  
  // Estado para controlar qual dropdown de ações está aberto
  const [openActionDropdown, setOpenActionDropdown] = useState<number | string | null>(null);
  
  
  // Refs para calcular posição do dropdown
  const dropdownRefs = useRef<Map<number | string, HTMLDivElement>>(new Map());
  const buttonRefs = useRef<Map<number | string, HTMLButtonElement>>(new Map());
  const fabDropdownRef = useRef<HTMLDivElement | null>(null);
  const fabContainerRef = useRef<HTMLDivElement | null>(null);

  // Ajustar posição do FAB dinamicamente quando há legendas visíveis
  useEffect(() => {
    if (!isMobile || !fabContainerRef.current) return;

    const updateFabPosition = () => {
      const fabContainer = fabContainerRef.current;
      if (!fabContainer) return;

      // Pegar altura real da paginação se existir e estiver visível dentro do mesmo contexto
      // Buscar paginação no mesmo contexto da tabela para evitar pegar de outras tabelas
      const tableContainer = fabContainer.closest('.table-container, .table-mobile-container') || fabContainer.parentElement;
      const paginationEl = tableContainer ? tableContainer.querySelector('.table-mobile-pagination') : null;
      
      // Se tiver paginação visível, usa a altura dela (mínimo 56px). Se não, usa 16px (margem padrão)
      let baseBottom = 16;
      if (paginationEl && paginationEl.clientHeight > 0) {
        // Garantir que não fique em cima da paginação (altura mínima de segurança 56px ~ 3.5rem)
        baseBottom = Math.max(paginationEl.clientHeight, 56) + 8; // +8px de respiro
      }

      let bottomValue = baseBottom;

      // Restringir busca de legendas ao contexto atual (Modal ou Página) para evitar pegar elementos de fundo
      const contextContainer = fabContainer.closest('.modal-content, .responsive-dialog-mobile-content, .main-content, .card') || document.body;
      const legendas = contextContainer.querySelectorAll('.financeiro-resumo, .contrato-totais-resumo');
      
      const viewportHeight = window.innerHeight;
      const fabMargin = 12;

      legendas.forEach((legenda) => {
        const rect = legenda.getBoundingClientRect();
        
        // Verificar se a legenda está visível e na parte inferior da tela
        // 1. Altura > 0 e largura > 0 (visível)
        // 2. Topo abaixo da metade da tela (para evitar elementos no topo)
        // 3. Topo visível dentro da viewport
        if (rect.height > 0 && rect.width > 0 && rect.top > (viewportHeight / 2) && rect.top < viewportHeight) {
          // Se a legenda está visível no fundo, o FAB deve ficar acima dela
          const distFromBottom = viewportHeight - rect.top;
          const neededBottom = distFromBottom + fabMargin;
          
          if (neededBottom > bottomValue) {
            bottomValue = neededBottom;
          }
        }
      });
      
      fabContainer.style.bottom = `${bottomValue}px`;
    };

    // Executar imediatamente para evitar "pulo" visual
    updateFabPosition();

    // Reforçar após pequeno delay para garantir que o DOM está totalmente renderizado/estilizado
    const initialTimeout = setTimeout(updateFabPosition, 50);
    
    // Observar mudanças nas legendas (MutationObserver)
    const observer = new MutationObserver(updateFabPosition);
    
    // Observar mudanças no DOM (quando legendas aparecem/desaparecem ou mudam posição)
    const targetNode = document.body;
    observer.observe(targetNode, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });

    // Observar mudanças de scroll e resize (usar debounce para performance)
    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(updateFabPosition, 50);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', updateFabPosition);
    window.addEventListener('orientationchange', updateFabPosition);

    // Atualizar periodicamente para garantir que está correto (fallback)
    const intervalId = setInterval(updateFabPosition, 1000);

    return () => {
      clearTimeout(initialTimeout);
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateFabPosition);
      window.removeEventListener('orientationchange', updateFabPosition);
      clearInterval(intervalId);
      clearTimeout(scrollTimeout);
    };
  }, [isMobile]);
  
  // Calcular posição do dropdown para evitar sobreposição com paginação
  useEffect(() => {
    if (!isMobile || openActionDropdown === null) return;
    
    const buttonElement = buttonRefs.current.get(openActionDropdown);
    const dropdownElement = dropdownRefs.current.get(openActionDropdown);
    
    if (!buttonElement || !dropdownElement) return;
    
    const updatePosition = () => {
      const buttonRect = buttonElement.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      
      const paginationElement = document.querySelector('.table-mobile-pagination');
      const paginationRect = paginationElement ? paginationElement.getBoundingClientRect() : null;
      const paginationTop = paginationRect ? paginationRect.top : window.innerHeight;
      const limitBottom = paginationTop - 15;
      
      const gap = 4;
      const marginScreen = 8;
      const marginTop = 8;

      const spaceBelow = Math.max(0, limitBottom - buttonRect.bottom);
      const spaceAbove = Math.max(0, buttonRect.top - marginTop);
      
      dropdownElement.style.display = 'block';
      dropdownElement.style.visibility = 'hidden';
      dropdownElement.style.maxHeight = '';
      dropdownElement.style.position = 'static'; // Temporário para calcular altura
      const realDropdownHeight = Math.max(dropdownElement.offsetHeight || 160, 160); // Mínimo de 160px
      dropdownElement.style.visibility = '';

      const shouldOpenUp = (spaceBelow < realDropdownHeight && spaceAbove >= realDropdownHeight) || spaceBelow < 120;

      dropdownElement.style.setProperty('position', 'fixed', 'important');
      dropdownElement.style.setProperty('z-index', '99999', 'important');
      dropdownElement.style.left = 'auto';
      dropdownElement.style.right = `${Math.max(marginScreen, viewportWidth - buttonRect.right)}px`;
      dropdownElement.style.overflowY = 'auto';
      dropdownElement.style.display = 'block';

      if (shouldOpenUp) {
        dropdownElement.style.bottom = '';
        dropdownElement.style.top = 'auto';
        const maxHeight = Math.max(Math.min(realDropdownHeight, spaceAbove), 160); // Mínimo de 160px
        dropdownElement.style.maxHeight = `${maxHeight}px`;
        dropdownElement.classList.add('opens-up');
      } else {
        dropdownElement.style.top = `${buttonRect.bottom + gap}px`;
        dropdownElement.style.bottom = 'auto';
        const maxHeight = Math.max(Math.min(realDropdownHeight, spaceBelow), 160); // Mínimo de 160px
        dropdownElement.style.maxHeight = `${maxHeight}px`;
        dropdownElement.classList.remove('opens-up');
      }
    };
    
    updatePosition();
    requestAnimationFrame(updatePosition);
    
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isMobile, openActionDropdown]);

  // Calcular posição do dropdown do FAB
  useEffect(() => {
    if (!isMobile || !isFabOpen || !fabDropdownRef.current || !fabContainerRef.current) return;
    
    const updateDropdownPosition = () => {
      const dropdownElement = fabDropdownRef.current;
      const fabContainer = fabContainerRef.current;
      
      if (!dropdownElement || !fabContainer) return;
      
      const fabRect = fabContainer.getBoundingClientRect();
      
      // Posicionar o dropdown acima do botão FAB
      // bottom do dropdown = viewport height - top do FAB + margem (8px)
      const bottomPosition = window.innerHeight - fabRect.top + 8;
      
      dropdownElement.style.setProperty('position', 'fixed', 'important');
      dropdownElement.style.setProperty('bottom', `${bottomPosition}px`, 'important');
      dropdownElement.style.setProperty('right', '1rem', 'important');
      dropdownElement.style.setProperty('z-index', '1001', 'important');
      
      // Limitar altura para não sair da tela no topo
      // Altura máxima = espaço disponível acima do FAB - margem superior (20px)
      const maxH = Math.max(100, fabRect.top - 20);
      dropdownElement.style.setProperty('max-height', `${maxH}px`, 'important');
    };

    updateDropdownPosition();
    
    // Atualizar ao redimensionar ou rolar
    window.addEventListener('resize', updateDropdownPosition);
    window.addEventListener('scroll', updateDropdownPosition, true);
    
    return () => {
      window.removeEventListener('resize', updateDropdownPosition);
      window.removeEventListener('scroll', updateDropdownPosition, true);
    };
  }, [isMobile, isFabOpen]);
  
  const {
    columns,
    data,
    loading = false,
    pagination: configPagination,
    filters = [],
    actions: _actions = [],
    bulkActions = [],
    searchable = true,
    searchPlaceholder,
    sortable = true,
    sortColumn,
    sortDirection,
    selectable = true,
    multiSelect = false,
    emptyMessage,
    loadingMessage: _loadingMessage,
    customControls,
    customControlsAfterActions,
    customFilters,
    searchField: configSearchField = '',
    searchFields: configSearchFields,
    showToolbar: showToolbarFromConfig = true,
  } = config;

  const showToolbar = showToolbarFromConfig !== false;

  // Valores padrão traduzidos
  const defaultSearchPlaceholder = searchPlaceholder || t('layout.searchPlaceholder');
  const defaultEmptyMessage = emptyMessage || t('messages.noData');
  const defaultLoadingMessage = _loadingMessage || t('messages.loading');

  // Padrão: 'id' quando disponível nos searchFields, senão primeiro da lista
  const [localSearchField, setLocalSearchField] = useState<string>(() => {
    if (!configSearchFields?.length) return configSearchField || '';
    const hasTodos = configSearchFields.some((f: { key: string }) => f.key === 'todos');
    if (hasTodos) return 'todos';
    const hasId = configSearchFields.some((f: { key: string }) => f.key === 'id');
    return hasId ? 'id' : (configSearchField || configSearchFields[0].key);
  });

  // Determinar qual campo usar: com sync usamos header; sem sync usamos apenas local
  const selectedSearchField = syncWithHeader ? (headerSearchField || localSearchField) : localSearchField;

  const [openDropdown, setOpenDropdown] = useState<number | null>(null);

  // Normalizar paginação
  const normalizedPagination = useMemo(() => normalizePagination(configPagination), [configPagination]);

  // Largura mínima da tabela = soma das colunas (permite scroll horizontal quando não cabe)
  const tableMinWidth = useMemo(() => {
    const visibleColumns = columns.filter(col => !col.hidden);
    let total = 0;
    visibleColumns.forEach(col => {
      const w = columnWidths[col.key];
      const colMin = getColumnMinWidth(col);
      if (w !== undefined) {
        total += colMin != null ? Math.max(w, colMin) : w;
      } else if (col.width !== undefined) {
        const px = typeof col.width === 'string' ? parseInt(col.width.replace('px', ''), 10) : col.width;
        total += Math.max(Number.isNaN(px) ? 120 : px, colMin ?? 0);
      } else {
        total += colMin ?? 120;
      }
    });
    if (selectable) total += CHECKBOX_COLUMN_WIDTH_PX;
    if (_actions.length > 0) total += ACTIONS_COLUMN_WIDTH_PX;
    return total;
  }, [columns, columnWidths, selectable, _actions.length]);

  // Memoizar dados filtrados para evitar loops infinitos
  const filteredData = useMemo(() => {
    if (!customFilters) return data;
    return customFilters(data);
  }, [data, customFilters]);

  // Callback memoizado para mudanças de seleção
  const handleSelectionChange = useCallback((selectedItems: T[]) => {
    // Atualizar estado local e chamar callback externo
    onSelectionChange?.(selectedItems);
  }, [onSelectionChange]);

  const {
    state,
    actions: tableActions,
    paginatedData,
    totalPages,
    isAllSelected: _isAllSelected,
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
    onSearch: onSearch ? (term: string, field?: string) => onSearch(term, field || selectedSearchField) : undefined,
    onPageChange,
    onPageSizeChange,
    onRefresh,
  });

  const [isLoadingSelectAllPages, setIsLoadingSelectAllPages] = useState(false);

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
      const items = Array.isArray(result) ? result : [];
      tableActions.setSelectedItems(items);
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
    _isAllSelected
  );

  const isAllPagesSelected = Boolean(
    showSelectAllPagesCheckbox &&
    state.selectedItems.length >= (normalizedPagination?.total ?? 0) &&
    (normalizedPagination?.total ?? 0) > 0
  );

  // Refs para armazenar callbacks e evitar recriação
  const onRefreshRef = useRef(onRefresh);
  const onSearchRef = useRef(onSearch);
  const tableActionsRef = useRef(tableActions);
  const selectedSearchFieldRef = useRef(selectedSearchField);
  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const autoRowsAppliedRef = useRef(false);
  
  // Atualizar refs quando mudarem
  useEffect(() => {
    onRefreshRef.current = onRefresh;
    onSearchRef.current = onSearch;
    tableActionsRef.current = tableActions;
    selectedSearchFieldRef.current = selectedSearchField;
  }, [onRefresh, onSearch, tableActions, selectedSearchField]);

  // Cálculo dinâmico de linhas por página baseado no espaço disponível
  useEffect(() => {
    if (!normalizedPagination || !onPageSizeChange || autoRowsAppliedRef.current) return;

    const calculateAndApply = () => {
      const container = tableContainerRef.current;
      if (!container) return;

      if (!syncWithHeader) {
        // Modal/aba: mede a altura real do table-responsive (toolbar já renderizado)
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

      // Página (syncWithHeader=true): usa o scroll container pai
      const scrollContainer = container.closest('[style*="flex: 1"]') ||
                             container.closest('[style*="overflow: auto"]');
      if (!scrollContainer) return;
      const availableHeight = scrollContainer.getBoundingClientRect().height;
      const optimalRows = Math.max(5, Math.min(30, Math.floor((availableHeight - 120) / 35)));
      if (normalizedPagination.perPage !== optimalRows) {
        onPageSizeChange(optimalRows);
        autoRowsAppliedRef.current = true;
      }
    };

    // Aguarda o toolbar (headerReady) e o layout do modal estarem estáveis
    const timer = setTimeout(calculateAndApply, 50);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedPagination ? 'ready' : 'waiting']);

  // Handler para o botão de auditar com gerenciamento de loading
  const handleAuditClick = useCallback(async () => {
    if (!onAudit || state.selectedItems.length !== 1) {
      return;
    }
    
    const selectedItem = state.selectedItems[0];
    if (!selectedItem) {
      return;
    }
    
    try {
      const result = onAudit(selectedItem);
      
      if (result instanceof Promise) {
        await result;
      }
    } catch (error) {
      // Erro silencioso - a auditoria pode falhar sem quebrar a UI
    } finally {
      setTimeout(() => {
        if (onRefreshRef.current) {
          onRefreshRef.current();
        } else if (tableActionsRef.current?.refresh) {
          tableActionsRef.current.refresh();
        }
      }, 0);
    }
  }, [onAudit, state.selectedItems]);

  // Callbacks memoizados para evitar recriação
  const handleReloadClick = useCallback(() => {
    if (onRefreshRef.current) {
      onRefreshRef.current();
    } else {
      // Usar setTimeout para evitar atualização durante render
      setTimeout(() => {
        tableActionsRef.current.refresh();
      }, 0);
    }
  }, []);

  // Refs para valores atuais de busca (usado para callbacks estáveis)
  const currentSearchTermRef = useRef(state.searchTerm);
  const currentSelectedSearchFieldRef = useRef(selectedSearchField);

  // Não sincronizar search prop -> state: quando o pai passa search, o input já usa value={search}.
  // O sync causava loop: usuário digitava "21", pai passava "2" (desatualizado), sync sobrescrevia com "2".

  // Calcular valores de paginação
  const paginationValues = useMemo(() => {
    const currentPage = normalizedPagination?.currentPage ?? state.currentPage;
    const perPage = normalizedPagination?.perPage ?? state.pageSize;
    const total = normalizedPagination?.total ?? data.length;

    // Calcular lastPage corretamente
    let lastPage: number = normalizedPagination?.lastPage ?? 1;
    if (!normalizedPagination?.lastPage) {
      if (normalizedPagination && normalizedPagination.total !== undefined) {
        // Se temos total do servidor, calcular lastPage
        lastPage = Math.max(1, Math.ceil(total / perPage));
      } else {
        // Paginação local
        lastPage = totalPages || Math.max(1, Math.ceil(data.length / perPage));
      }
    }
    lastPage = Math.max(1, lastPage); // Garantir que seja pelo menos 1

    const from = normalizedPagination?.from ?? ((currentPage - 1) * perPage) + 1;
    const to = normalizedPagination?.to ?? Math.min(currentPage * perPage, total);

    // Calcular páginas visíveis
    const getVisiblePages = () => {
      if (lastPage <= 1) return [1]; // Sempre mostrar pelo menos a página 1
      
      const delta = 2;
      const range: (number | string)[] = [];
      const rangeWithDots: (number | string)[] = [];

      for (let i = Math.max(2, currentPage - delta); i <= Math.min(lastPage - 1, currentPage + delta); i++) {
        range.push(i);
      }

      if (currentPage - delta > 2) {
        rangeWithDots.push(1, '...');
      } else {
        rangeWithDots.push(1);
      }

      rangeWithDots.push(...range);

      if (currentPage + delta < lastPage - 1) {
        rangeWithDots.push('...', lastPage);
      } else if (lastPage > 1) {
        rangeWithDots.push(lastPage);
      }

      return rangeWithDots;
    };

    return {
      currentPage,
      lastPage: lastPage as number,
      perPage,
      total,
      from,
      to,
      visiblePages: getVisiblePages()
    };
  }, [normalizedPagination, state.currentPage, state.pageSize, totalPages, data.length]);

  useEffect(() => {
    currentSearchTermRef.current = state.searchTerm;
    currentSelectedSearchFieldRef.current = selectedSearchField;
  }, [state.searchTerm, selectedSearchField]);

  // Callback para busca no header: usa valor passado (do input) para evitar estado desatualizado
  const handleHeaderSearchClickRef = useRef<(value?: string) => void>(() => {});
  handleHeaderSearchClickRef.current = (value?: string) => {
    if (value !== undefined) {
      tableActions.setSearchTerm(value);
      onSearchRef.current?.(value, selectedSearchFieldRef.current || '');
    } else {
      tableActions.executeSearch();
    }
  };
  const handleHeaderSearchClick = useCallback((value?: string) => {
    handleHeaderSearchClickRef.current(value);
  }, []);

  // Estabilizar configSearchFields para evitar loops de renderização
  const stableSearchFields = useMemo(() => {
    return JSON.stringify(configSearchFields);
  }, [configSearchFields]);

  // Ref para controlar se esta tabela deve sincronizar seu estado inicial com o header
  const initialSyncRef = useRef(false);
  /** Evita espelhar estado vazio da tabela no header antes do primeiro pull do header → tabela (ex.: busca no dashboard). */
  const tableSearchHydratedFromHeaderRef = useRef(false);

  // Registrar botões no contexto do header (não executar quando em modal)
  useEffect(() => {
    if (!syncWithHeader) return;
    const timeoutId = setTimeout(() => {
      // 1. Atualizar Provider primeiro (evita "Cannot update Table while rendering Provider")
      setHeaderTitle(title || 'Lista');
      setHeaderShowSearch(searchable || false);
      setHeaderShowReload(showToolbar);
      // Wrapper evita que React invoque o callback (setState trata função como updater)
      setHeaderOnSearchClick(() => handleHeaderSearchClick);
      setHeaderSearchPlaceholder(defaultSearchPlaceholder);
      setHeaderOnReloadClick(() => handleReloadClick);

      const parsedFields = configSearchFields || [];

      // Configurar campos de busca disponíveis
      if (parsedFields.length > 0) {
        const fields = parsedFields.map(f => ({ id: f.key, label: f.label }));
        const currentFieldsJson = JSON.stringify(headerAvailableSearchFields);
        const newFieldsJson = JSON.stringify(fields);

        if (currentFieldsJson !== newFieldsJson) {
          setHeaderAvailableSearchFields(fields);
        }

        const parsedFieldKeys = new Set(parsedFields.map((f: { key: string }) => f.key));
        const hasId = parsedFields.some((f: { key: string }) => f.key === 'id');
        const defaultField = parsedFieldKeys.has('todos')
          ? 'todos'
          : hasId
            ? 'id'
            : (configSearchField || parsedFields[0]?.key || '');
        const headerFieldIsValid = Boolean(headerSearchField && parsedFieldKeys.has(headerSearchField));
        // Só define o campo padrão se o header não tiver um campo válido para esta tabela (evita voltar para "id" ao digitar).
        if (defaultField && !headerFieldIsValid) {
          setHeaderSearchField(defaultField);
        }
      } else {
        const defaults = [
          { id: 'nome', label: t('table.clientName') },
          { id: 'cnpj_cpf', label: t('form.cnpj') + '/CPF' },
          { id: 'whatsapp', label: t('form.phone') },
          { id: 'email', label: t('form.email') }
        ];

        const currentFieldsJson = JSON.stringify(headerAvailableSearchFields);
        const defaultsJson = JSON.stringify(defaults);

        if (currentFieldsJson !== defaultsJson) {
          setHeaderAvailableSearchFields(defaults);
        }
      }

      // 2. Sync inicial Table <-> Header em macrotask separado (evita setState durante render)
      if (!initialSyncRef.current) {
        initialSyncRef.current = true;
        setTimeout(() => {
          if (search !== undefined) {
            tableActions.setSearchTerm(search);
          } else if (headerSearchValue && !state.searchTerm) {
            tableActions.setSearchTerm(headerSearchValue);
          } else if (state.searchTerm && !headerSearchValue) {
            setHeaderSearchValue(state.searchTerm);
          }
        }, 0);
      }
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncWithHeader, title, searchable, stableSearchFields, showToolbar]);

  // Limpar quando desmontar (apenas se sincronizou com header)
  useEffect(() => {
    if (!syncWithHeader) return;
    return () => {
      setHeaderOnSearchClick(null);
      setHeaderOnReloadClick(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncWithHeader]);

  // Sincronizar busca: Header -> Table (apenas se search prop não foi passado e syncWithHeader)
  useEffect(() => {
    if (!syncWithHeader) return;
    if (headerSearchValue === state.searchTerm) {
      tableSearchHydratedFromHeaderRef.current = true;
    }
  }, [syncWithHeader, headerSearchValue, state.searchTerm]);

  useEffect(() => {
    if (!syncWithHeader) return;
    if (initialSyncRef.current && search === undefined && headerSearchValue !== state.searchTerm) {
      const timeoutId = setTimeout(() => {
        tableActions.setSearchTerm(headerSearchValue);
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [syncWithHeader, headerSearchValue, state.searchTerm, tableActions, search]);

  // Sincronizar busca: Table -> Header (quando usuário digita na tabela, manter header em dia para evitar overwrite)
  useEffect(() => {
    if (!syncWithHeader) return;
    // Antes do header ser copiado para o estado da tabela, não enviar '' ao contexto (apaga o que o usuário digitou na navbar).
    if (
      !tableSearchHydratedFromHeaderRef.current &&
      state.searchTerm === '' &&
      headerSearchValue !== ''
    ) {
      return;
    }
    // Navbar já limpou; aguardar Header→Table alinhar o estado antes de recolocar o termo antigo no contexto.
    if (headerSearchValue === '' && state.searchTerm !== '') {
      return;
    }
    // Enquanto o header está à frente (digitação na navbar antes do efeito Header→Table), não sobrescrever com estado defasado.
    const isHeaderAheadOfTable =
      state.searchTerm !== '' &&
      headerSearchValue.length > state.searchTerm.length &&
      headerSearchValue.startsWith(state.searchTerm);
    if (isHeaderAheadOfTable) {
      return;
    }
    // Usuário apagou no header; estado da tabela ainda não refletiu o termo menor.
    const isHeaderShrinkingWhileTableStale =
      state.searchTerm !== '' &&
      headerSearchValue !== '' &&
      state.searchTerm.length > headerSearchValue.length &&
      state.searchTerm.startsWith(headerSearchValue);
    if (isHeaderShrinkingWhileTableStale) {
      return;
    }
    if (state.searchTerm !== headerSearchValue) {
      setHeaderSearchValue(state.searchTerm);
    }
  }, [syncWithHeader, state.searchTerm, headerSearchValue, setHeaderSearchValue]);

  // Propagar mudança de campo para o componente pai e estado local
  useEffect(() => {
    if (!syncWithHeader) return;
    if (headerSearchField && headerSearchField !== localSearchField) {
      // Usar setTimeout para evitar "Cannot update a component while rendering a different component"
      const timeoutId = setTimeout(() => {
        setLocalSearchField(headerSearchField);
        onSearchFieldChange?.(headerSearchField);
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [syncWithHeader, headerSearchField, localSearchField, onSearchFieldChange]);

  // Fechar dropdown quando clicar fora (callback memoizado)
  const handleClickOutside = useCallback(() => {
    setOpenDropdown(null);
  }, []);

  useEffect(() => {
    if (openDropdown !== null) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openDropdown, handleClickOutside]);

  const visibleColumns = useMemo(
    () => columns.filter(col => !col.hidden),
    [columns]
  );

  const getColumnWidthPx = useCallback((column: (typeof columns)[number]): number | undefined => {
    const rawWidth = columnWidths[column.key];
    const colMinWidth = getColumnMinWidth(column);
    if (rawWidth !== undefined) {
      return colMinWidth != null ? Math.max(rawWidth, colMinWidth) : rawWidth;
    }
    if (column.width !== undefined) {
      const px = typeof column.width === 'string'
        ? parseInt(column.width.replace('px', ''), 10)
        : column.width;
      return Number.isNaN(px) ? undefined : px;
    }
    return colMinWidth;
  }, [columnWidths]);

  const renderTableColGroup = () => (
    <colgroup>
      {selectable && (
        <col className="col-checkbox" style={{ width: CHECKBOX_COLUMN_WIDTH_PX }} />
      )}
      {visibleColumns.map(column => {
        const widthPx = getColumnWidthPx(column);
        return (
          <col
            key={column.key}
            style={widthPx != null ? { width: widthPx } : undefined}
          />
        );
      })}
      {_actions.length > 0 && (
        <col style={{ width: ACTIONS_COLUMN_WIDTH_PX }} />
      )}
    </colgroup>
  );

  // Renderizar cabeçalho da tabela
  const renderTableHeader = () => {
    return (
      <thead>
        <tr>
          {/* Checkbox de seleção - renderiza sempre que selectable for true */}
          {selectable && (
            <th className="text-center col-checkbox">
              <input
                className="form-check-input"
                type="checkbox"
                id={`select-all-${Math.random().toString(36).substr(2, 9)}`}
                name="selectAll"
                checked={_isAllSelected}
                onChange={() => {
                  if (_isAllSelected) {
                    tableActions.clearSelection();
                  } else {
                    tableActions.selectAll();
                  }
                }}
              />
            </th>
          )}
          
          {/* Colunas */}
          {visibleColumns
            .map((column, index) => {
              const rawWidth = columnWidths[column.key];
              const colMinWidth = getColumnMinWidth(column);
              const effectiveHeaderWidth = rawWidth !== undefined
                ? (colMinWidth != null ? Math.max(rawWidth, colMinWidth) : rawWidth)
                : (colMinWidth ?? undefined);
              return (
              <TableColumn
                key={column.key}
                column={column}
                sortColumn={state.sortColumn}
                sortDirection={state.sortDirection}
                onSort={tableActions.setSort}
                columnWidth={effectiveHeaderWidth}
                onResizeStart={handleResizeStart}
                onResizeEnd={() => {
                  // Callback chamado quando redimensionamento termina
                }}
                getMinWidthForColumn={(columnKey: string) => {
                  const col = config.columns.find(c => c.key === columnKey);
                  if (!col?.label) return 30;
                  return Math.max(30, col.label.length * 7 + 20);
                }}
                isResizing={isResizing}
                isLastColumn={index === visibleColumns.length - 1}
              />
            );
            })}
          
          {/* Coluna de ações */}
          {_actions.length > 0 && (
            <th className="text-center col-actions">
              Ações
            </th>
          )}
          
        </tr>
      </thead>
    );
  };

  // Identificar campos essenciais para exibição resumida
  const getEssentialColumns = useMemo(() => {
    // Campos prioritários para exibição resumida
    const essentialKeys = ['id', 'ativo', 'satisfacao', 'razao_social', 'nome_fantasia', 'nome', 'cnpj', 'cpf', 'cnpj_cpf', 'data_cadastro', 'created_at'];
    
    return columns.filter(col => {
      const key = col.key.toLowerCase();
      return essentialKeys.some(essential => key.includes(essential));
    });
  }, [columns]);

  // Renderizar corpo da tabela em modo mobile (cards)
  const renderMobileBody = () => {
    if (loading) {
      return (
        <div className="table-mobile-loading">
          <Spinner size="sm" variant="primary" aria-label={defaultLoadingMessage} />
        </div>
      );
    }

    if (paginatedData.length === 0) {
      return (
        <div className="table-mobile-empty">
          {defaultEmptyMessage}
        </div>
      );
    }

    return (
      <div className="table-mobile-cards">
        {paginatedData.map((item, index) => {
          // No mobile, não usar seleção - checkbox e seleção removidos
          const isExpanded = expandedRows.has(item.id);
          
          // Obter campos essenciais
          const essentialFields = getEssentialColumns.slice(0, 5); // Limitar a 5 campos essenciais
          const allFields = columns.filter(col => !col.hidden);
          const hiddenFields = allFields.filter(col => !essentialFields.includes(col));
          
          const toggleExpand = (e: React.MouseEvent) => {
            e.stopPropagation();
            const newExpanded = new Set(expandedRows);
            if (isExpanded) {
              newExpanded.delete(item.id);
            } else {
              newExpanded.add(item.id);
            }
            setExpandedRows(newExpanded);
          };

          return (
            <div
              key={item.id}
              className={`table-mobile-card ${isExpanded ? 'expanded' : ''}`}
              onClick={() => {
                // No mobile, não selecionar ao clicar no card, apenas chamar onRowClick se existir
                drainPossiblePromise(onRowClick?.(item, index));
              }}
            >
              {/* Header do card */}
              <div className="table-mobile-card-header">
                <div className="table-mobile-card-header-left">
                  {/* Checkbox removido no mobile - não é necessário */}
                  
                  {/* Campos essenciais */}
                  <div className="table-mobile-card-essential">
                    {essentialFields.map(column => {
                      const value = column.render ? column.render(item, index) : String(item[column.key as keyof T] || '');
                      const key = column.key.toLowerCase();
                      
                      // Formatação especial para alguns campos
                      let displayValue = value;
                      let label = column.label || column.key;
                      
                      if (key.includes('ativo')) {
                        displayValue = value === 'true' || value === 'Sim' || value === '1' ? '✓' : '✗';
                      }
                      
                      return (
                        <div key={column.key} className={`table-mobile-field`}>
                          <span className="field-label">{label}:</span>
                          <span className="field-value">{displayValue}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* Botão de expandir e menu de ações */}
                <div className="table-mobile-card-header-right">
                  {hiddenFields.length > 0 && (
                    <button
                      type="button"
                      className="table-mobile-expand-btn"
                      onClick={toggleExpand}
                      aria-label={isExpanded ? t('ui.hide') : t('ui.show')}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        {isExpanded ? (
                          <polyline points="18 15 12 9 6 15"></polyline>
                        ) : (
                          <polyline points="6 9 12 15 18 9"></polyline>
                        )}
                      </svg>
                    </button>
                  )}
                  
                  {/* Botão de ações - sempre visível, abaixo do botão expandir */}
                  <div className="table-mobile-actions">
                    <button
                      ref={(el) => {
                        if (el) {
                          buttonRefs.current.set(item.id, el);
                        } else {
                          buttonRefs.current.delete(item.id);
                        }
                      }}
                      type="button"
                      className="table-mobile-menu-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                      setOpenActionDropdown(openActionDropdown === item.id ? null : item.id);
                    }}
                    aria-label={t('ui.actionsMenu')}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="1"></circle>
                        <circle cx="12" cy="5" r="1"></circle>
                        <circle cx="12" cy="19" r="1"></circle>
                      </svg>
                    </button>
                    
                    {openActionDropdown === item.id && isMobile && typeof document !== 'undefined' && createPortal(
                      <>
                        <div 
                          className="table-mobile-dropdown-overlay"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenActionDropdown(null);
                          }}
                        />
                        <div 
                          ref={(el) => {
                            if (el) {
                              dropdownRefs.current.set(item.id, el);
                            } else {
                              dropdownRefs.current.delete(item.id);
                            }
                          }}
                          className="table-mobile-dropdown"
                        >
                          {_actions.length > 0 ? (
                            _actions
                              .filter(action => {
                                if (typeof action.hidden === 'function') {
                                  return !action.hidden(item);
                                }
                                return !action.hidden;
                              })
                              .map((action) => {
                                const isDisabled = typeof action.disabled === 'function' 
                                  ? action.disabled(item) 
                                  : action.disabled;
                                
                                return (
                                  <button
                                    key={action.key}
                                    type="button"
                                    className={`table-mobile-dropdown-item ${action.variant === 'danger' ? 'danger' : ''}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenActionDropdown(null);
                                      if (!isDisabled && onActionClick) {
                                        drainPossiblePromise(onActionClick(action, item, index));
                                      } else if (!isDisabled && action.onClick) {
                                        drainPossiblePromise(action.onClick(item, index));
                                      }
                                    }}
                                    disabled={isDisabled}
                                  >
                                    {action.icon && <i className={action.icon}></i>}
                                    <span>{action.label}</span>
                                  </button>
                                );
                              })
                          ) : (
                            bulkActions
                              .filter(bulkAction => {
                                const label = bulkAction.label.toLowerCase();
                                return label.includes('editar') ||
                                       label.includes('deletar') ||
                                       label.includes('inserir') ||
                                       label.includes('cancelar') ||
                                       label.includes('selecionar') ||
                                       label.includes('backup') ||
                                       label.includes('terminal') ||
                                       label.includes('testar') ||
                                       label.includes('test connection') ||
                                       Boolean(bulkAction.dropdown);
                              })
                              .flatMap(bulkAction => {
                                const actionKey = bulkAction.key || bulkAction.label.toLowerCase().replace(/\s+/g, '-');
                                if (bulkAction.dropdown && bulkAction.dropdown.length > 0) {
                                  return bulkAction.dropdown.map((subItem, subIdx) => {
                                    const isItemDisabled = typeof subItem.disabled === 'function'
                                      ? subItem.disabled([item])
                                      : Boolean(subItem.disabled);
                                    return (
                                      <button
                                        key={`${actionKey}-dd-${subIdx}`}
                                        type="button"
                                        className={`table-mobile-dropdown-item ${bulkAction.variant === 'danger' ? 'danger' : ''}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setOpenActionDropdown(null);
                                          if (isItemDisabled) return;
                                          drainPossiblePromise(subItem.action([item]));
                                        }}
                                        disabled={isItemDisabled}
                                      >
                                        <span>{subItem.label}</span>
                                      </button>
                                    );
                                  });
                                }
                                const isBulkDisabled = typeof bulkAction.disabled === 'function'
                                  ? bulkAction.disabled([item])
                                  : Boolean(bulkAction.disabled);
                                return [
                                  <button
                                    key={actionKey}
                                    type="button"
                                    className={`table-mobile-dropdown-item ${bulkAction.variant === 'danger' ? 'danger' : ''}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenActionDropdown(null);
                                      if (isBulkDisabled) return;
                                      if (bulkAction.onClick) {
                                        drainPossiblePromise(bulkAction.onClick([item]));
                                      } else if (onBulkActionClick) {
                                        drainPossiblePromise(onBulkActionClick(bulkAction, [item]));
                                      }
                                    }}
                                    disabled={isBulkDisabled}
                                  >
                                    <span>{bulkAction.label}</span>
                                  </button>
                                ];
                              })
                          )}
                        </div>
                      </>,
                      document.body
                    )}
                  </div>
                </div>
              </div>
              
              {/* Detalhes expandidos */}
              {isExpanded && hiddenFields.length > 0 && (
                <div className="table-mobile-card-details">
                  {hiddenFields.map(column => {
                    const value = column.render ? column.render(item, index) : String(item[column.key as keyof T] || '');
                    if (!value || value === '') return null;
                    
                    return (
                      <div key={column.key} className="table-mobile-field">
                        <span className="field-label">{column.label || column.key}:</span>
                        <span className="field-value">{value}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Renderizar corpo da tabela
  const renderTableBody = () => {
    // No mobile, usar renderização de cards
    if (isMobile) {
      return renderMobileBody();
    }
    
    if (loading) {
      return (
        <tbody>
          <tr>
            <td colSpan={columns.length + (selectable ? 1 : 0) + (_actions.length > 0 ? 1 : 0)} className="text-center">
              <Spinner size="sm" variant="primary" aria-label={defaultLoadingMessage} />
            </td>
          </tr>
        </tbody>
      );
    }

    if (paginatedData.length === 0) {
      return (
        <tbody>
          <tr>
            <td colSpan={columns.length + (selectable ? 1 : 0) + (_actions.length > 0 ? 1 : 0)} className="text-center">
              {defaultEmptyMessage}
            </td>
          </tr>
        </tbody>
      );
    }

    return (
      <tbody>
        {paginatedData.map((item, index) => {
          const isSelected = state.selectedItems.some(selected => selected.id === item.id);
          
          return (
            <tr
              key={item.id}
              className={`${isSelected ? 'table-active' : ''} table-row-clickable`}
              onClick={() => {
                // Selecionar/deselecionar item ao clicar na linha
                if (selectable) {
                  tableActions.toggleSelection(item);
                }
                // Chamar callback de clique na linha se existir
                drainPossiblePromise(onRowClick?.(item, index));
              }}
              onDoubleClick={() => {
                // Chamar callback de double-click na linha se existir
                drainPossiblePromise(onRowDoubleClick?.(item, index));
              }}
            >
              {/* Checkbox de seleção */}
              {selectable && (
                <td className="text-center col-checkbox" onClick={(e) => e.stopPropagation()}>
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      e.stopPropagation();
                      tableActions.toggleSelection(item);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    id={`${uniqueTableId}-checkbox-${item.id}`}
                    name={`${uniqueTableId}-checkbox-${item.id}`}
                  />
                </td>
              )}
              
              {/* Células de dados: largura fixa por coluna; minWidth = width para não encolher ao arrastar outra */}
              {visibleColumns
                .map(column => {
                  const resizedWidth = columnWidths[column.key];
                  const colMinWidth = getColumnMinWidth(column);
                  let widthStyle: React.CSSProperties;
                  if (resizedWidth !== undefined) {
                    const effectiveWidth = colMinWidth != null ? Math.max(resizedWidth, colMinWidth) : resizedWidth;
                    widthStyle = { width: `${effectiveWidth}px`, minWidth: `${effectiveWidth}px`, maxWidth: `${effectiveWidth}px` };
                  } else {
                    const w = column.width;
                    const widthVal = w != null ? (typeof w === 'number' ? `${w}px` : w) : undefined;
                    const minVal = colMinWidth != null ? `${colMinWidth}px` : widthVal;
                    const derivedWidth = widthVal ?? (colMinWidth != null ? `${colMinWidth}px` : undefined);
                    // Colunas de badge sem width explícito: limitar maxWidth ao valor calculado para não crescer além do necessário
                    const maxVal = column.maxWidth != null
                      ? (typeof column.maxWidth === 'number' ? `${column.maxWidth}px` : column.maxWidth)
                      : (column.badgeLabels?.length && !w ? derivedWidth : undefined);
                    widthStyle = {
                      width: derivedWidth,
                      minWidth: minVal ?? undefined,
                      maxWidth: maxVal,
                    };
                  }
                  return (
                    <td
                      key={column.key}
                      className={[column.align ? `text-${column.align}` : '', column.className].filter(Boolean).join(' ')}
                      style={widthStyle}
                    >
                      {column.render ? column.render(item, index) : String(item[column.key as keyof T] || '')}
                    </td>
                  );
                })}
              
              {/* Coluna de ações */}
              {_actions.length > 0 && (
                <td className="text-center col-actions" onClick={(e) => e.stopPropagation()}>
                  <div className="table-actions-desktop">
                    <button
                      type="button"
                      className="table-action-menu-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                      setOpenActionDropdown(openActionDropdown === item.id ? null : item.id);
                    }}
                    aria-label={t('ui.actionsMenu')}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="1"></circle>
                        <circle cx="12" cy="5" r="1"></circle>
                        <circle cx="12" cy="19" r="1"></circle>
                      </svg>
                    </button>
                    
                    {openActionDropdown === item.id && (
                      <>
                        <div 
                          className="table-dropdown-overlay"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenActionDropdown(null);
                          }}
                        />
                        <div className="table-dropdown">
                          {_actions
                            .filter(action => {
                              if (typeof action.hidden === 'function') {
                                return !action.hidden(item);
                              }
                              return !action.hidden;
                            })
                            .map((action) => {
                              const isDisabled = typeof action.disabled === 'function' 
                                ? action.disabled(item) 
                                : action.disabled;
                              
                              return (
                                <button
                                  key={action.key}
                                  type="button"
                                  className={`table-dropdown-item ${action.variant === 'danger' ? 'danger' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenActionDropdown(null);
                                    if (!isDisabled && onActionClick) {
                                      drainPossiblePromise(onActionClick(action, item, index));
                                    } else if (!isDisabled && action.onClick) {
                                      drainPossiblePromise(action.onClick(item, index));
                                    }
                                  }}
                                  disabled={isDisabled}
                                >
                                  {action.icon && <i className={action.icon}></i>}
                                  <span>{action.label}</span>
                                </button>
                              );
                            })}
                        </div>
                      </>
                    )}
                  </div>
                </td>
              )}
              
            </tr>
          );
        })}
      </tbody>
    );
  };


  const tableElement = (
    <div
      ref={tableContainerRef}
      className={`${className} table-container-custom`}
      style={{ ['--table-min-width' as string]: `${tableMinWidth}px` }}
    >
      
      {/* Header com botões de ação e filtros - Oculto no mobile */}
          {headerReady && !isMobile && showToolbar && (bulkActions.length > 0 || searchable || normalizedPagination || (!normalizedPagination && data.length > 0)) && (
        <div className="border-bottom table-header-custom">
          {/* Linha 1: Botões de ação */}
          {(bulkActions.length > 0 || customControlsAfterActions) && (
            <div className="d-flex align-items-center justify-content-between table-header-content">
              <div className="d-flex table-header-flex">
                {bulkActions.map((bulkAction, index) => {
              const isNewButton = bulkAction.label.toLowerCase().includes('nova') || bulkAction.label.toLowerCase().includes('novo');
              const isEditarButton = bulkAction.label.toLowerCase().includes('editar');
              const isExcluirButton = bulkAction.label.toLowerCase().includes('deletar');
              const isImprimirButton = bulkAction.label.toLowerCase().includes('imprimir');
              const noSelectionRequired = bulkAction.requiresSelection === false || isNewButton || isImprimirButton;
              const isDisabledBySelection = !noSelectionRequired && state.selectedItems.length === 0;
              const isDisabledByCondition = typeof bulkAction.disabled === 'function'
                ? bulkAction.disabled(state.selectedItems)
                : Boolean(bulkAction.disabled);
              const isDisabled = isDisabledBySelection || isDisabledByCondition;

              if (isMobile) {
                if (isEditarButton || isNewButton || isExcluirButton) {
                  return null;
                }
              }

              if (bulkAction.dropdown) {
                const isOpen = openDropdown === index;
                return (
                  <div key={index} className="dropdown table-dropdown-relative">
                    <BulkActionButton
                      label={bulkAction.label}
                      variant={
                        (bulkAction.variant as 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark') || 'primary'
                      }
                      dropdown
                      disabled={isDisabled}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setOpenDropdown(isOpen ? null : index);
                      }}
                      aria-expanded={isOpen}
                    />
                    {isOpen && (
                      <ul className="dropdown-menu show">
                        {bulkAction.dropdown.map((item, itemIndex) => {
                          const isItemDisabled = typeof item.disabled === 'function'
                            ? item.disabled(state.selectedItems)
                            : item.disabled || false;
                          return (
                            <li key={itemIndex}>
                              <button
                                type="button"
                                className="dropdown-item"
                                disabled={isItemDisabled}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (!isItemDisabled) {
                                    drainPossiblePromise(item.action(state.selectedItems));
                                    setOpenDropdown(null);
                                  }
                                }}
                              >
                                {item.label}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              }

              return (
                <BulkActionButton
                  key={index}
                  label={bulkAction.label}
                  variant={
                    (bulkAction.variant as 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark') || 'primary'
                  }
                  disabled={isDisabled}
                  onClick={() => {
                    if (!isDisabled && bulkAction.onClick) {
                      drainPossiblePromise(bulkAction.onClick(state.selectedItems));
                    }
                  }}
                />
              );
            })}
              </div>
              {customControlsAfterActions && (
                <div className="d-flex align-items-center gap-2">
                  {customControlsAfterActions}
                </div>
              )}
            </div>
          )}

        {/* Linha 2: filtros + paginação + refresh */}
        <div className="d-flex align-items-center justify-content-between flex-nowrap table-pagination-header">
          {/* Filtros/customControls à esquerda */}
          <div className="d-flex align-items-center gap-3 flex-nowrap flex-shrink-0">
            {/* Checkbox selecionar todos (incluindo outras páginas) */}
            {showSelectAllPagesCheckbox && (
              <div className="d-flex align-items-center gap-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id={`select-all-pages-${uniqueTableId}`}
                  checked={isAllPagesSelected}
                  disabled={isLoadingSelectAllPages}
                  onChange={() => handleSelectAllPages()}
                />
                <label
                  className="form-check-label small text-muted"
                  htmlFor={`select-all-pages-${uniqueTableId}`}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {isLoadingSelectAllPages
                    ? t('ui.loading')
                    : t('ui.selectAllPages')}
                </label>
              </div>
            )}
            {/* Campo de busca local - apenas quando searchable estiver habilitado */}
            {searchable && (
              <SearchBar
                id={`${uniqueTableId}-search`}
                variant="table"
                value={state.searchInputValue}
                onChange={tableActions.setSearchInputValue}
                onSearch={(value) => {
                  tableActions.setSearchTerm(value);
                  onSearch?.(value, selectedSearchField);
                }}
                placeholder={defaultSearchPlaceholder}
                searchField={selectedSearchField}
                onSearchFieldChange={(newField) => {
                  if (headerSearchField && syncWithHeader) {
                    setHeaderSearchField(newField);
                  } else {
                    setLocalSearchField(newField);
                  }
                  onSearchFieldChange?.(newField);
                }}
                searchFields={configSearchFields || []}
                autoComplete="off"
              />
            )}
            {customControls && (
              <div className="table-custom-controls">
                {customControls}
              </div>
            )}
          </div>

          {/* Paginação centralizada - Ocultar no mobile */}
          {(normalizedPagination || (!normalizedPagination && data.length > 0)) && !isMobile && (
            <div className="d-flex align-items-center gap-3">
              {/* Informações da página */}
              <div className="d-flex align-items-center gap-2">
                <span className="text-muted small">
                  <strong>{paginationValues.from}</strong> {t('pagination.to')} <strong>{paginationValues.to}</strong> {t('pagination.of')} <strong>{paginationValues.total}</strong>
                </span>

              </div>

              {/* Paginação Bootstrap estilosa */}
              <nav aria-label={t('ui.actionsMenu')}>
                <ul className="pagination pagination-sm mb-0">
                    {/* Primeira página */}
                    <li className={`page-item ${paginationValues.currentPage === 1 ? 'disabled' : ''}`}>
                      <button
                        type="button"
                        className="page-link"
                        onClick={() => {
                          if (normalizedPagination) {
                            onPageChange?.(1);
                          } else {
                            tableActions.setPage(1);
                          }
                        }}
                        disabled={paginationValues.currentPage === 1}
                        aria-label={t('ui.firstPage')}
                      >
                        <i className="bi bi-chevron-double-left"></i>
                      </button>
                    </li>

                    {/* Página anterior */}
                    <li className={`page-item ${paginationValues.currentPage === 1 ? 'disabled' : ''}`}>
                      <button
                        type="button"
                        className="page-link"
                        onClick={() => {
                          if (normalizedPagination) {
                            onPageChange?.(paginationValues.currentPage - 1);
                          } else {
                            tableActions.setPage(state.currentPage - 1);
                          }
                        }}
                        disabled={paginationValues.currentPage === 1}
                        aria-label={t('ui.previousPage')}
                      >
                        <i className="bi bi-chevron-left"></i>
                      </button>
                    </li>

                    {/* Páginas numeradas */}
                    {paginationValues.visiblePages.map((page, index) => {
                      if (page === '...') {
                        return (
                          <li key={`dots-${index}`} className="page-item disabled">
                            <span className="page-link">...</span>
                          </li>
                        );
                      }

                      const pageNumber = page as number;
                      const isActive = pageNumber === paginationValues.currentPage;

                      return (
                        <li key={pageNumber} className={`page-item ${isActive ? 'active' : ''}`}>
                          <button
                            type="button"
                            className="page-link"
                            onClick={() => {
                              if (normalizedPagination) {
                                onPageChange?.(pageNumber);
                              } else {
                                tableActions.setPage(pageNumber);
                              }
                            }}
                            aria-label={`${t('ui.page')} ${pageNumber}`}
                            aria-current={isActive ? 'page' : undefined}
                          >
                            {pageNumber}
                          </button>
                        </li>
                      );
                    })}

                    {/* Próxima página */}
                    <li className={`page-item ${paginationValues.currentPage >= paginationValues.lastPage ? 'disabled' : ''}`}>
                      <button
                        type="button"
                        className="page-link"
                        onClick={() => {
                          if (normalizedPagination) {
                            onPageChange?.(paginationValues.currentPage + 1);
                          } else {
                            tableActions.setPage(state.currentPage + 1);
                          }
                        }}
                        disabled={paginationValues.currentPage >= paginationValues.lastPage}
                        aria-label={t('ui.nextPage')}
                      >
                        <i className="bi bi-chevron-right"></i>
                      </button>
                    </li>

                    {/* Última página */}
                    <li className={`page-item ${paginationValues.currentPage >= paginationValues.lastPage ? 'disabled' : ''}`}>
                      <button
                        type="button"
                        className="page-link"
                        onClick={() => {
                          if (normalizedPagination) {
                            onPageChange?.(paginationValues.lastPage);
                          } else {
                            tableActions.setPage(totalPages);
                          }
                        }}
                        disabled={paginationValues.currentPage >= paginationValues.lastPage}
                        aria-label={t('ui.lastPage')}
                      >
                        <i className="bi bi-chevron-double-right"></i>
                      </button>
                    </li>
                  </ul>
                </nav>
            </div>
          )}

          {/* Botões de reload e auditar à direita */}
          <div className="d-flex align-items-center gap-2">
            {onAudit && auditEntity && (
              <AuditarButton
                onClick={handleAuditClick}
                disabled={loading || state.selectedItems.length !== 1}
                title={state.selectedItems.length === 1 ? "Auditar registro selecionado" : "Selecione exatamente 1 registro para auditar"}
              />
            )}
            <RecarregarButton
              onClick={onRefresh}
              title={t('ui.refresh')}
            />
          </div>
        </div>
      </div>
      )}

      {/* Tabela */}
      {isMobile ? (
        <div className="table-mobile-container">
          {renderTableBody()}
        </div>
      ) : (
        <div className="table-responsive table-responsive-custom">
          <table
            className={`table table-striped table-sm table-custom table-resizable table-resizable-enabled ${isResizing ? 'resizing' : ''}`}
            style={{ ['--table-min-width' as string]: `${tableMinWidth}px` }}
          >
            {renderTableColGroup()}
            {renderTableHeader()}
            {renderTableBody()}
          </table>
        </div>
      )}


      {/* Paginação fixa na parte inferior (mobile) */}
      {isMobile && showToolbar && (normalizedPagination || (!normalizedPagination && data.length > 0)) && (
        <div className="table-mobile-pagination">
          <div className="d-flex flex-column gap-2 w-100">
            {/* Informação da página */}
            <div className="text-center">
              <span className="small text-muted">
                <strong>{paginationValues.from}</strong> {t('pagination.to')} <strong>{paginationValues.to}</strong> {t('pagination.of')} <strong>{paginationValues.total}</strong>
              </span>
            </div>

            {/* Paginação Bootstrap compacta */}
            <nav aria-label={t('ui.actionsMenu')} className="d-flex justify-content-center">
              <ul className="pagination pagination-sm mb-0">
                {/* Primeira página */}
                <li className={`page-item ${paginationValues.currentPage === 1 ? 'disabled' : ''}`}>
                  <button
                    type="button"
                    className="page-link"
                    onClick={() => {
                      if (normalizedPagination) {
                        onPageChange?.(1);
                      } else {
                        tableActions.setPage(1);
                      }
                    }}
                    disabled={paginationValues.currentPage === 1}
                    aria-label={t('ui.firstPage')}
                  >
                    <i className="bi bi-chevron-double-left"></i>
                  </button>
                </li>

                {/* Página anterior */}
                <li className={`page-item ${paginationValues.currentPage === 1 ? 'disabled' : ''}`}>
                  <button
                    type="button"
                    className="page-link"
                    onClick={() => {
                      if (normalizedPagination) {
                        onPageChange?.(paginationValues.currentPage - 1);
                      } else {
                        tableActions.setPage(state.currentPage - 1);
                      }
                    }}
                    disabled={paginationValues.currentPage === 1}
                    aria-label={t('ui.previousPage')}
                  >
                    <i className="bi bi-chevron-left"></i>
                  </button>
                </li>

                {/* Página atual */}
                <li className="page-item active">
                  <span className="page-link">
                    {paginationValues.currentPage} / {paginationValues.lastPage}
                  </span>
                </li>

                {/* Próxima página */}
                <li className={`page-item ${paginationValues.currentPage >= paginationValues.lastPage ? 'disabled' : ''}`}>
                  <button
                    type="button"
                    className="page-link"
                    onClick={() => {
                      if (normalizedPagination) {
                        onPageChange?.(paginationValues.currentPage + 1);
                      } else {
                        tableActions.setPage(state.currentPage + 1);
                      }
                    }}
                    disabled={paginationValues.currentPage >= paginationValues.lastPage}
                    aria-label={t('ui.nextPage')}
                  >
                    <i className="bi bi-chevron-right"></i>
                  </button>
                </li>

                {/* Última página */}
                <li className={`page-item ${paginationValues.currentPage >= paginationValues.lastPage ? 'disabled' : ''}`}>
                  <button
                    type="button"
                    className="page-link"
                    onClick={() => {
                      if (normalizedPagination) {
                        onPageChange?.(paginationValues.lastPage);
                      } else {
                        tableActions.setPage(totalPages);
                      }
                    }}
                    disabled={paginationValues.currentPage >= paginationValues.lastPage}
                    aria-label={t('ui.lastPage')}
                  >
                    <i className="bi bi-chevron-double-right"></i>
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      )}
      
      {/* Botão FAB suspenso com dropdown (mobile) */}
      {isMobile && bulkActions.length > 0 && (() => {
        // Filtrar apenas "Novo" (remover "Deletar" do FAB)
        const fabActions = bulkActions.filter(bulkAction => {
          const l = bulkAction.label.toLowerCase();
          const isCreateLike = l.includes('nova') || l.includes('novo') || l.includes('create') || l.includes('criar');
          const isTunnelOrBackup = l.includes('backup') || l.includes('terminal') || l.includes('testar') || l.includes('test connection');
          const isSyncSei = l.includes('sincronizar') || l.includes('sync sei');
          return isCreateLike || isTunnelOrBackup || isSyncSei;
        });
        
        if (fabActions.length === 0) return null;
        
        return (
          <div ref={fabContainerRef} className="table-mobile-fab-container">
            {/* Botão FAB principal */}
            <button
              type="button"
              className="table-mobile-fab-btn"
              onClick={(e) => {
                e.stopPropagation();
                setIsFabOpen(!isFabOpen);
              }}
              aria-label={t('ui.actionsMenu')}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            
            {/* Dropdown com botões */}
            {isFabOpen && (
              <>
                <div 
                  ref={fabDropdownRef}
                  className="table-mobile-fab-dropdown"
                >
                  {fabActions.map((bulkAction, index) => {
                    const isDisabled = typeof bulkAction.disabled === 'function'
                      ? bulkAction.disabled(state.selectedItems)
                      : Boolean(bulkAction.disabled);
                    
                    const icon = bulkAction.icon || 'plus-circle';
                    
                    return (
                      <button
                        key={index}
                        type="button"
                        className="dropdown-item d-flex align-items-center gap-2 py-2 table-text-primary"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!isDisabled && bulkAction.onClick) {
                            setIsFabOpen(false);
                            drainPossiblePromise(bulkAction.onClick(state.selectedItems));
                          }
                        }}
                        disabled={isDisabled}
                      >
                        <i className={`bi bi-${icon}`}></i>
                        <span>{bulkAction.label}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        );
      })()}
    </div>
  );

  const shouldWrapLayout = layoutWrapper ?? !syncWithHeader;
  if (shouldWrapLayout) {
    return <TableLayoutWrapper>{tableElement}</TableLayoutWrapper>;
  }

  return tableElement;
};

// Componente já usa useMemo e useCallback internamente para otimização
export default Table;
