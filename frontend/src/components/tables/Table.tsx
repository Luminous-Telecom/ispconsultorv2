import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { TableConfig, TableAction, BulkAction, SortDirection, TablePagination } from './types';
import { FilterValue } from '@/types/common';
import { useTable } from './useTable';
import TableColumn from './TableColumn';
import TableActions from './TableActions';
import FormField from '../ui/FormField';
import Button from '../ui/Button';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useTableHeader } from '@/contexts/TableHeaderContext';
import { debounce } from '@/utils/helpers';

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
  onSelectionChange?: (selectedItems: T[]) => void;
  onSort?: (column: string, direction: SortDirection) => void;
  onFilter?: (filters: Record<string, FilterValue>) => void;
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
  onSelectionChange,
  onSort,
  onFilter,
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
  
  // Table header context (para botões no header do Layout)
  const {
    setTitle: setHeaderTitle,
    setShowSearch: setHeaderShowSearch,
    setShowReload: setHeaderShowReload,
    setSearchPlaceholder: setHeaderSearchPlaceholder,
    setOnReloadClick: setHeaderOnReloadClick,
    setSearchValue: setHeaderSearchValue,
    setLoading: setHeaderLoading,
    setShowMobileSearch: setHeaderShowMobileSearch,
    searchValue: headerSearchValue,
  } = useTableHeader();
  
  // Estado para controlar abertura do menu FAB
  const [isFabOpen, setIsFabOpen] = useState(false);
  
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
    searchPlaceholder = 'Buscar...',
    searchField: configSearchField = '',
    searchFields: configSearchFields,
    sortable = true,
    selectable = true,
    multiSelect = false,
    emptyMessage = 'Nenhum dado encontrado',
    loadingMessage: _loadingMessage = 'Carregando...',
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
  } = config;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSearchField, setSelectedSearchField] = useState<string>(
    configSearchField || (configSearchFields && configSearchFields.length > 0 ? configSearchFields[0].key : '')
  );
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const _tableRef = useRef<HTMLTableElement>(null);

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
    hasNextPage,
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
  
  // Atualizar refs quando mudarem
  useEffect(() => {
    onRefreshRef.current = onRefresh;
    onSearchRef.current = onSearch;
    tableActionsRef.current = tableActions;
    selectedSearchFieldRef.current = selectedSearchField;
  }, [onRefresh, onSearch, tableActions, selectedSearchField]);

  // Função debounced para busca (300ms de delay)
  const debouncedSearch = useMemo(
    () =>
      debounce((value: string, field: string) => {
        if (onSearchRef.current) {
          onSearchRef.current(value, field);
        }
      }, 300),
    []
  );

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

  // Registrar botões no contexto do header quando for mobile
  useEffect(() => {
    if (isMobile) {
      setHeaderTitle(title || 'Lista');
      setHeaderShowSearch(searchable || false);
      setHeaderShowReload(true);
      setHeaderSearchPlaceholder(searchPlaceholder || 'Buscar...');
      setHeaderOnReloadClick(handleReloadClick);
      
      // Inicializar busca se houver valor inicial (uma única vez ao montar/entrar mobile)
      // Usamos apenas se houver valor, mas não sincronizamos o tempo todo aqui
      if (searchTerm && headerSearchValue !== searchTerm) {
         setHeaderSearchValue(searchTerm);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isMobile, 
    title, 
    searchable, 
    searchPlaceholder, 
    handleReloadClick,
    // Incluir setters do header que são estáveis
    setHeaderTitle,
    setHeaderShowSearch,
    setHeaderShowReload,
    setHeaderSearchPlaceholder,
    setHeaderOnReloadClick,
    setHeaderSearchValue
  ]);

  // Limpar quando sair do mobile
  useEffect(() => {
    if (!isMobile) {
      setHeaderTitle(null);
      setHeaderShowSearch(false);
      setHeaderShowReload(false);
      setHeaderOnReloadClick(null);
      setHeaderShowMobileSearch(false);
    }
  }, [
    isMobile, 
    setHeaderTitle,
    setHeaderShowSearch,
    setHeaderShowReload,
    setHeaderOnReloadClick,
    setHeaderShowMobileSearch
  ]);

  // Sincronizar loading separadamente para evitar re-configuração completa do header
  useEffect(() => {
    if (isMobile) {
      setHeaderLoading(loading || false);
    }
  }, [isMobile, loading, setHeaderLoading]);
  
  // Limpar ao desmontar
  useEffect(() => {
    return () => {
      // Limpar apenas ao desmontar o componente
      setHeaderTitle(null);
      setHeaderShowSearch(false);
      setHeaderShowReload(false);
      setHeaderOnReloadClick(null);
      setHeaderShowMobileSearch(false);
      setHeaderSearchValue('');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Sincronizar busca local com o hook
  useEffect(() => {
    if (searchTerm !== state.searchTerm) {
      tableActions.setSearchTerm(searchTerm);
    }
  }, [searchTerm, state.searchTerm, tableActions]);
  
  // Sincronizar busca do contexto com busca local
  useEffect(() => {
    // Apenas sincronizar se for mobile e os valores forem diferentes
    if (isMobile && headerSearchValue !== searchTerm) {
      // Atualizar busca local (que vai disparar o efeito acima para atualizar o hook)
      setSearchTerm(headerSearchValue);
      
      // Propagar para callback externo imediatamente se necessário
      // Não chamamos tableActions aqui para evitar race condition com o efeito acima
      if (onSearchRef.current) {
        onSearchRef.current(headerSearchValue, selectedSearchField);
      }
    }
  }, [isMobile, headerSearchValue, searchTerm, selectedSearchField]);

  // Conectar busca com callback externo (removido - agora usa debounce direto no onChange)

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
            <th className="py-1 px-2" style={{ fontSize: '0.75rem', padding: '0.5rem', width: '40px', textTransform: 'none' }}>
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
            .map(column => (
              <TableColumn
                key={column.key}
                column={column}
                sortColumn={state.sortColumn}
                sortDirection={state.sortDirection}
                onSort={tableActions.setSort}
              />
            ))}
          
          {/* Coluna de ações */}
          {_actions.length > 0 && (
            <th className="py-1 px-2" style={{ fontSize: '0.75rem', padding: '0.5rem', width: '150px', textAlign: 'right', textTransform: 'none' }}>
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
          <div className="spinner-border spinner-border-sm" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
        </div>
      );
    }

    if (paginatedData.length === 0) {
      return (
        <div className="table-mobile-empty">
          {emptyMessage}
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
                      aria-label={isExpanded ? 'Recolher' : 'Expandir'}
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
                      aria-label="Menu de ações"
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
                          {/* Criar ações padrão baseadas nos bulkActions se não houver ações configuradas */}
                          {(() => {
                            // Se há ações configuradas, usar elas
                            if (_actions.length > 0) {
                              return _actions
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
                                });
                            }
                            
                            // Se não há ações, criar ações padrão baseadas nos bulkActions
                            const defaultActions = bulkActions
                              .filter(bulkAction => {
                                // Filtrar ações que fazem sentido para item individual ou seleção
                                const label = bulkAction.label.toLowerCase();
                                // Incluir ações de edição, exclusão, inserção e cancelamento
                                return label.includes('editar') || 
                                       label.includes('excluir') || 
                                       label.includes('inserir') || 
                                       label.includes('cancelar') ||
                                       label.includes('selecionar');
                              })
                              .map(bulkAction => {
                                // Para ações de linha específica, sempre habilitar
                                // e selecionar o item automaticamente antes de executar
                                
                                return {
                                  key: bulkAction.label.toLowerCase().replace(/\s+/g, '-'),
                                  label: bulkAction.label,
                                  variant: bulkAction.variant || 'primary',
                                  disabled: false, // Sempre habilitado para ações de linha específica
                                  onClick: () => {
                                    // No mobile, chamar diretamente com o item da linha sem selecionar
                                    if (bulkAction.onClick) {
                                      bulkAction.onClick([item]);
                                    } else if (onBulkActionClick) {
                                      onBulkActionClick(bulkAction, [item]);
                                    }
                                  }
                                };
                              });
                            
                            return defaultActions.map((action) => (
                              <button
                                key={action.key}
                                type="button"
                                className={`table-mobile-dropdown-item ${action.variant === 'danger' ? 'danger' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenActionDropdown(null);
                                  if (!action.disabled && action.onClick) {
                                    action.onClick();
                                  }
                                }}
                                disabled={action.disabled}
                              >
                                <span>{action.label}</span>
                              </button>
                            ));
                          })()}
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
              <div className="spinner-border spinner-border-sm" role="status">
                <span className="visually-hidden">Carregando...</span>
              </div>
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
              {emptyMessage}
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
              className={isSelected ? 'table-active' : ''}
              onClick={() => {
                // Selecionar/deselecionar item ao clicar na linha
                if (selectable) {
                  tableActions.toggleSelection(item);
                }
                // Chamar callback de clique na linha se existir
                onRowClick?.(item, index);
              }}
              style={{ 
                cursor: 'pointer',
                backgroundColor: isSelected ? '#0d6efd' : 'inherit',
                color: isSelected ? 'white' : 'inherit'
              }}
            >
              {/* Checkbox de seleção */}
              {selectable && (
                <td 
                  className="py-1 px-2"
                  style={{ 
                    fontSize: '0.75rem', 
                    padding: '0.5rem',
                    backgroundColor: isSelected ? '#0d6efd' : 'inherit',
                    color: isSelected ? 'white' : 'inherit',
                    width: '40px'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
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
                    className="py-1 px-2"
                    style={{
                      fontSize: '0.75rem', 
                      padding: '0.5rem',
                      backgroundColor: isSelected ? '#0d6efd' : 'inherit',
                      color: isSelected ? 'white' : 'inherit',
                      width: column.width,
                      minWidth: column.minWidth,
                      maxWidth: column.maxWidth,
                      textAlign: column.align,
                    }}
                  >
                    {column.render ? column.render(item, index) : String(item[column.key as keyof T] || '')}
                  </td>
                ))}
              
              {/* Coluna de ações */}
              {_actions.length > 0 && (
                <td 
                  className="py-1 px-2"
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.5rem',
                    backgroundColor: isSelected ? '#0d6efd' : 'inherit',
                    color: isSelected ? 'white' : 'inherit',
                    width: '50px',
                    textAlign: 'right',
                    position: 'relative',
                  }}
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
                      aria-label="Menu de ações"
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
                  className="py-1 px-2"
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.5rem',
                    backgroundColor: isSelected ? '#0d6efd' : 'inherit',
                    color: isSelected ? 'white' : 'inherit',
                    width: '50px',
                    textAlign: 'right',
                    position: 'relative',
                  }}
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
                      aria-label="Menu de ações"
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
                          {/* Criar ações padrão baseadas nos bulkActions se não houver ações configuradas */}
                          {(() => {
                            // Se há ações configuradas, usar elas
                            if (_actions.length > 0) {
                              return _actions
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
                                });
                            }
                            
                            // Se não há ações, criar ações padrão baseadas nos bulkActions
                            const defaultActions = bulkActions
                              .filter(bulkAction => {
                                // Filtrar ações que fazem sentido para item individual ou seleção
                                const label = bulkAction.label.toLowerCase();
                                // Incluir ações de edição, exclusão, inserção e cancelamento
                                return label.includes('editar') || 
                                       label.includes('excluir') || 
                                       label.includes('inserir') || 
                                       label.includes('cancelar') ||
                                       label.includes('selecionar');
                              })
                              .map(bulkAction => {
                                // Para ações de linha específica, criar uma ação que funciona diretamente com o item
                                
                                return {
                                  key: bulkAction.label.toLowerCase().replace(/\s+/g, '-'),
                                  label: bulkAction.label,
                                  variant: bulkAction.variant || 'primary',
                                  disabled: false, // Sempre habilitado para ações de linha específica
                                  onClick: () => {
                                    // Para ações de linha específica no mobile, chamar diretamente com o item
                                    // sem precisar selecionar o item primeiro
                                    
                                    // Chamar diretamente com o item da linha
                                    if (bulkAction.onClick) {
                                      bulkAction.onClick([item]);
                                    } else if (onBulkActionClick) {
                                      onBulkActionClick(bulkAction, [item]);
                                    } else {
                                      // Fallback: tentar usar action se disponível (compatibilidade com ListModal)
                                      const actionFn = (bulkAction as unknown as Record<string, unknown>).action;
                                      if (actionFn && typeof actionFn === 'function') {
                                        // Chamar a função passando o item como parâmetro se ela aceitar
                                        if (actionFn.length > 0) {
                                          (actionFn as (selectedItems: T[]) => void)([item]);
                                        } else {
                                          (actionFn as () => void)();
                                        }
                                      }
                                    }
                                  }
                                };
                              });
                            
                            return defaultActions.map((action) => (
                              <button
                                key={action.key}
                                type="button"
                                className={`table-dropdown-item ${action.variant === 'danger' ? 'danger' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenActionDropdown(null);
                                  if (!action.disabled && action.onClick) {
                                    action.onClick();
                                  }
                                }}
                                disabled={action.disabled}
                              >
                                <span>{action.label}</span>
                              </button>
                            ));
                          })()}
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
          {/* Busca */}
          {searchable && (
            <div className="search-box d-flex align-items-center gap-2" style={{ minWidth: '300px' }}>
              {configSearchFields && configSearchFields.length > 0 && (
                <select
                  className="form-select form-select-sm"
                  value={selectedSearchField}
                  onChange={(e) => {
                    const field = e.target.value;
                    setSelectedSearchField(field);
                    onSearchFieldChange?.(field);
                  }}
                  style={{ width: 'auto', minWidth: '150px' }}
                >
                  {configSearchFields.map((field) => (
                    <option key={field.key} value={field.key}>
                      {field.label}
                    </option>
                  ))}
                </select>
              )}
              <div style={{ flex: 1 }}>
                <FormField
                  type="text"
                  name="search"
                  value={searchTerm}
                  onChange={(val) => {
                    const newValue = val as string;
                    setSearchTerm(newValue);
                    debouncedSearch(newValue, selectedSearchFieldRef.current);
                  }}
                  placeholder={searchPlaceholder}
                  icon="search"
                  size="sm"
                />
              </div>
            </div>
          )}
          
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
          {/* Botão de auditar (apenas quando há 1 item selecionado) */}
          {onAudit && auditEntity && state.selectedItems.length === 1 && (
            <Button
              variant="outline-info"
              size="sm"
              icon="shield-check"
              onClick={handleAuditClick}
              disabled={loading}
              tooltip="Auditar registro selecionado"
            >
              Auditar
            </Button>
          )}
          {/* Botão de refresh */}
          <Button
            variant="outline-secondary"
            size="sm"
            icon="arrow-clockwise"
            onClick={tableActions.refresh}
            disabled={loading}
            tooltip="Atualizar"
          >
            {''}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className={className} style={{ width: '100%', margin: 0, padding: 0, boxSizing: 'border-box' }}>
      
      {/* Header com botões de ação e filtros - Oculto no mobile */}
          {!isMobile && (bulkActions.length > 0 || searchable || normalizedPagination || (!normalizedPagination && data.length > 0)) && (
        <div className="border-bottom" style={{ margin: 0, padding: 0, background: 'transparent' }}>
          {/* Primeira linha: Botões de ação */}
          {(bulkActions.length > 0 || customControlsAfterActions) && (
            <div className="d-flex align-items-center justify-content-between mb-2" style={{ padding: '0.5rem 1rem' }}>
              <div className="d-flex" style={{ gap: '8px' }}>
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
                  <div key={index} className="dropdown" style={{ flexShrink: 0, position: 'relative' }}>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setOpenDropdown(openDropdown === index ? null : index);
                      }}
                      disabled={isDisabled}
                      style={{ flexShrink: 0 }}
                    >
                      {bulkAction.label} <i className="bi bi-chevron-down ms-1"></i>
                    </button>
                    {openDropdown === index && (
                      <ul 
                        className="dropdown-menu show" 
                        style={{ position: 'absolute', top: '100%', left: 0, zIndex: 1050 }}
                      >
                        {bulkAction.dropdown.map((item, itemIndex) => (
                          <li key={itemIndex}>
                            <button
                              type="button"
                              className="dropdown-item"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                item.action(state.selectedItems);
                                setOpenDropdown(null);
                              }}
                            >
                              {item.label}
                            </button>
                          </li>
                        ))}
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
                  className="btn btn-sm btn-primary"
                  onClick={(_event) => {
                    if (!isDisabled && bulkAction.onClick) {
                      bulkAction.onClick(state.selectedItems);
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
              {customControlsAfterActions && (
                <div className="d-flex align-items-center gap-2">
                  {customControlsAfterActions}
                </div>
              )}
            </div>
          )}

        {/* Segunda linha: Busca + Paginação + Reload */}
        <div className="d-flex align-items-center justify-content-between" style={{ padding: '0 1rem 0.5rem 1rem' }}>
          {/* Busca e controles customizados à esquerda */}
          <div className="d-flex align-items-center gap-3">
            {searchable && (
              <div className="d-flex align-items-center gap-2">
                {configSearchFields && configSearchFields.length > 0 && (
                  <select
                    className="form-select form-select-sm"
                    value={selectedSearchField}
                    onChange={(e) => {
                      const field = e.target.value;
                      setSelectedSearchField(field);
                      onSearchFieldChange?.(field);
                    }}
                    style={{ width: 'auto', minWidth: '150px', height: '32px' }}
                  >
                    {configSearchFields.map((field) => (
                      <option key={field.key} value={field.key}>
                        {field.label}
                      </option>
                    ))}
                  </select>
                )}
                <input
                  type="text"
                  className="form-control form-control-sm"
                  id={`search-${Math.random().toString(36).substr(2, 9)}`}
                  name="search"
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setSearchTerm(newValue);
                    debouncedSearch(newValue, selectedSearchFieldRef.current);
                  }}
                  style={{ width: '400px', height: '32px' }}
                />
              </div>
            )}
            {customControls}
          </div>

          {/* Paginação centralizada - Ocultar no mobile */}
          {(normalizedPagination || (!normalizedPagination && data.length > 0)) && !isMobile && (
            <div className="d-flex align-items-center gap-2">
              {/* Seletor de linhas por página */}
              <select 
                className="form-select form-select-sm" 
                id={`${uniqueTableId}-limit`}
                name="dataTableLimit"
                value={normalizedPagination?.perPage || state.pageSize}
                onChange={(e) => {
                  const newPageSize = parseInt(e.target.value);
                  if (normalizedPagination) {
                    // Quando há paginação do servidor, resetar página para 1 ao mudar limite
                    onPageChange?.(1);
                    onPageSizeChange?.(newPageSize);
                  } else {
                    tableActions.setPageSize(newPageSize);
                  }
                }}
                style={{ width: '80px', height: '32px', cursor: 'pointer' }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>

              {/* Paginação compacta */}
              <div className="d-flex align-items-center gap-1">
                <button 
                  type="button"
                  className="btn btn-outline-secondary btn-sm" 
                  onClick={() => {
                    if (configPagination) {
                      onPageChange?.(1);
                    } else {
                      tableActions.setPage(1);
                    }
                  }}
                  disabled={normalizedPagination ? normalizedPagination.currentPage <= 1 : state.currentPage <= 1}
                >
                  <i className="bi bi-chevron-double-left"></i>
                </button>
                <button 
                  type="button"
                  className="btn btn-outline-secondary btn-sm" 
                  onClick={() => {
                    if (normalizedPagination) {
                      onPageChange?.(normalizedPagination.currentPage - 1);
                    } else {
                      tableActions.setPage(state.currentPage - 1);
                    }
                  }}
                  disabled={normalizedPagination ? normalizedPagination.currentPage <= 1 : state.currentPage <= 1}
                >
                  <i className="bi bi-chevron-left"></i>
                </button>
                
                <span className="small text-muted mx-2">
                  {normalizedPagination ? (
                    `${normalizedPagination.from || 0} - ${normalizedPagination.to || 0} / ${normalizedPagination.total || 0}`
                  ) : (
                    `${((state.currentPage - 1) * state.pageSize) + 1}-${Math.min(state.currentPage * state.pageSize, data.length)} de ${data.length}`
                  )}
                </span>
                
                <button 
                  type="button"
                  className="btn btn-outline-secondary btn-sm" 
                  onClick={() => {
                    if (normalizedPagination) {
                      onPageChange?.(normalizedPagination.currentPage + 1);
                    } else {
                      tableActions.setPage(state.currentPage + 1);
                    }
                  }}
                  disabled={normalizedPagination ? normalizedPagination.currentPage >= normalizedPagination.lastPage : !hasNextPage}
                >
                  <i className="bi bi-chevron-right"></i>
                </button>
                <button 
                  type="button"
                  className="btn btn-outline-secondary btn-sm" 
                  onClick={() => {
                    if (normalizedPagination) {
                      onPageChange?.(normalizedPagination.lastPage);
                    } else {
                      tableActions.setPage(totalPages);
                    }
                  }}
                  disabled={normalizedPagination ? normalizedPagination.currentPage >= normalizedPagination.lastPage : !hasNextPage}
                >
                  <i className="bi bi-chevron-double-right"></i>
                </button>
              </div>
            </div>
          )}

          {/* Botões de reload e auditar à direita */}
          <div className="d-flex align-items-center gap-2">
            {onAudit && auditEntity && state.selectedItems.length === 1 && (
              <button 
                type="button"
                className="btn btn-outline-info btn-sm"
                onClick={handleAuditClick}
                disabled={loading}
                title="Auditar registro selecionado"
              >
                <i className="bi bi-shield-check"></i> Auditar
              </button>
            )}
            <button 
              type="button"
              className="btn btn-outline-secondary btn-sm"
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
        <div className="table-responsive" style={{ margin: 0, padding: 0, overflowX: 'auto', width: '100%', boxSizing: 'border-box', maxWidth: '100%' }}>
          <table className="table table-striped table-sm" style={{ width: '100%', tableLayout: 'auto', margin: 0 }}>
            {renderTableHeader()}
            {renderTableBody()}
          </table>
        </div>
      )}
      
      {/* Paginação fixa na parte inferior (mobile) */}
      {isMobile && (normalizedPagination || (!normalizedPagination && data.length > 0)) && (
        <div className="table-mobile-pagination">
          <div className="d-flex align-items-center justify-content-between w-100" style={{ gap: '0.5rem' }}>
            {/* Botões de navegação esquerda */}
            <div className="d-flex align-items-center gap-1">
              <button 
                type="button"
                className="btn btn-outline-secondary btn-sm" 
                onClick={() => {
                  if (normalizedPagination) {
                    onPageChange?.(1);
                  } else {
                    tableActions.setPage(1);
                  }
                }}
                disabled={normalizedPagination ? normalizedPagination.currentPage <= 1 : state.currentPage <= 1}
              >
                <i className="bi bi-chevron-double-left"></i>
              </button>
              <button 
                type="button"
                className="btn btn-outline-secondary btn-sm" 
                onClick={() => {
                  if (normalizedPagination) {
                    onPageChange?.(normalizedPagination.currentPage - 1);
                  } else {
                    tableActions.setPage(state.currentPage - 1);
                  }
                }}
                disabled={normalizedPagination ? normalizedPagination.currentPage <= 1 : state.currentPage <= 1}
              >
                <i className="bi bi-chevron-left"></i>
              </button>
            </div>
            
            {/* Informação da página */}
            <span className="small text-muted text-center text-nowrap" style={{ flex: 1, textAlign: 'center' }}>
              {normalizedPagination ? (
                `${normalizedPagination.from || 0} - ${normalizedPagination.to || 0} / ${normalizedPagination.total || 0} registros`
              ) : (
                `${((state.currentPage - 1) * state.pageSize) + 1}-${Math.min(state.currentPage * state.pageSize, data.length)} de ${data.length}`
              )}
            </span>
            
            {/* Botões de navegação direita */}
            <div className="d-flex align-items-center gap-1">
              <button 
                type="button"
                className="btn btn-outline-secondary btn-sm" 
                onClick={() => {
                  if (normalizedPagination) {
                    onPageChange?.(normalizedPagination.currentPage + 1);
                  } else {
                    tableActions.setPage(state.currentPage + 1);
                  }
                }}
                disabled={normalizedPagination ? normalizedPagination.currentPage >= normalizedPagination.lastPage : !hasNextPage}
              >
                <i className="bi bi-chevron-right"></i>
              </button>
              <button 
                type="button"
                className="btn btn-outline-secondary btn-sm" 
                onClick={() => {
                  if (normalizedPagination) {
                    onPageChange?.(normalizedPagination.lastPage);
                  } else {
                    tableActions.setPage(totalPages);
                  }
                }}
                disabled={normalizedPagination ? normalizedPagination.currentPage >= normalizedPagination.lastPage : !hasNextPage}
              >
                <i className="bi bi-chevron-double-right"></i>
              </button>
            </div>
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
              aria-label="Menu de ações"
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
                {/* Overlay para fechar ao clicar fora */}
                <div 
                  className="table-mobile-fab-overlay"
                  onClick={() => setIsFabOpen(false)}
                />
                <div 
                  ref={fabDropdownRef}
                  className="table-mobile-fab-dropdown"
                >
                  {fabActions.map((bulkAction, index) => {
                    const isNewButton = bulkAction.label.toLowerCase().includes('nova') || bulkAction.label.toLowerCase().includes('novo');
                    const isExcluirButton = bulkAction.label.toLowerCase().includes('excluir');
                    
                    const isDisabledBySelection = !isNewButton && state.selectedItems.length === 0;
                    const isDisabledByCondition = bulkAction.disabled && typeof bulkAction.disabled === 'function' ? bulkAction.disabled(state.selectedItems) : false;
                    const isDisabled = isDisabledBySelection || isDisabledByCondition;
                    
                    // Determinar ícone baseado no label
                    let icon = bulkAction.icon;
                    if (!icon) {
                      if (isNewButton) {
                        icon = 'plus-circle';
                      } else if (isExcluirButton) {
                        icon = 'trash';
                      } else if (bulkAction.label.toLowerCase().includes('editar')) {
                        icon = 'pencil';
                      }
                    }
                    
                    return (
                      <button
                        key={index}
                        type="button"
                        className="dropdown-item d-flex align-items-center gap-2 py-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsFabOpen(false);
                          if (!isDisabled && bulkAction.onClick) {
                            bulkAction.onClick(state.selectedItems);
                          }
                        }}
                        disabled={isDisabled}
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {icon && <i className={`bi bi-${icon}`}></i>}
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
