import React, { useMemo } from 'react';
import Table from 'components/tables/Table';
import type { TableProps } from 'components/tables/Table';
import { withCadastroDateColumns } from 'components/tables/cadastroDateColumns';
import { useI18n } from 'contexts/I18nContext';

export type EmbeddedTablePanelProps<T extends { id: number | string }> = TableProps<T> & {
  filters?: React.ReactNode;
  toolbarExtra?: React.ReactNode;
  /** Listagem de cadastro mostra criação e última modificação. Logs e históricos ficam de fora. */
  cadastroDates?: boolean;
};

function EmbeddedTablePanel<T extends { id: number | string }>({
  filters,
  toolbarExtra,
  title,
  syncWithHeader = false,
  cadastroDates = true,
  config,
  ...tableProps
}: EmbeddedTablePanelProps<T>) {
  const { t } = useI18n();
  const tableConfig = useMemo(
    () => (cadastroDates ? { ...config, columns: withCadastroDateColumns(config.columns, t) } : config),
    [cadastroDates, config, t],
  );
  return (
    <div className="embedded-table-panel d-flex flex-column flex-grow-1 min-h-0">
      {(title || filters || toolbarExtra) && (
        <div className="embedded-table-panel-heading d-flex flex-wrap align-items-center gap-2">
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
      <Table<T> {...tableProps} config={tableConfig} title={title} syncWithHeader={syncWithHeader} />
    </div>
  );
}

export default EmbeddedTablePanel;
