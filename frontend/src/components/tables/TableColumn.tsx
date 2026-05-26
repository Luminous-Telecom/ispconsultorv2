import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { useI18n } from 'contexts/I18nContext';
import { TableColumn as TableColumnType, SortDirection } from './types';

interface TableColumnProps<T = Record<string, unknown>> {
  column: TableColumnType<T>;
  sortColumn?: string;
  sortDirection?: SortDirection;
  onSort?: (column: string, direction: SortDirection) => void;
  className?: string;
  columnWidth?: number;
  onResizeStart?: (columnKey: string, startX: number, currentWidth: number) => void;
  onResizeEnd?: () => void;
  isResizing?: boolean;
  isLastColumn?: boolean;
  getMinWidthForColumn?: (columnKey: string) => number;
}

const TableColumn = <T extends { id: number | string }>({
  column,
  sortColumn,
  sortDirection,
  onSort,
  className = '',
  columnWidth,
  onResizeStart,
  onResizeEnd,
  isResizing = false,
  isLastColumn = false,
  getMinWidthForColumn: _getMinWidthForColumn,
}: TableColumnProps<T>) => {
  const { t } = useI18n();
  const isSorted = sortColumn === column.key;
  const isSortable = column.sortable !== false && onSort && column.key !== 'acoes' && column.key !== 'actions';

  // Flag para controlar se estava redimensionando (evita ordenação acidental)
  const wasResizingRef = useRef(false);

  const columnRef = useRef<HTMLTableHeaderCellElement>(null);

  const handleSort = useCallback(() => {
    // Se estava redimensionando, não executar ordenação
    if (wasResizingRef.current) {
      wasResizingRef.current = false;
      return;
    }

    if (!isSortable || !onSort) return;

    let direction: SortDirection = 'asc';
    if (isSorted && sortDirection === 'asc') {
      direction = 'desc';
    }

    onSort(column.key, direction);
  }, [isSortable, isSorted, sortDirection, onSort, column.key]);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Marcar que está redimensionando para evitar ordenação acidental
    wasResizingRef.current = true;

    if (!columnRef.current || !onResizeStart) {
      return;
    }

    const currentWidth = columnRef.current.offsetWidth;
    onResizeStart(column.key, e.clientX, currentWidth);
  }, [column.key, onResizeStart]);

  const getSortIcon = () => {
    if (!isSortable) return null;

    let iconClass = 'bi bi-chevron-expand';
    let iconColor = '#6c757d';

    if (isSorted) {
      if (sortDirection === 'asc') {
        iconClass = 'bi bi-chevron-up';
        iconColor = '#495057';
      } else {
        iconClass = 'bi bi-chevron-down';
        iconColor = '#495057';
      }
    }

    return (
      <i
        className={iconClass}
        style={{
          fontSize: '0.625rem',
          color: iconColor,
          marginLeft: '0.125rem'
        }}
      />
    );
  };

  // Calcular largura mínima baseada no título da coluna (nunca ocultar o título + ícone)
  const minWidthFromTitle = useMemo(() => {
    if (!column.label) return 40; // Largura mínima padrão com espaço para ícone

    // Estimativa mais precisa: ~7px por caractere + 40px para padding, ícone de ordenação (16px) e espaçamento
    const titleWidth = column.label.length * 7;
    const iconAndPaddingWidth = 40; // 16px ícone + 16px padding esquerdo + 8px margem direita

    return Math.max(40, titleWidth + iconAndPaddingWidth);
  }, [column.label]);

  const columnStyles = useMemo(() => {
    const styles: React.CSSProperties = {
      textTransform: 'none',
      padding: '0.25rem 0.5rem',
      fontSize: '0.75rem',
    };

    // Sistema tabela-centrado: Prioriza larguras definidas explicitamente
    let effectiveWidth;

    // 1ª prioridade: Largura redimensionada pelo usuário (persistida)
    if (columnWidth !== undefined) {
      effectiveWidth = columnWidth;
    }
    // 2ª prioridade: Largura definida explicitamente na tabela
    else if (column.width !== undefined) {
      effectiveWidth = typeof column.width === 'string'
        ? parseInt(column.width.replace('px', ''), 10)
        : column.width;
    }
    // 3ª prioridade: Fallback automático (apenas título + ícone visíveis)
    else {
      effectiveWidth = minWidthFromTitle;
    }

    if (effectiveWidth) {
      const widthValue = typeof effectiveWidth === 'number' ? `${effectiveWidth}px` : effectiveWidth;
      styles.width = widthValue;
      styles.minWidth = widthValue;
      styles.maxWidth = widthValue;
    }

    if (column.minWidth) {
      styles.minWidth = typeof column.minWidth === 'number' ? `${column.minWidth}px` : column.minWidth;
    }

    if (column.maxWidth) {
      styles.maxWidth = typeof column.maxWidth === 'number' ? `${column.maxWidth}px` : column.maxWidth;
    }


    return styles;
  }, [column.width, column.minWidth, column.maxWidth, columnWidth, minWidthFromTitle]);

  const columnClasses = useMemo(() => {
    const classes = [];

    if (column.className) {
      classes.push(column.className);
    }

    if (column.align || column.headerAlign) {
      const align = column.headerAlign || column.align;
      classes.push(`text-${align}`);
    }

    if (className) {
      classes.push(className);
    }

    // Adicionar classe para indicar que a coluna tem largura customizada
    if (columnWidth) {
      classes.push('column-has-custom-width');
    }

    return classes.join(' ');
  }, [column.className, column.align, column.headerAlign, className, columnWidth]);

  // Por padrão, todas as colunas são redimensionáveis exceto ações e última coluna
  const isResizable = (column.resizable ?? true) && column.key !== 'acoes' && column.key !== 'actions' && !isLastColumn;

  // Aplicar largura diretamente no elemento DOM para garantir prioridade
  useEffect(() => {
    if (columnRef.current && columnWidth) {
      const widthValue = `${columnWidth}px`;
      columnRef.current.style.setProperty('width', widthValue, 'important');
      columnRef.current.style.setProperty('min-width', widthValue, 'important');
      columnRef.current.style.setProperty('max-width', widthValue, 'important');
    }
  }, [columnWidth]);

  // Limpar flag de redimensionamento quando o redimensionamento terminar
  useEffect(() => {
    if (!isResizing && onResizeEnd) {
      // Pequeno delay para garantir que o evento de clique não seja executado
      const timeoutId = setTimeout(() => {
        wasResizingRef.current = false;
        onResizeEnd();
      }, 10);
      return () => clearTimeout(timeoutId);
    }
  }, [isResizing, onResizeEnd]);

  return (
    <th
      ref={columnRef}
      className={`${columnClasses} ${isSortable ? 'sortable' : ''} ${isResizing ? 'resizing' : ''}`}
      style={columnStyles}
      onClick={handleSort}
      title={column.tooltip}
      data-sortable={isSortable ? 'true' : 'false'}
      data-sorted={isSorted ? 'true' : 'false'}
      data-sort-direction={sortDirection || ''}
      data-resizable={isResizable ? 'true' : 'false'}
      data-column-width={columnWidth || ''}
    >
      <div className="d-flex align-items-center">
        <span>{column.label}</span>
        {getSortIcon()}
      </div>
      {/* Handle para redimensionamento - só mostrar se a coluna for redimensionável */}
      {isResizable && (
        <div
          className="resize-handle"
          onMouseDown={handleResizeMouseDown}
          title={t('other.resizeColumn')}
        />
      )}
    </th>
  );
};

export default React.memo(TableColumn) as typeof TableColumn;
