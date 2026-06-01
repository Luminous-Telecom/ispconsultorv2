import React, { useState } from 'react';
import DraggableModal from 'components/common/DraggableModal';
import { CancelarButton, ConfirmarButton } from 'components/ui';
import EmbeddedTablePanel from 'components/common/EmbeddedTablePanel';
import { TableConfig } from 'components/tables/types';

interface AnalysisRow {
  analysis_id: string;
  roa_id: number;
  prefix: string;
  asn: string;
  max_length: number;
  status: 'ok' | 'revoked' | 'expired' | 'inconsistent' | 'not_found';
  message: string;
  selectable: boolean;
}

type AnalysisTableRow = AnalysisRow & { id: string };

interface RpkiRoaAnalysisModalProps {
  show: boolean;
  caNome: string;
  rows: AnalysisRow[];
  onClose: () => void;
  onConfirm: (selectedRows: AnalysisRow[]) => void;
}

const RpkiRoaAnalysisModal: React.FC<RpkiRoaAnalysisModalProps> = ({
  show,
  caNome,
  rows,
  onClose,
  onConfirm,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  React.useEffect(() => {
    setSelectedIds([]);
  }, [show, rows]);

  const selectedRows = rows.filter((row) => selectedIds.includes(row.analysis_id));
  const hasApplicableSelection = selectedRows.some(
    (row) =>
      (row.selectable && row.roa_id === 0) ||
      (row.selectable &&
        row.roa_id > 0 &&
        (row.status === 'not_found' ||
          row.status === 'inconsistent' ||
          row.status === 'expired'))
  );
  const rowsWithId = rows.map((row) => ({ ...row, id: row.analysis_id }));

  const columns: TableConfig<AnalysisTableRow>['columns'] = [
    {
      key: 'roa_id',
      label: 'Referência',
      sortable: true,
      width: '100px',
      render: (item) => (item.roa_id > 0 ? item.roa_id : 'novo'),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      width: '130px',
      render: (item) => {
        if (item.status === 'ok') return <span className="badge bg-success">OK</span>;
        if (item.status === 'not_found') return <span className="badge bg-warning text-dark">Não encontrado</span>;
        if (item.status === 'inconsistent') return <span className="badge bg-danger">Inconsistente</span>;
        if (item.status === 'expired') return <span className="badge bg-secondary">Expirada</span>;
        return <span className="badge bg-dark">Revogada</span>;
      },
    },
    { key: 'asn', label: 'ASN', sortable: true, width: '120px', render: (item) => item.asn },
    { key: 'prefix', label: 'Prefixo', sortable: true, width: '220px', render: (item) => `${item.prefix}/${item.max_length}` },
    { key: 'message', label: 'Resultado', sortable: true, render: (item) => item.message },
  ];

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={`Análise de ROA - ${caNome}`}
      size="xl"
      modalId="rpki-roa-analysis-modal"
      className="no-padding list-modal-no-body-scroll"
      headerActions={
        <div className="d-flex gap-2 modal-header-actions">
          <CancelarButton type="button" onClick={onClose} />
          <ConfirmarButton
            type="button"
            disabled={rows.length === 0 || !hasApplicableSelection}
            onClick={() => onConfirm(selectedRows)}
          />
        </div>
      }
    >
      <div className="list-modal-table-wrapper">
        <div
          className="alert alert-info rounded-0 border-0 border-bottom py-2 px-3 mb-0 small d-flex gap-2 align-items-start"
          role="status"
        >
          <i className="bi bi-info-circle flex-shrink-0" aria-hidden />
          <span>
            Selecione as linhas das alterações que deseja aplicar (criar ROA nova ou revogar conforme a análise) e
            confirme.
          </span>
        </div>
        <div className="list-modal-scroll-wrapper">
          <EmbeddedTablePanel<AnalysisTableRow>
            layoutWrapper={false}
            className="no-padding"
            title="Análise de ROAs"
            config={{
              columns,
              data: rowsWithId,
              loading: false,
              searchable: false,
              sortable: true,
              striped: true,
              hover: true,
              responsive: true,
              selectable: true,
              multiSelect: true,
              emptyMessage: 'Nenhuma ROA encontrada na análise',
            }}
            tableId="rpki-roa-analysis-modal"
            onRefresh={() => {}}
            onSelectionChange={(items) => {
              setSelectedIds(items.map((row) => row.analysis_id));
            }}
          />
          {rows.length === 0 ? (
            <div className="small text-muted px-3 py-2">
              Nenhuma sugestão automática aplicável para confirmação.
            </div>
          ) : null}
        </div>
      </div>
    </DraggableModal>
  );
};

export default RpkiRoaAnalysisModal;

