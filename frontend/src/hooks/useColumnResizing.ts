import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { TableColumn } from 'components/tables/types';
import { getColumnMinWidth } from 'components/tables/columnWidthUtils';

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

function widthsEqual(
  a: Record<string, number>,
  b: Record<string, number>
): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((key) => a[key] === b[key]);
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
  const getMinWidthRef = useRef(getMinWidthForColumn);
  getMinWidthRef.current = getMinWidthForColumn;

  const columnKeysSignature = useMemo(
    () => columns.map((column) => column.key).join('|'),
    [columns]
  );

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return;
      const parsed = JSON.parse(saved) as Record<string, number>;
      const validWidths: Record<string, number> = {};
      columns.forEach((column) => {
        if (column.key === 'acoes' || column.key === 'actions') return;
        const w = parsed[column.key];
        if (w) {
          const columnMin =
            getMinWidthRef.current?.(column.key) ??
            getColumnMinWidth({ key: column.key, label: column.label }) ??
            minColumnWidth;
          validWidths[column.key] = Math.max(columnMin, Math.min(maxColumnWidth, w));
        }
      });
      setColumnWidths((prev) => (widthsEqual(prev, validWidths) ? prev : validWidths));
    } catch {
      // ignore
    }
    // columns via signature — evita loop quando o array é recriado a cada render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableId, columnKeysSignature, minColumnWidth, maxColumnWidth, storageKey]);

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
    if (columnKey === 'acoes' || columnKey === 'actions') return;

    const startWidth = Math.round(currentWidth);
    const hasSnapshot = snapshot != null && Object.keys(snapshot).length > 0;

    if (hasSnapshot && snapshot) {
      setColumnWidths((prev) => (widthsEqual(prev, snapshot) ? prev : snapshot));
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
      const columnMin = getMinWidthRef.current?.(active.columnKey) ?? minColumnWidth;
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
  }, [maxColumnWidth, minColumnWidth]);

  return {
    columnWidths,
    handleResizeStart,
    isResizing,
    resizeGuideX,
  };
}
