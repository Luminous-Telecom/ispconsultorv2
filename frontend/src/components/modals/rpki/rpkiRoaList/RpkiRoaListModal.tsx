import React, { useCallback } from 'react';
import ListModal from 'components/common/ListModal';
import { useRpkiListModal } from 'hooks/useRpkiListModal';
import { useRpkiRoaListColumns, useRpkiRoaListSearchFields } from './rpkiRoaListColumns';
import { useRpkiRoaListData } from './useRpkiRoaListData';
import { useRpkiRoaListBulkActions } from './useRpkiRoaListBulkActions';
import { useRpkiRoaListFormState } from './useRpkiRoaListFormState';
import { useRpkiRoaListAnalysisConfirm, useRpkiRoaListAnalysisState } from './useRpkiRoaListAnalysis';
import { RpkiRoaListSubModals } from './RpkiRoaListSubModals';
import type { RpkiRoaListModalProps, RpkiRoaRow } from './types';

function getSortableValue(row: RpkiRoaRow, sortKey: string): string {
  switch (sortKey) {
    case 'id':
      return String(row.id ?? '');
    case 'ca_nome':
      return String(row.ca_nome ?? '');
    case 'clienteNome':
      return String(row.clienteNome ?? '');
    case 'prefix':
      return String(row.prefix ?? '');
    case 'asn':
      return String(row.asn ?? '');
    case 'max_length':
      return String(row.max_length ?? '');
    case 'not_before':
      return String(row.not_before ?? '');
    case 'not_after':
      return String(row.not_after ?? '');
    case 'revoked_at':
      return String(row.revoked_at ?? '');
    case 'status':
      return String(row.status ?? '');
    default:
      return '';
  }
}

const RpkiRoaListModal: React.FC<RpkiRoaListModalProps> = ({
  show,
  onClose,
  skipWrapper = false,
  clienteIdFilter,
  tableTitle,
}) => {
  const rpki = useRpkiListModal<RpkiRoaRow>();

  const { roas, setRoas, cas, roasForTable, reloadRoas } = useRpkiRoaListData({
    show,
    clienteIdFilter,
  });

  const {
    showFormModal,
    formMode,
    editingRoa,
    handleCreate,
    handleEdit,
    handleFormClose,
    handleFormSuccess,
  } = useRpkiRoaListFormState({ show, roas, cas, setRoas });

  const {
    showAnalysisModal,
    analysisCaNome,
    analysisCaId,
    analysisRows,
    handleOpenAnalysis,
    handleAnalysisClose,
  } = useRpkiRoaListAnalysisState();

  const { handleAnalysisConfirm } = useRpkiRoaListAnalysisConfirm({
    analysisCaId,
    reloadRoas,
    onClose: handleAnalysisClose,
  });

  const { bulkActions } = useRpkiRoaListBulkActions({
    cas,
    roas,
    setRoas,
    onCreate: handleCreate,
    onEdit: handleEdit,
    onOpenAnalysis: handleOpenAnalysis,
  });

  const tableColumns = useRpkiRoaListColumns(clienteIdFilter);
  const searchFields = useRpkiRoaListSearchFields(clienteIdFilter);

  const { rows: pagedRows, pagination } = rpki.paginateClientSide(
    roasForTable,
    getSortableValue,
    (row, term) =>
      String(row.id ?? '').includes(term) ||
      String(row.ca_nome ?? '').toLowerCase().includes(term) ||
      String(row.clienteNome ?? '').toLowerCase().includes(term) ||
      String(row.prefix ?? '').toLowerCase().includes(term) ||
      String(row.asn ?? '').toLowerCase().includes(term) ||
      String(row.status ?? '').toLowerCase().includes(term)
  );

  const casOptions = cas.map((ca) => ({ id: ca.id, nome: ca.nome }));

  const handleAuditRoa = useCallback(
    (item: RpkiRoaRow) => {
      const id = Number(item.id);
      if (!Number.isFinite(id)) return;
      void rpki.auditoria.handleAudit('RpkiRoa', id);
    },
    [rpki.auditoria]
  );

  return (
    <>
      <ListModal<RpkiRoaRow>
        show={show}
        onClose={onClose}
        skipWrapper={skipWrapper}
        showEmbeddedTableTitle={skipWrapper && Boolean(tableTitle)}
        config={{
          title: tableTitle ?? 'ROAs',
          columns: tableColumns,
          searchPlaceholder: 'Buscar...',
          searchFields,
          emptyMessage: 'Nenhum ROA encontrado',
          multiSelect: false,
        }}
        data={pagedRows}
        loading={false}
        search={rpki.tableFilters.search}
        onSearchChange={rpki.handleSearchChange}
        sortColumn={rpki.tableFilters.sortColumn}
        sortDirection={rpki.tableFilters.sortDirection}
        onSortChange={rpki.tableFilters.setSort}
        pagination={pagination}
        onPageChange={rpki.tableFilters.setPage}
        onLimitChange={rpki.tableFilters.setLimit}
        bulkActions={bulkActions}
        onRefresh={() => void reloadRoas()}
        onAudit={handleAuditRoa}
        auditEntity="RpkiRoa"
        tableId="rpki-roas-list-modal"
      />

      <RpkiRoaListSubModals
        showFormModal={showFormModal}
        formMode={formMode}
        editingRoa={editingRoa}
        cas={casOptions}
        onFormClose={handleFormClose}
        onFormSuccess={handleFormSuccess}
        showAnalysisModal={showAnalysisModal}
        analysisCaNome={analysisCaNome}
        analysisRows={analysisRows}
        onAnalysisClose={handleAnalysisClose}
        onAnalysisConfirm={handleAnalysisConfirm}
        auditoria={rpki.auditoria}
        auditLogsTitle={rpki.t('modal.auditLogs')}
      />
    </>
  );
};

export default RpkiRoaListModal;
