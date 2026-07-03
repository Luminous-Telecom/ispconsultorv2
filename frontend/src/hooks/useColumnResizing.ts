import { useState, useCallback, useEffect, useRef } from 'react';
import { TableColumn } from 'components/tables/types';
import { ID_COLUMN_MIN_WIDTH_PX } from 'components/tables/columnWidthUtils';

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
        const w = parsed[column.key];
        if (w) {
          let clamped = Math.max(minColumnWidth, Math.min(maxColumnWidth, w));
          if (column.key === 'id') {
            clamped = Math.max(ID_COLUMN_MIN_WIDTH_PX, clamped);
          }
          validWidths[column.key] = clamped;
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
    const startWidth = Math.round(currentWidth);
    const hasSnapshot = snapshot != null && Object.keys(snapshot).length > 0;

    if (hasSnapshot) {
      setColumnWidths({ ...snapshot, [columnKey]: startWidth });
    }

    activeResizeRef.current = {
      columnKey,
      startX: startEdgeX,
      startWidth,
      pendingWidth: startWidth,
    };
    setIsResizing(true);
    setResizeGuideX(startEdgeX);

    const applyPendingWidth = (pendingWidth: number) => {
      const active = activeResizeRef.current;
      if (!active) return;
      active.pendingWidth = pendingWidth;
      setColumnWidths((prev) => ({ ...prev, [active.columnKey]: pendingWidth }));
    };

    const handleMouseMove = (e: MouseEvent) => {
      const active = activeResizeRef.current;
      if (!active) return;

      const diff = e.clientX - active.startX;
      const colMin = getMinWidthForColumn ? getMinWidthForColumn(active.columnKey) : minColumnWidth;
      const floor =
        active.columnKey === 'id' ? Math.max(ID_COLUMN_MIN_WIDTH_PX, colMin) : colMin;
      const pendingWidth = Math.max(floor, Math.min(maxColumnWidth, active.startWidth + diff));
      applyPendingWidth(pendingWidth);
      setResizeGuideX(e.clientX);
    };

    const handleMouseUp = () => {
      const active = activeResizeRef.current;
      if (active) {
        applyPendingWidth(active.pendingWidth);
      }

      activeResizeRef.current = null;
      setIsResizing(false);
      setResizeGuideX(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.classList.remove('resizing-columns');
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.classList.add('resizing-columns');
  }, [minColumnWidth, maxColumnWidth, getMinWidthForColumn]);

  return {
    columnWidths,
    handleResizeStart,
    isResizing,
    resizeGuideX,
  };
}
