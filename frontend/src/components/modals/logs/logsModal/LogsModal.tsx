/**
 * Modal único reutilizável para todos os tipos de logs.
 * Conteúdo e dados variam conforme logType.
 */
import React, { useState, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useModalSelect } from 'hooks/useModalSelect';
import { AuditoriaLog } from 'services/auditoriaService';
import { TableConfig } from 'components/tables/types';
import { getAuditoriaDetalheExibir } from 'utils/auditoriaOperacionalDetalhe';
import { useLogsContent } from './hooks/useLogsContent';
import { useLogsAuditoriaFormatters } from './hooks/useLogsAuditoriaFormatters';
import { useLogsModalColumns } from './hooks/useLogsModalColumns';
import { useLogsModalTableMeta } from './hooks/useLogsModalTableMeta';
import LogsModalTable from './LogsModalTable';
import LogsModalSubModals from './LogsModalSubModals';
import type { LogsModalProps, MensagemItem } from './types';

const LogsModal: React.FC<LogsModalProps> = ({
  show,
  onClose: _onClose,
  logType = 'usuarios',
  variant = 'erp',
}) => {
  const { pathname } = useLocation();
  /** SuperAdmin em /saas: modais `logs-*` do registry vêm como erp, mas devem usar APIs agregadas (`/saas/*`). */
  const effectiveVariant = variant === 'erp' && pathname.startsWith('/saas') ? 'saas' : variant;
  const mesclarMensagensErp = variant === 'erp' && pathname.startsWith('/saas');
  const showEmpresaColumn = pathname.startsWith('/saas');

  const ctx = useLogsContent(logType, show, effectiveVariant, variant === 'saas', mesclarMensagensErp);
  const [showBlockdomiLogsReal, setShowBlockdomiLogsReal] = useState(false);
  const [whoisIp, setWhoisIp] = useState<string | null>(null);

  const {
    data,
    isLoading,
    refetch,
    isEquipamentosOuAgentes,
    isEquipamentos,
    isAuditoria,
    isEmail,
    isBlockdomiApi,
    showDetailsModal,
    setShowDetailsModal,
    selectedAuditoria,
    setSelectedAuditoria,
    selectedMensagem,
    setSelectedMensagem,
  } = ctx;

  const { formatTimestamp, formatAcao, getAcaoBadgeClass } = useLogsAuditoriaFormatters();

  const auditoriaExibirDetalhe = useMemo(
    () => getAuditoriaDetalheExibir(isAuditoria ? selectedAuditoria : null, showDetailsModal && isAuditoria),
    [isAuditoria, selectedAuditoria, showDetailsModal]
  );

  const { selectedItem, handleSelectionChange } = useModalSelect<{ id: number | string }>();

  const { auditoriaColumns, blockdomiColumns, mensagemColumns } = useLogsModalColumns({
    logType,
    showEmpresaColumn,
    isEmail,
    formatTimestamp,
    formatAcao,
    getAcaoBadgeClass,
  });

  const handleViewDetails = useCallback(
    (item: unknown) => {
      if (isAuditoria) {
        setSelectedAuditoria(item as AuditoriaLog);
        setShowDetailsModal(true);
      } else {
        setSelectedMensagem(item as MensagemItem);
        setShowDetailsModal(true);
      }
    },
    [isAuditoria, setSelectedAuditoria, setSelectedMensagem, setShowDetailsModal]
  );

  const tableMeta = useLogsModalTableMeta({
    ctx,
    data,
    isEquipamentos,
    isEquipamentosOuAgentes,
    isAuditoria,
    isEmail,
    isBlockdomiApi,
    setShowBlockdomiLogsReal,
    setWhoisIp,
    selectedItem,
    handleViewDetails,
  });

  const columns = isAuditoria
    ? auditoriaColumns
    : isBlockdomiApi
      ? blockdomiColumns
      : mensagemColumns;

  return (
    <>
      <LogsModalTable
        effectiveVariant={effectiveVariant}
        logType={logType}
        ctx={ctx}
        columns={columns as TableConfig<unknown>['columns']}
        modalData={tableMeta.modalData}
        isLoading={isLoading}
        title={tableMeta.title}
        emptyMessage={tableMeta.emptyMessage}
        searchPlaceholder={tableMeta.searchPlaceholder}
        defaultSearchField={tableMeta.defaultSearchField}
        searchFields={tableMeta.searchFields}
        pagination={tableMeta.pagination}
        bulkActions={tableMeta.bulkActions}
        isEquipamentosOuAgentes={isEquipamentosOuAgentes}
        handleSearchChange={tableMeta.handleSearchChange}
        handleClearFilters={tableMeta.handleClearFilters}
        handleSelectionChange={handleSelectionChange}
        refetch={refetch}
      />
      <LogsModalSubModals
        isBlockdomiApi={isBlockdomiApi}
        showBlockdomiLogsReal={showBlockdomiLogsReal}
        setShowBlockdomiLogsReal={setShowBlockdomiLogsReal}
        whoisIp={whoisIp}
        setWhoisIp={setWhoisIp}
        showDetailsModal={showDetailsModal}
        setShowDetailsModal={setShowDetailsModal}
        setSelectedAuditoria={setSelectedAuditoria}
        setSelectedMensagem={setSelectedMensagem}
        selectedMensagem={selectedMensagem}
        auditoriaExibirDetalhe={auditoriaExibirDetalhe}
        showEmpresaColumn={showEmpresaColumn}
      />
    </>
  );
};

export default LogsModal;
