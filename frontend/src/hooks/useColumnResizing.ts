import { useState, useCallback, useEffect, useRef } from 'react';
import { TableColumn } from 'components/tables/types';
import { getFixedColumnWidthPx } from 'components/tables/columnWidthUtils';

interface UseColumnResizingOptions<T = Record<string, unknown>> {
  tableId: string;
  columns: TableColumn<T>[];
  minColumnWidth?: number;
  maxColumnWidth?: number;
  getMinWidthForColumn?: (columnKey: string) => number;
}

interface UseColumnResizingReturn {
  columnWidths: { [columnKey: string]: number };
  handleResizeStart: (
    columnKey: string,
    startEdgeX: number,
    currentWidth: number,
    snapshot?: Record<string, number>
  ) => void;
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
  } | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return;
      const parsed = JSON.parse(saved) as Record<string, number>;
      const validWidths: Record<string, number> = {};
      columns.forEach((column) => {
        // ID/Status têm largura fixa global — não restaurar do localStorage.
        if (getFixedColumnWidthPx(column.key) != null) return;
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

  const handleResizeStart = useCallback((
    columnKey: string,
    startEdgeX: number,
    currentWidth: number,
    snapshot?: Record<string, number>
  ) => {
    if (getFixedColumnWidthPx(columnKey) != null) return;

    const startWidth = Math.round(currentWidth);
    const hasSnapshot = snapshot != null && Object.keys(snapshot).length > 0;

    if (hasSnapshot) {
      const filtered: Record<string, number> = {};
      Object.entries(snapshot).forEach(([key, value]) => {
        if (getFixedColumnWidthPx(key) == null) filtered[key] = value;
      });
      setColumnWidths(filtered);
    }

    activeResizeRef.current = {
      columnKey,
      startX: startEdgeX,
      startWidth,
      pendingWidth: startWidth,
    };
    setIsResizing(true);
    setResizeGuideX(startEdgeX);

    const handleMouseMove = (e: MouseEvent) => {
      const active = activeResizeRef.current;
      if (!active) return;

      const diff = e.clientX - active.startX;
      const columnMin = getMinWidthForColumn?.(active.columnKey) ?? minColumnWidth;
      active.pendingWidth = Math.max(
        columnMin,
        Math.min(maxColumnWidth, active.startWidth + diff)
      );
      setResizeGuideX(active.startX + active.pendingWidth - active.startWidth);
    };

    const handleMouseUp = () => {
      const active = activeResizeRef.current;
      if (active) {
        setColumnWidths((prev) => ({
          ...prev,
          [active.columnKey]: active.pendingWidth,
        }));
      }
      activeResizeRef.current = null;
      setIsResizing(false);
      setResizeGuideX(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [getMinWidthForColumn, maxColumnWidth, minColumnWidth]);

  return {
    columnWidths,
    handleResizeStart,
    isResizing,
    resizeGuideX,
  };
}
