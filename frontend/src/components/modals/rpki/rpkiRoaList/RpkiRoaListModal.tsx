import React, { useCallback, useMemo } from 'react';
import ListModal from 'components/common/ListModal';
import { useI18n } from 'contexts/I18nContext';
import { useAuditoria } from 'hooks/useAuditoria';
import { useRpkiRoaListColumns, useRpkiRoaListSearchFields } from './rpkiRoaListColumns';
import { useRpkiRoaListData } from './useRpkiRoaListData';
import { useRpkiRoaListBulkActions } from './useRpkiRoaListBulkActions';
import { useRpkiRoaListFormState } from './useRpkiRoaListFormState';
import { useRpkiRoaListAnalysisConfirm, useRpkiRoaListAnalysisState } from './useRpkiRoaListAnalysis';
import { RpkiRoaListSubModals } from './RpkiRoaListSubModals';
import type { RpkiRoaListModalProps, RpkiRoaRow } from './types';

const RpkiRoaListModal: React.FC<RpkiRoaListModalProps> = ({
  show,
  onClose,
  skipWrapper = false,
  clienteIdFilter,
  tableTitle = 'ROAs',
}) => {
  const { t } = useI18n();
  const auditoria = useAuditoria();
  const auditLogsTitle = t('modal.auditLogs');

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

  const casOptions = useMemo(
    () => cas.map((ca) => ({ id: ca.id, nome: ca.nome })),
    [cas]
  );

  const handleAuditRoa = useCallback(
    (item: RpkiRoaRow) => {
      const id = Number(item.id);
      if (!Number.isFinite(id)) return;
      void auditoria.handleAudit('RpkiRoa', id);
    },
    [auditoria]
  );

  return (
    <>
      <ListModal<RpkiRoaRow>
        show={show}
        onClose={onClose}
        skipWrapper={skipWrapper}
        config={{
          title: tableTitle,
          columns: tableColumns,
          searchPlaceholder: 'Buscar...',
          searchFields,
          emptyMessage: 'Nenhum ROA encontrado',
          multiSelect: false,
        }}
        data={roasForTable}
        loading={false}
        bulkActions={bulkActions}
        onRefresh={() => {}}
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
        auditoria={auditoria}
        auditLogsTitle={auditLogsTitle}
      />
    </>
  );
};

export default RpkiRoaListModal;
