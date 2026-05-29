export function measureColumnWidths(
  table: HTMLTableElement,
  visibleColumns: { key: string }[],
  selectable: boolean
): Record<string, number> {
  const headerCells = table.querySelectorAll('thead tr th');
  const widths: Record<string, number> = {};

  visibleColumns.forEach((col, index) => {
    const th = headerCells[(selectable ? 1 : 0) + index] as HTMLElement | undefined;
    if (th) {
      widths[col.key] = Math.round(th.getBoundingClientRect().width);
    }
  });

  return widths;
}
