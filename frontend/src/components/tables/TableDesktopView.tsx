import React, { RefObject } from 'react';
import { useElementProperties } from 'hooks/useElementProperties';
import { ColWithWidth, DynamicStyledElement, IconOnlyButton, NavLinkButton } from '../ui';
import Loading from '../ui/Loading';
import TableColumn from './TableColumn';
import {
  ACTIONS_COLUMN_WIDTH_PX,
  CHECKBOX_COLUMN_WIDTH_PX,
  fixedWidthStyle,
  getColumnMinWidth,
  parseColumnWidthPx,
  resolveColumnWidthPx,
} from './columnWidthUtils';
import { drainPossiblePromise } from './tableUtils';
import { SortDirection, TableAction, TableColumn as TableColumnType } from './types';

const TableCellWithWidth: React.FC<{
  className: string;
  widthStyle?: Record<string, string | undefined>;
  children: React.ReactNode;
}> = ({ className, widthStyle, children }) => {
  const ref = React.useRef<HTMLTableCellElement>(null);
  useElementProperties(ref, widthStyle ?? {}, [widthStyle]);

  return (
    <td ref={ref} className={className}>
      {children}
    </td>
  );
};

interface TableDesktopViewProps<T extends { id: number | string }> {
  tableRef: RefObject<HTMLTableElement | null>;
  tableScrollRef: RefObject<HTMLDivElement | null>;
  tableMinWidth: number;
  isResizing: boolean;
  hasCustomWidths: boolean;
  resizeGuideStyle: { left: number; top: number; height: number } | null;
  selectable: boolean;
  uniqueTableId: string;
  isAllSelected: boolean;
  onToggleSelectAll: () => void;
  onClearSelection: () => void;
  visibleColumns: TableColumnType<T>[];
  columnWidths: Record<string, number>;
  sortColumn?: string;
  sortDirection?: SortDirection;
  onSort?: (column: string, direction: SortDirection) => void;
  onResizeStart: (columnKey: string, startEdgeX: number, currentWidth: number) => void;
  actions: TableAction<T>[];
  loading: boolean;
  loadingMessage: string;
  emptyMessage: string;
  paginatedData: T[];
  selectedItems: T[];
  onToggleSelection: (item: T) => void;
  onRowClick?: (item: T, index: number) => void;
  onRowDoubleClick?: (item: T, index: number) => void;
  onActionClick?: (action: TableAction<T>, item: T, index: number) => void;
  openActionDropdown: number | string | null;
  onOpenActionDropdown: (id: number | string | null) => void;
  actionsMenuLabel: string;
}

function TableDesktopView<T extends { id: number | string }>({
  tableRef,
  tableScrollRef,
  tableMinWidth,
  isResizing,
  hasCustomWidths,
  resizeGuideStyle,
  selectable,
  uniqueTableId,
  isAllSelected,
  onToggleSelectAll,
  onClearSelection,
  visibleColumns,
  columnWidths,
  sortColumn,
  sortDirection,
  onSort,
  onResizeStart,
  actions,
  loading,
  loadingMessage,
  emptyMessage,
  paginatedData,
  selectedItems,
  onToggleSelection,
  onRowClick,
  onRowDoubleClick,
  onActionClick,
  openActionDropdown,
  onOpenActionDropdown,
  actionsMenuLabel,
}: TableDesktopViewProps<T>) {
  const colSpan = visibleColumns.length + (selectable ? 1 : 0) + (actions.length > 0 ? 1 : 0);

  useElementProperties(tableRef, { '--table-min-width': `${tableMinWidth}px` }, [tableMinWidth]);

  return (
    <div
      ref={tableScrollRef}
      className={`table-responsive table-responsive-custom${loading ? ' table-responsive-custom--loading' : ''}`.trim()}
    >
      {loading && (
        <div className="table-loading-overlay" aria-busy="true" aria-live="polite">
          <Loading variant="centered" size="sm" message={loadingMessage} showMessage={false} />
        </div>
      )}
      {resizeGuideStyle != null && (
        <DynamicStyledElement
          className="table-resize-guide"
          properties={{
            left: `${resizeGuideStyle.left}px`,
            top: `${resizeGuideStyle.top}px`,
            height: `${resizeGuideStyle.height}px`,
          }}
          deps={[resizeGuideStyle.left, resizeGuideStyle.top, resizeGuideStyle.height]}
          aria-hidden
        />
      )}
      <table
        ref={tableRef}
        className={`table table-striped table-sm table-custom table-resizable table-resizable-enabled ${isResizing ? 'resizing' : ''} ${hasCustomWidths ? 'table-columns-locked' : ''} table-min-width-host`}
      >
        <colgroup>
          {selectable && <ColWithWidth width={CHECKBOX_COLUMN_WIDTH_PX} className="col-checkbox table-col-checkbox" />}
          {visibleColumns.map((column) => {
            const widthPx = resolveColumnWidthPx(column, columnWidths, hasCustomWidths);
            return (
              <ColWithWidth
                key={column.key}
                width={widthPx ?? 'auto'}
                className={column.key === 'id' ? 'col-id' : undefined}
              />
            );
          })}
          {actions.length > 0 && <ColWithWidth width={ACTIONS_COLUMN_WIDTH_PX} className="table-col-actions" />}
        </colgroup>

        <thead>
          <tr>
            {selectable && (
              <th className="text-center col-checkbox">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={() => {
                    if (isAllSelected) onClearSelection();
                    else onToggleSelectAll();
                  }}
                />
              </th>
            )}
            {visibleColumns.map((column) => {
              const rawWidth = columnWidths[column.key];
              const effectiveHeaderWidth =
                rawWidth !== undefined ? rawWidth : parseColumnWidthPx(column.width);
              return (
                <TableColumn
                  key={column.key}
                  column={column}
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={onSort}
                  columnWidth={effectiveHeaderWidth}
                  onResizeStart={onResizeStart}
                  isResizing={isResizing}
                />
              );
            })}
            {actions.length > 0 && <th className="text-center col-actions">Ações</th>}
          </tr>
        </thead>

        {loading ? (
          <tbody>
            <tr className="table-body-loading-spacer">
              <td colSpan={colSpan} className="table-body-loading-spacer-cell" aria-hidden="true" />
            </tr>
          </tbody>
        ) : paginatedData.length === 0 ? (
          <tbody>
            <tr>
              <td colSpan={colSpan} className="text-center">
                {emptyMessage}
              </td>
            </tr>
          </tbody>
        ) : (
          <tbody>
            {paginatedData.map((item, index) => {
              const isSelected = selectedItems.some((selected) => selected.id === item.id);
              return (
                <tr
                  key={item.id}
                  className={`${isSelected ? 'table-active' : ''} table-row-clickable`}
                  onClick={() => {
                    if (selectable) onToggleSelection(item);
                    drainPossiblePromise(onRowClick?.(item, index));
                  }}
                  onDoubleClick={() => drainPossiblePromise(onRowDoubleClick?.(item, index))}
                >
                  {selectable && (
                    <td className="text-center col-checkbox" onClick={(e) => e.stopPropagation()}>
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          onToggleSelection(item);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        id={`${uniqueTableId}-checkbox-${item.id}`}
                        name={`${uniqueTableId}-checkbox-${item.id}`}
                      />
                    </td>
                  )}
                  {visibleColumns.map((column) => {
                    const widthPx = resolveColumnWidthPx(column, columnWidths, hasCustomWidths);
                    const widthProps: Record<string, string | undefined> = {};
                    if (hasCustomWidths && widthPx != null) {
                      Object.assign(widthProps, fixedWidthStyle(widthPx));
                    } else if (columnWidths[column.key] != null) {
                      Object.assign(widthProps, fixedWidthStyle(columnWidths[column.key]));
                    } else {
                      const colMinWidth = getColumnMinWidth(column);
                      const widthCss = parseColumnWidthPx(column.width);
                      const widthVal = widthCss != null ? `${widthCss}px` : undefined;
                      const minCss = colMinWidth != null ? `${colMinWidth}px` : widthVal;
                      const maxVal =
                        column.maxWidth != null
                          ? typeof column.maxWidth === 'number'
                            ? `${column.maxWidth}px`
                            : column.maxWidth
                          : column.badgeLabels?.length && widthVal
                            ? widthVal
                            : undefined;
                      if (widthVal) widthProps.width = widthVal;
                      if (minCss) widthProps.minWidth = minCss;
                      if (maxVal) widthProps.maxWidth = maxVal;
                    }

                    return (
                      <TableCellWithWidth
                        key={column.key}
                        className={[
                          column.key === 'id' ? 'col-id' : '',
                          column.align ? `text-${column.align}` : '',
                          column.className,
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        widthStyle={widthProps}
                      >
                        {column.render
                          ? column.render(item, index)
                          : String(item[column.key as keyof T] || '')}
                      </TableCellWithWidth>
                    );
                  })}
                  {actions.length > 0 && (
                    <td className="text-center col-actions" onClick={(e) => e.stopPropagation()}>
                      <div className="table-actions-desktop">
                        <IconOnlyButton
                          className="table-action-menu-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenActionDropdown(openActionDropdown === item.id ? null : item.id);
                          }}
                          label={actionsMenuLabel}
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <circle cx="12" cy="12" r="1" />
                            <circle cx="12" cy="5" r="1" />
                            <circle cx="12" cy="19" r="1" />
                          </svg>
                        </IconOnlyButton>
                        {openActionDropdown === item.id && (
                          <>
                            <div
                              className="table-dropdown-overlay"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenActionDropdown(null);
                              }}
                            />
                            <div className="table-dropdown">
                              {actions
                                .filter((action) =>
                                  typeof action.hidden === 'function'
                                    ? !action.hidden(item)
                                    : !action.hidden
                                )
                                .map((action) => {
                                  const isDisabled =
                                    typeof action.disabled === 'function'
                                      ? action.disabled(item)
                                      : action.disabled;
                                  return (
                                    <NavLinkButton
                                      key={action.key}
                                      className={`table-dropdown-item ${action.variant === 'danger' ? 'danger' : ''}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onOpenActionDropdown(null);
                                        if (!isDisabled && onActionClick) {
                                          drainPossiblePromise(onActionClick(action, item, index));
                                        } else if (!isDisabled && action.onClick) {
                                          drainPossiblePromise(action.onClick(item, index));
                                        }
                                      }}
                                      disabled={isDisabled}
                                      ariaLabel={action.label}
                                    >
                                      {action.icon && <i className={action.icon} />}
                                      <span>{action.label}</span>
                                    </NavLinkButton>
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
        )}
      </table>
    </div>
  );
}

export default TableDesktopView;
