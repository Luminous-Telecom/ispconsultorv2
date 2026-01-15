/* eslint-disable no-console */
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { TableConfig, TableAction, BulkAction, SortDirection, TablePagination } from './types';
import { FilterValue } from '@/types/common';
import { useTable } from './useTable';
import { useColumnResizing } from '@/hooks/useColumnResizing';
import TableColumn from './TableColumn';
import TableActions from './TableActions';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useTableHeader } from '@/contexts/TableHeaderContext';
import { useI18n } from '@/contexts/I18nContext';

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
  className?: string;
  tableId?: string;
  title?: string;
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
  search = '',
  onSearch,
  onPageChange,
  onPageSizeChange,
  onRefresh,
  onAudit,
  auditEntity,
  onSearchFieldChange,
  className = '',
  tableId,
  title
}: TableProps<T>) {
  // Gerar ID único para a tabela
  const uniqueTableId = tableId || `table-${Math.random().toString(36).substr(2, 9)}`;
  
  // Detectar mobile
  const isMobile = useIsMobile();
  
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
      // Encontrar a coluna correspondente
      const column = config.columns.find(col => col.key === columnKey);
      if (!column?.label) return 40; // Largura mínima padrão com espaço para ícone

      // Estimativa precisa: ~7px por caractere + 40px para padding, ícone de ordenação e espaçamento
      const titleWidth = column.label.length * 7;
      const iconAndPaddingWidth = 40; // 16px ícone + 16px padding esquerdo + 8px margem direita

      return Math.max(40, titleWidth + iconAndPaddingWidth);
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
  const searchFieldSelectRef = useRef<HTMLSelectElement | null>(null);

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
    selectable = true,
    multiSelect = false,
    emptyMessage,
    loadingMessage: _loadingMessage,
    size: _size = 'md',
    variant: _variant = 'default',
    striped: _striped = false,
    hover: _hover = false,
    bordered: _bordered = false,
    borderless: _borderless = false,
    responsive: _responsive = true,
    stickyHeader: _stickyHeader = false,
    stickyActions: _stickyActions = false,
    customControls,
    customControlsAfterActions,
    customFilters,
    searchField: configSearchField = '',
    searchFields: configSearchFields,
  } = config;

  // Valores padrão traduzidos
  const defaultSearchPlaceholder = searchPlaceholder || t('layout.searchPlaceholder');
  const defaultEmptyMessage = emptyMessage || t('messages.noData');
  const defaultLoadingMessage = _loadingMessage || t('messages.loading');

  // Se houver contexto, usar o campo de busca do contexto, senão usar estado local
  const [localSearchField, setLocalSearchField] = useState<string>(() => {
    return configSearchField || (configSearchFields && configSearchFields.length > 0 ? configSearchFields[0].key : '');
  });

  // Determinar qual campo e função usar, priorizando o header se estiver disponível
  const selectedSearchField = headerSearchField || localSearchField;

  const [openDropdown, setOpenDropdown] = useState<number | null>(null);

  // Normalizar paginação
  const normalizedPagination = useMemo(() => normalizePagination(configPagination), [configPagination]);

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
    hasNextPage: _hasNextPage,
    hasPreviousPage: _hasPreviousPage,
    isAllSelected: _isAllSelected,
    isPartiallySelected: _isPartiallySelected,
  } = useTable({
    data: filteredData,
    columns,
    pagination: configPagination,
    filters,
    searchable,
    sortable,
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

  // Refs para armazenar callbacks e evitar recriação
  const onRefreshRef = useRef(onRefresh);
  const onSearchRef = useRef(onSearch);
  const tableActionsRef = useRef(tableActions);
  const selectedSearchFieldRef = useRef(selectedSearchField);
  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  
  // Atualizar refs quando mudarem
  useEffect(() => {
    onRefreshRef.current = onRefresh;
    onSearchRef.current = onSearch;
    tableActionsRef.current = tableActions;
    selectedSearchFieldRef.current = selectedSearchField;
  }, [onRefresh, onSearch, tableActions, selectedSearchField]);

  // Ajustar largura do select de campo de busca baseado no texto selecionado
  useEffect(() => {
    if (searchFieldSelectRef.current && configSearchFields) {
      const select = searchFieldSelectRef.current;
      const selectedOption = configSearchFields.find(field => field.key === selectedSearchField);

      if (selectedOption) {
        // Criar um elemento temporário para medir a largura do texto
        const tempSpan = document.createElement('span');
        tempSpan.style.visibility = 'hidden';
        tempSpan.style.position = 'absolute';
        tempSpan.style.whiteSpace = 'nowrap';
        tempSpan.style.fontSize = window.getComputedStyle(select).fontSize;
        tempSpan.style.fontFamily = window.getComputedStyle(select).fontFamily;
        tempSpan.style.fontWeight = window.getComputedStyle(select).fontWeight;
        tempSpan.style.padding = '0 8px'; // Mesmo padding do select
        tempSpan.textContent = selectedOption.label;

        document.body.appendChild(tempSpan);
        const textWidth = tempSpan.offsetWidth + 24; // +24px para o ícone do dropdown
        document.body.removeChild(tempSpan);

        // Aplicar largura com limites
        const minWidth = 42;
        const maxWidth = 120;
        const finalWidth = Math.max(minWidth, Math.min(maxWidth, textWidth));

        select.style.width = `${finalWidth}px`;
      }
    }
  }, [selectedSearchField, configSearchFields]);

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

  // Aplicar prop search quando ela mudar (tem prioridade sobre contexto)
  useEffect(() => {
    if (search !== undefined && search !== state.searchTerm) {
      tableActions.setSearchTerm(search);
    }
  }, [search, state.searchTerm, tableActions]);

  // Calcular valores de paginação
  // Calcular linhas por página baseado no tamanho do modal/container
  const calculateRowsPerPage = useCallback(() => {
    // Verificar se estamos dentro de um modal - múltiplas possibilidades
    const possibleSelectors = [
      '.modal-content',
      '.responsive-dialog-mobile-content',
      '.cliente-modal-content',
      '.contrato-modal-content',
      '.financeiro-modal-content',
      '[role="dialog"]',
      '.modal',
      '.offcanvas',
      '.modal-dialog',
      '.card'
    ];

    // Procurar por modais no documento
    let modalElement: Element | null = null;
    for (const selector of possibleSelectors) {
      // Procurar todos os elementos que correspondem ao seletor
      const elements = document.querySelectorAll(selector);
      const elementsArray = Array.from(elements);
      for (const element of elementsArray) {
        // Verificar se este modal contém nossa tabela (através do container)
        if (tableContainerRef.current && element.contains(tableContainerRef.current as Node)) {
          modalElement = element;
          break;
        }
      }
      if (modalElement) break;
    }

    // Fallback: se não encontrou modal contendo a tabela, pegar o último modal aberto
    if (!modalElement) {
      for (const selector of possibleSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          modalElement = element;
          break;
        }
      }
    }

    if (!modalElement) {
      return null; // Não está em modal, usar padrão
    }

    const modalRect = modalElement.getBoundingClientRect();
    const tableRect = tableContainerRef.current?.getBoundingClientRect();

    if (!tableRect) {
      return null;
    }

    // Procurar por elementos de resumo/estatísticas acima da tabela
    const summaryElements = modalElement.querySelectorAll('.financeiro-resumo, .contrato-totais-resumo, .card, .alert, .summary-card, [class*="resumo"], [class*="summary"]');
    let summaryHeight = 0;

    summaryElements.forEach(element => {
      const rect = element.getBoundingClientRect();
      // Verificar se o elemento está acima da tabela e dentro do modal
      if (rect.top < tableRect.top && rect.bottom > modalRect.top) {
        summaryHeight += rect.height;
      }
    });

    // Calcular altura disponível para o corpo da tabela
    // Considerar: elementos de resumo + header da tabela + footer/padding
    const availableHeight = modalRect.height - (tableRect.top - modalRect.top) - summaryHeight - 200;

    // Estimar altura de cada linha (aproximadamente 40px por linha)
    const rowHeight = 40; // pixels por linha - reduzido

    const availableRows = Math.max(3, Math.floor(availableHeight / rowHeight)); // Mínimo 3
    const finalRows = Math.min(30, Math.max(3, availableRows)); // Máximo 30

    return finalRows;
  }, []);

  const paginationValues = useMemo(() => {
    const currentPage = normalizedPagination?.currentPage ?? state.currentPage;
    const perPage = normalizedPagination?.perPage ?? state.pageSize;
    const total = normalizedPagination?.total ?? data.length;

    // Calcular linhas por página automaticamente se estiver em modal
    let effectivePerPage = perPage;
    if (!normalizedPagination) {
      const autoRows = calculateRowsPerPage();
      if (autoRows) {
        effectivePerPage = autoRows;
      }
    }

    // Calcular lastPage corretamente
    let lastPage: number = normalizedPagination?.lastPage ?? 1;
    if (!normalizedPagination?.lastPage) {
      if (normalizedPagination && normalizedPagination.total !== undefined) {
        // Se temos total do servidor, calcular lastPage
        lastPage = Math.max(1, Math.ceil(total / effectivePerPage));
      } else {
        // Paginação local
        lastPage = totalPages || Math.max(1, Math.ceil(data.length / effectivePerPage));
      }
    }
    lastPage = Math.max(1, lastPage); // Garantir que seja pelo menos 1

    const from = normalizedPagination?.from ?? ((currentPage - 1) * effectivePerPage) + 1;
    const to = normalizedPagination?.to ?? Math.min(currentPage * effectivePerPage, total);

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
      perPage: effectivePerPage,
      total,
      from,
      to,
      visiblePages: getVisiblePages()
    };
  }, [normalizedPagination, state.currentPage, state.pageSize, totalPages, data.length, calculateRowsPerPage]);

  // Aplicar paginação automática quando em modal
  useEffect(() => {
    // Pequeno delay para garantir que o DOM está pronto
    const timeoutId = setTimeout(() => {
      const autoRows = calculateRowsPerPage();

      if (autoRows && autoRows !== (normalizedPagination?.perPage || state.pageSize)) {
        if (normalizedPagination) {
          // Paginação do servidor - ajustar o limite da requisição
          onPageSizeChange?.(autoRows);
        } else {
          // Paginação local - ajustar o state
          tableActions.setPageSize(autoRows);
        }
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [normalizedPagination, calculateRowsPerPage, state.pageSize, tableActions, onPageSizeChange]);

  // Recalcular linhas por página quando o modal for redimensionado
  useEffect(() => {
    const handleResize = () => {
      const autoRows = calculateRowsPerPage();
      if (autoRows && autoRows !== (normalizedPagination?.perPage || state.pageSize)) {
        if (normalizedPagination) {
          // Paginação do servidor
          onPageSizeChange?.(autoRows);
        } else {
          // Paginação local
          tableActions.setPageSize(autoRows);
        }
      }
    };

    // Usar ResizeObserver se disponível para detectar mudanças no modal
    const modalElement = tableContainerRef.current?.closest('.modal-content, .responsive-dialog-mobile-content');
    if (modalElement && window.ResizeObserver) {
      const resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(modalElement);

      return () => {
        resizeObserver.disconnect();
      };
    } else {
      // Fallback para window resize
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [normalizedPagination, state.pageSize, calculateRowsPerPage, tableActions, onPageSizeChange]);

  // Recalcular linhas por página quando o modal for redimensionado
  useEffect(() => {
    const handleResize = () => {
      const autoRows = calculateRowsPerPage();
      if (autoRows && autoRows !== (normalizedPagination?.perPage || state.pageSize)) {
        if (normalizedPagination) {
          // Paginação do servidor
          onPageSizeChange?.(autoRows);
        } else {
          // Paginação local
          tableActions.setPageSize(autoRows);
        }
      }
    };

    // Usar ResizeObserver se disponível para detectar mudanças no modal
    const modalElement = tableContainerRef.current?.closest('.modal-content, .responsive-dialog-mobile-content');
    if (modalElement && window.ResizeObserver) {
      const resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(modalElement);

      return () => {
        resizeObserver.disconnect();
      };
    } else {
      // Fallback para window resize
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [normalizedPagination, state.pageSize, calculateRowsPerPage, tableActions, onPageSizeChange]);

  useEffect(() => {
    currentSearchTermRef.current = state.searchTerm;
    currentSelectedSearchFieldRef.current = selectedSearchField;
  }, [state.searchTerm, selectedSearchField]);

  // Callback estável para o clique de busca no header
  const handleHeaderSearchClick = useCallback(() => {
    if (onSearchRef.current) {
      onSearchRef.current(currentSearchTermRef.current, currentSelectedSearchFieldRef.current);
    }
  }, []);

  // Estabilizar configSearchFields para evitar loops de renderização
  const stableSearchFields = useMemo(() => {
    return JSON.stringify(configSearchFields);
  }, [configSearchFields]);

  // Ref para controlar se esta tabela deve sincronizar seu estado inicial com o header
  const initialSyncRef = useRef(false);

  // Registrar botões no contexto do header
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setHeaderTitle(title || 'Lista');
      setHeaderShowSearch(searchable || false);
      setHeaderShowReload(true);
      setHeaderOnSearchClick(handleHeaderSearchClick);
      setHeaderSearchPlaceholder(defaultSearchPlaceholder);
      setHeaderOnReloadClick(handleReloadClick);
      
      const parsedFields = configSearchFields || [];
      
      // Configurar campos de busca disponíveis
      if (parsedFields.length > 0) {
        const fields = parsedFields.map(f => ({ id: f.key, label: f.label }));
        const currentFieldsJson = JSON.stringify(headerAvailableSearchFields);
        const newFieldsJson = JSON.stringify(fields);
        
        if (currentFieldsJson !== newFieldsJson) {
          setHeaderAvailableSearchFields(fields);
        }

        // Sincronizar campo de busca inicial: Tabela -> Header
        const initialField = configSearchField || parsedFields[0].key;
        if (initialField && headerSearchField !== initialField) {
          setHeaderSearchField(initialField);
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

      // Lógica de sincronização inicial de valor de busca
      if (!initialSyncRef.current) {
        if (search !== undefined) {
          // Prop search tem prioridade sobre contexto
          tableActions.setSearchTerm(search);
        } else if (headerSearchValue && !state.searchTerm) {
          tableActions.setSearchTerm(headerSearchValue);
        } else if (state.searchTerm && !headerSearchValue) {
          setHeaderSearchValue(state.searchTerm);
        }
        initialSyncRef.current = true;
      }
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, searchable, stableSearchFields]);

  // Limpar quando desmontar
  useEffect(() => {
    return () => {
      // Apenas resetamos callbacks que pertencem a esta instância.
      setHeaderOnSearchClick(null);
      setHeaderOnReloadClick(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sincronizar busca: Header -> Table (apenas se search prop não foi passado)
  useEffect(() => {
    if (initialSyncRef.current && search === undefined && headerSearchValue !== state.searchTerm) {
      const timeoutId = setTimeout(() => {
        tableActions.setSearchTerm(headerSearchValue);
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [headerSearchValue, state.searchTerm, tableActions, search]);

  // Propagar mudança de campo para o componente pai e estado local
  useEffect(() => {
    if (headerSearchField && headerSearchField !== localSearchField) {
      // Usar setTimeout para evitar "Cannot update a component while rendering a different component"
      const timeoutId = setTimeout(() => {
        setLocalSearchField(headerSearchField);
        onSearchFieldChange?.(headerSearchField);
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [headerSearchField, localSearchField, onSearchFieldChange]);

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

  // Construir classes da tabela
  const _getTableClasses = () => {
    const classes = ['table'];
    
    if (_size !== 'md') {
      classes.push(`table-${_size}`);
    }
    
    if (_variant !== 'default') {
      classes.push(`table-${_variant}`);
    }
    
    if (_striped) {
      classes.push('table-striped');
    }
    
    if (_hover) {
      classes.push('table-hover');
    }
    
    if (_bordered) {
      classes.push('table-bordered');
    }
    
    if (_borderless) {
      classes.push('table-borderless');
    }

    // Adicionar classe para redimensionamento Bootstrap-style
    classes.push('table-resizable');

    return classes.join(' ');
  };

  // Construir classes do container
  const _getContainerClasses = () => {
    const classes = ['table-container'];
    
    if (_responsive) {
      classes.push('table-responsive');
    }
    
    if (_stickyHeader) {
      classes.push('sticky-header');
    }
    
    if (className) {
      classes.push(className);
    }
    
    return classes.join(' ');
  };

  // Renderizar cabeçalho da tabela
  const renderTableHeader = () => {
    return (
      <thead>
        <tr>
          {/* Checkbox de seleção - renderiza sempre que selectable for true */}
          {selectable && (
            <th className="text-center" style={{ width: '50px' }}>
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
          {columns
            .filter(col => !col.hidden)
            .map((column, index) => (
              <TableColumn
                key={column.key}
                column={column}
                sortColumn={state.sortColumn}
                sortDirection={state.sortDirection}
                onSort={tableActions.setSort}
                columnWidth={columnWidths[column.key]}
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
                isLastColumn={index === columns.filter(col => !col.hidden).length - 1}
              />
            ))}
          
          {/* Coluna de ações */}
          {_actions.length > 0 && (
            <th className="text-center" style={{ width: '120px' }}>
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
                onRowClick?.(item, index);
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
                                        onActionClick(action, item, index);
                                      } else if (!isDisabled && action.onClick) {
                                        action.onClick(item, index);
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
                                       label.includes('excluir') || 
                                       label.includes('inserir') || 
                                       label.includes('cancelar') ||
                                       label.includes('selecionar');
                              })
                              .map(bulkAction => {
                                const actionKey = bulkAction.label.toLowerCase().replace(/\s+/g, '-');
                                return (
                                  <button
                                    key={actionKey}
                                    type="button"
                                    className={`table-mobile-dropdown-item ${bulkAction.variant === 'danger' ? 'danger' : ''}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenActionDropdown(null);
                                      if (bulkAction.onClick) {
                                        bulkAction.onClick([item]);
                                      } else if (onBulkActionClick) {
                                        onBulkActionClick(bulkAction, [item]);
                                      }
                                    }}
                                  >
                                    <span>{bulkAction.label}</span>
                                  </button>
                                );
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
                onRowClick?.(item, index);
              }}
              onDoubleClick={() => {
                // Chamar callback de double-click na linha se existir
                onRowDoubleClick?.(item, index);
              }}
            >
              {/* Checkbox de seleção */}
              {selectable && (
                <td className="text-center" onClick={(e) => e.stopPropagation()}>
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
              
              {/* Células de dados */}
              {columns
                .filter(col => !col.hidden)
                .map(column => (
                  <td
                    key={column.key}
                    className={`${column.align ? `text-${column.align}` : ''}`}
                    style={{
                      width: column.width,
                      minWidth: column.minWidth,
                      maxWidth: column.maxWidth,
                    }}
                  >
                    {column.render ? column.render(item, index) : String(item[column.key as keyof T] || '')}
                  </td>
                ))}
              
              {/* Coluna de ações */}
              {_actions.length > 0 && (
                <td className="text-center" onClick={(e) => e.stopPropagation()}>
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
                                      onActionClick(action, item, index);
                                    } else if (!isDisabled && action.onClick) {
                                      action.onClick(item, index);
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
              
              {/* Coluna de ações - mobile dropdown */}
              {isMobile && (
                <td
                  className={`table-actions-cell table-actions-cell-fixed ${isSelected ? 'table-selected-cell' : ''}`}
                  onClick={(e) => e.stopPropagation()}
                >
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
                                    className={`table-dropdown-item ${action.variant === 'danger' ? 'danger' : ''}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenActionDropdown(null);
                                      if (!isDisabled && onActionClick) {
                                        onActionClick(action, item, index);
                                      } else if (!isDisabled && action.onClick) {
                                        action.onClick(item, index);
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
                                       label.includes('excluir') || 
                                       label.includes('inserir') || 
                                       label.includes('cancelar') ||
                                       label.includes('selecionar');
                              })
                              .map(bulkAction => {
                                const actionKey = bulkAction.label.toLowerCase().replace(/\s+/g, '-');
                                return (
                                  <button
                                    key={actionKey}
                                    type="button"
                                    className={`table-dropdown-item ${bulkAction.variant === 'danger' ? 'danger' : ''}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenActionDropdown(null);
                                      if (bulkAction.onClick) {
                                        bulkAction.onClick([item]);
                                      } else if (onBulkActionClick) {
                                        onBulkActionClick(bulkAction, [item]);
                                      }
                                    }}
                                  >
                                    <span>{bulkAction.label}</span>
                                  </button>
                                );
                              })
                          )}
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


  // Renderizar barra de ferramentas
  const _renderToolbar = () => {
    return (
      <div className="table-toolbar d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex align-items-center gap-3">
          {/* Busca removida do toolbar pois foi para o header */}
          
          {/* Ações em massa */}
          {bulkActions.length > 0 && state.selectedItems.length > 0 && (
            <TableActions
              bulkActions={bulkActions}
              selectedItems={state.selectedItems}
              onBulkActionClick={onBulkActionClick}
            />
          )}
        </div>
        
        <div className="d-flex align-items-center gap-2">
          {/* Botão de auditar (sempre visível, mas inativo quando não há 1 item selecionado) */}
              {onAudit && auditEntity && (
                <Button
                  variant="outline-primary"
                  size="sm"
                  icon="shield-check"
                  onClick={handleAuditClick}
                  disabled={loading || state.selectedItems.length !== 1}
                  tooltip={state.selectedItems.length === 1 ? t('ui.auditSelected') : t('ui.selectOneToAudit')}
                >
                  {t('buttons.audit')}
                </Button>
              )}
              {/* Botão de refresh */}
              <Button
                variant="outline-primary"
                size="sm"
                icon="arrow-clockwise"
                onClick={tableActions.refresh}
                disabled={loading}
                tooltip={t('ui.refresh')}
              >
                {''}
              </Button>
        </div>
      </div>
    );
  };

  return (
    <div ref={tableContainerRef} className={`${className} table-container-custom`}>
      
      {/* Header com botões de ação e filtros - Oculto no mobile */}
          {!isMobile && (bulkActions.length > 0 || searchable || normalizedPagination || (!normalizedPagination && data.length > 0)) && (
        <div className="border-bottom table-header-custom">
          {/* Primeira linha: Botões de ação */}
          {(bulkActions.length > 0 || customControlsAfterActions) && (
            <div className="d-flex align-items-center justify-content-between mb-2 table-header-content">
              <div className="d-flex table-header-flex">
                {bulkActions.map((bulkAction, index) => {
              // Novo sempre habilitado, outros só quando há seleção
              const isNewButton = bulkAction.label.toLowerCase().includes('nova') || bulkAction.label.toLowerCase().includes('novo');
              const isEditarButton = bulkAction.label.toLowerCase().includes('editar');
              const isExcluirButton = bulkAction.label.toLowerCase().includes('excluir');
              const isImprimirButton = bulkAction.label.toLowerCase().includes('imprimir');
              const isDisabledBySelection = !isNewButton && !isImprimirButton && state.selectedItems.length === 0;
              const isDisabledByCondition = bulkAction.disabled && typeof bulkAction.disabled === 'function' ? bulkAction.disabled(state.selectedItems) : false;
              const isDisabled = isDisabledBySelection || isDisabledByCondition;
              
              // No mobile, remover "Editar" da barra superior e esconder "Novo" e "Excluir" (serão renderizados no rodapé)
              if (isMobile) {
                if (isEditarButton || isNewButton || isExcluirButton) {
                  return null;
                }
              }
              
              // Se tem dropdown, renderizar dropdown
              if (bulkAction.dropdown) {
                return (
                  <div key={index} className="dropdown table-dropdown-relative">
                    <button
                      type="button"
                      className={`btn btn-sm btn-${bulkAction.variant || 'primary'} table-flex-shrink-0`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setOpenDropdown(openDropdown === index ? null : index);
                      }}
                      disabled={isDisabled}
                    >
                      {bulkAction.label} {isMobile && <i className="bi bi-chevron-down ms-1"></i>}
                    </button>
                    {openDropdown === index && (
                      <ul
                        className="dropdown-menu show table-dropdown-menu"
                      >
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
                                    item.action(state.selectedItems);
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
              
              // Botão normal
              return (
                <button
                  type="button"
                  key={index}
                  className={`btn btn-sm btn-${bulkAction.variant || 'primary'} table-flex-shrink-0`}
                  onClick={(_event) => {
                    if (!isDisabled && bulkAction.onClick) {
                      bulkAction.onClick(state.selectedItems);
                    }
                  }}
                  disabled={isDisabled}
                >
                  {bulkAction.label}
                </button>
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

        {/* Botões de reload e auditar + paginação no header */}
        <div className="d-flex align-items-center justify-content-between table-pagination-header">
          {/* Controles customizados à esquerda */}
          <div className="d-flex align-items-center gap-3">
            {/* Campo de busca local - apenas quando searchable estiver habilitado */}
            {searchable && (
              <div className="table-search-combined">
                {/* Seletor de campo de busca - apenas quando houver múltiplos campos */}
                {configSearchFields && configSearchFields.length > 1 && (
                  <select
                    ref={searchFieldSelectRef}
                    id={`${uniqueTableId}-search-field`}
                    className="form-select form-select-sm table-search-field-select"
                    value={selectedSearchField}
                    onChange={(e) => {
                      const newField = e.target.value;
                      if (headerSearchField) {
                        // Se estiver usando o header, atualizar lá
                        setHeaderSearchField?.(newField);
                      } else {
                        // Caso contrário, atualizar estado local
                        setLocalSearchField(newField);
                      }
                      // Disparar busca quando mudar o campo
                      if (onSearchFieldChange) {
                        onSearchFieldChange(newField);
                      }
                    }}
                  >
                    {configSearchFields.map(field => (
                      <option key={field.key} value={field.key}>
                        {field.label}
                      </option>
                    ))}
                  </select>
                )}

                {/* Input de busca */}
                <div className="position-relative">
                  <input
                    type="search"
                    id={`${uniqueTableId}-search`}
                    className="form-control form-control-sm table-search-input"
                    placeholder={defaultSearchPlaceholder}
                    value={search}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Usar callback de busca se disponível
                      if (onSearch) {
                        onSearch(value, selectedSearchField);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && onSearch) {
                        e.preventDefault();
                      }
                    }}
                  />
                  {/* Ícone de busca */}
                  <div className="table-search-icon">
                    <i className="bi bi-search text-muted"></i>
                  </div>
                </div>
              </div>
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
              <button
                type="button"
                className="btn btn-outline-primary btn-sm"
                onClick={handleAuditClick}
                disabled={loading || state.selectedItems.length !== 1}
                title={state.selectedItems.length === 1 ? "Auditar registro selecionado" : "Selecione exatamente 1 registro para auditar"}
              >
                {isMobile && <i className="bi bi-shield-check"></i>} Auditar
              </button>
            )}
            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              onClick={onRefresh}
              title="Recarregar dados"
            >
              <i className="bi bi-arrow-clockwise"></i>
            </button>
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
          <table className={`table table-striped table-sm table-custom table-resizable table-resizable-enabled ${isResizing ? 'resizing' : ''}`}>
            {renderTableHeader()}
            {renderTableBody()}
          </table>
        </div>
      )}


      {/* Paginação fixa na parte inferior (mobile) */}
      {isMobile && (normalizedPagination || (!normalizedPagination && data.length > 0)) && (
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
        // Filtrar apenas "Novo" (remover "Excluir" do FAB)
        const fabActions = bulkActions.filter(bulkAction => {
          const isNewButton = bulkAction.label.toLowerCase().includes('nova') || bulkAction.label.toLowerCase().includes('novo');
          return isNewButton;
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
                    const isDisabled = bulkAction.disabled && typeof bulkAction.disabled === 'function' 
                      ? bulkAction.disabled(state.selectedItems) 
                      : false;
                    
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
                            bulkAction.onClick(state.selectedItems);
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
};

// Componente já usa useMemo e useCallback internamente para otimização
export default Table;
