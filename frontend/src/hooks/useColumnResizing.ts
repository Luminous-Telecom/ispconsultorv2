import { useState, useCallback, useEffect, useRef } from 'react';
import { TableColumn } from 'components/tables/types';

interface UseColumnResizingOptions<T = Record<string, unknown>> {
  tableId: string;
  columns: TableColumn<T>[];
  minColumnWidth?: number;
  maxColumnWidth?: number;
  getMinWidthForColumn?: (columnKey: string) => number;
}

interface UseColumnResizingReturn {
  columnWidths: { [columnKey: string]: number };
  handleResizeStart: (columnKey: string, startX: number, currentWidth: number, snapshot?: Record<string, number>) => void;
  isResizing: boolean;
  resizeGuideX: number | null;
}

export function useColumnResizing<T = Record<string, unknown>>({
  tableId,
  columns,
  minColumnWidth = 40,
  maxColumnWidth = 2000,
  getMinWidthForColumn,
}: UseColumnResizingOptions<T>): UseColumnResizingReturn {
  const storageKey = `table-column-widths-${tableId}`;
  const [columnWidths, setColumnWidths] = useState<{ [columnKey: string]: number }>({});
  const [isResizing, setIsResizing] = useState(false);
  const [resizeGuideX, setResizeGuideX] = useState<number | null>(null);
  const activeResizeRef = useRef<{
    columnKey: string;
    startX: number;
    startWidth: number;
    pendingWidth: number;
    snapshot: Record<string, number> | null;
    maxWidth: number;
  } | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return;
      const parsed = JSON.parse(saved) as Record<string, number>;
      const validWidths: Record<string, number> = {};
      columns.forEach((column) => {
        const w = parsed[column.key];
        if (w) {
          validWidths[column.key] = Math.max(minColumnWidth, Math.min(maxColumnWidth, w));
        }
      });
      setColumnWidths(validWidths);
    } catch {
      // ignore
    }
  }, [tableId, columns, minColumnWidth, maxColumnWidth, storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(columnWidths));
    } catch {
      // ignore
    }
  }, [columnWidths, storageKey]);

  const handleResizeStart = useCallback((columnKey: string, startX: number, currentWidth: number, snapshot?: Record<string, number>) => {
    const startWidth = Math.round(currentWidth);
    activeResizeRef.current = {
      columnKey,
      startX,
      startWidth,
      pendingWidth: startWidth,
      snapshot: snapshot ?? null,
      maxWidth: Math.max(maxColumnWidth, startWidth),
    };
    setIsResizing(true);
    setResizeGuideX(startX);

    const handleMouseMove = (e: MouseEvent) => {
      const active = activeResizeRef.current;
      if (!active) return;

      const diff = e.clientX - active.startX;
      const colMin = getMinWidthForColumn ? getMinWidthForColumn(active.columnKey) : minColumnWidth;
      active.pendingWidth = Math.max(colMin, Math.min(active.maxWidth, active.startWidth + diff));
      setResizeGuideX(e.clientX);
    };

    const handleMouseUp = () => {
      const active = activeResizeRef.current;
      if (active) {
        const { columnKey: key, pendingWidth, snapshot: snap } = active;
        setColumnWidths((prev) => ({
          ...(snap ?? prev),
          [key]: pendingWidth,
        }));
      }

      activeResizeRef.current = null;
      setIsResizing(false);
      setResizeGuideX(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [minColumnWidth, maxColumnWidth, getMinWidthForColumn]);

  return {
    columnWidths,
    handleResizeStart,
    isResizing,
    resizeGuideX,
  };
}
