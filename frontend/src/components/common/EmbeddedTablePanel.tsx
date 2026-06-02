import React from 'react';
import Table from 'components/tables/Table';
import type { TableProps } from 'components/tables/Table';

export type EmbeddedTablePanelProps<T extends { id: number | string }> = TableProps<T> & {
  filters?: React.ReactNode;
  toolbarExtra?: React.ReactNode;
};

function EmbeddedTablePanel<T extends { id: number | string }>({
  filters,
  toolbarExtra,
  title,
  syncWithHeader = false,
  ...tableProps
}: EmbeddedTablePanelProps<T>) {
  return (
    <div className="embedded-table-panel d-flex flex-column flex-grow-1 min-h-0">
      {(title || filters || toolbarExtra) && (
        <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
          {title && (
            <div className="flex-grow-1 text-center">
              <div className="embedded-table-panel-title">{title}</div>
            </div>
          )}
          {(filters || toolbarExtra) && (
            <div className="d-flex flex-wrap align-items-center gap-2">
              {filters}
              {toolbarExtra}
            </div>
          )}
        </div>
      )}
      <Table<T> {...tableProps} title={title} syncWithHeader={syncWithHeader} />
    </div>
  );
}

export default EmbeddedTablePanel;
