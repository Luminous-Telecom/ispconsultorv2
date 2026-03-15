import { useState, useCallback, useEffect, useRef } from 'react';
import { TableColumn } from 'components/tables/types';

interface UseColumnResizingOptions<T = Record<string, unknown>> {
  tableId: string;
  columns: TableColumn<T>[];
  defaultColumnWidth?: number;
  minColumnWidth?: number;
  maxColumnWidth?: number;
  getMinWidthForColumn?: (columnKey: string) => number;
  onResizeEnd?: () => void;
}

interface UseColumnResizingReturn {
  columnWidths: { [columnKey: string]: number };
  handleResizeStart: (columnKey: string, startX: number, currentWidth: number) => void;
  handleResizeEnd: () => void;
  isResizing: boolean;
  resetColumnWidths: () => void;
}

export function useColumnResizing<T = Record<string, unknown>>({
  tableId,
  columns,
  defaultColumnWidth = 120,
  minColumnWidth = 40, // Largura mínima padrão com espaço para ícone de ordenação
  maxColumnWidth = 400,
  getMinWidthForColumn: _getMinWidthForColumn,
  onResizeEnd
}: UseColumnResizingOptions<T>): UseColumnResizingReturn {
  const storageKey = `table-column-widths-${tableId}`;
  const [columnWidths, setColumnWidths] = useState<{ [columnKey: string]: number }>({});
  const [isResizing, setIsResizing] = useState(false);
  const currentResizeRef = useRef<{
    columnKey: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  // Carregar larguras salvas do localStorage
  useEffect(() => {
    try {
      const savedWidths = localStorage.getItem(storageKey);
      if (savedWidths) {
        const parsedWidths = JSON.parse(savedWidths);
        // Filtrar apenas as colunas que ainda existem
        const validWidths: { [columnKey: string]: number } = {};
        columns.forEach(column => {
          if (parsedWidths[column.key]) {
            validWidths[column.key] = Math.max(
              minColumnWidth,
              Math.min(maxColumnWidth, parsedWidths[column.key])
            );
          }
        });
        setColumnWidths(validWidths);
      }
    } catch (error) {
      // Silently handle localStorage errors
    }
  }, [tableId, columns, minColumnWidth, maxColumnWidth, storageKey]);

  // Salvar larguras no localStorage quando mudarem
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(columnWidths));
    } catch (error) {
      // Silently handle localStorage errors
    }
  }, [columnWidths, storageKey]);

  const handleResizeStart = useCallback((columnKey: string, startX: number, currentWidth: number) => {
    setIsResizing(true);
    currentResizeRef.current = { columnKey, startX, startWidth: currentWidth };

    // Adicionar listeners globais
    const handleMouseMove = (e: MouseEvent) => {
      if (!currentResizeRef.current) return;

      const { columnKey, startX, startWidth } = currentResizeRef.current;
      const diff = e.clientX - startX;
      // Usar largura mínima específica da coluna se disponível, senão usar a padrão
      const columnMinWidth = _getMinWidthForColumn ? _getMinWidthForColumn(columnKey) : minColumnWidth;
      const newWidth = Math.max(columnMinWidth, Math.min(maxColumnWidth, startWidth + diff));

      setColumnWidths(prev => ({
        ...prev,
        [columnKey]: newWidth
      }));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      currentResizeRef.current = null;

      // Remover listeners
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      // Resetar cursor
      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      // Chamar callback de fim do redimensionamento
      if (onResizeEnd) {
        onResizeEnd();
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Mudar cursor
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [minColumnWidth, maxColumnWidth, _getMinWidthForColumn, onResizeEnd]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
    currentResizeRef.current = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  const resetColumnWidths = useCallback(() => {
    setColumnWidths({});
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      // Silently handle localStorage errors
    }
  }, [storageKey]);

  // Função helper para obter largura de uma coluna (usa defaultColumnWidth)
  const _getColumnWidth = useCallback((columnKey: string): number => {
    return columnWidths[columnKey] || defaultColumnWidth;
  }, [columnWidths, defaultColumnWidth]);

  return {
    columnWidths,
    handleResizeStart,
    handleResizeEnd,
    isResizing,
    resetColumnWidths
  };
}