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
  ...tableProps
}: EmbeddedTablePanelProps<T>) {
  return (
    <div className="embedded-table-panel d-flex flex-column flex-grow-1 min-h-0">
      {(title || filters || toolbarExtra) && (
        <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
          {title && <h6 className="mb-0">{title}</h6>}
          {filters}
          {toolbarExtra}
        </div>
      )}
      <Table<T> {...tableProps} title={title} />
    </div>
  );
}

export default EmbeddedTablePanel;
