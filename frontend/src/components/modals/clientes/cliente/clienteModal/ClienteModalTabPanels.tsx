import React from 'react';
import { SortDirection, TableColumn as TableColumnType } from 'components/tables/types';
import { CarneParcela, ClienteFormData, ClienteFormErrors } from 'types';
import { TituloItem } from 'types/cliente';
import { Contrato } from 'hooks/useContratos';
import DadosBasicosTab from '../abas/DadosBasicosTab';
import ContatoTab from '../abas/ContatoTab';
import EnderecoTab from '../abas/EnderecoTab';
import ContratosTab from '../abas/ContratosTab';
import FinanceiroTab from '../abas/FinanceiroTab';
import ObservacoesTab from '../abas/ObservacoesTab';
import ArquivosTab from '../abas/ArquivosTab';
import ClienteTunelTab from '../abas/ClienteTunelTab';
import ClienteSshDevicesTab from '../abas/ClienteSshDevicesTab';
import ClienteSshBackupsTab from '../abas/ClienteSshBackupsTab';
import ClienteRpkiCasTab from '../abas/ClienteRpkiCasTab';
import ClienteRpkiCaPaiTab from '../abas/ClienteRpkiCaPaiTab';
import ClienteRpkiRepositoriosTab from '../abas/ClienteRpkiRepositoriosTab';
import ClienteRpkiRoasTab from '../abas/ClienteRpkiRoasTab';
import ClienteRpkiAspasTab from '../abas/ClienteRpkiAspasTab';
import { BulkAction } from '../types';
import { isClienteScrollableTab } from './clienteParcelaUtils';

interface ClienteModalTabPanelsProps {
  activeTab: string;
  formPrefix: string;
  formData: ClienteFormData;
  errors: ClienteFormErrors;
  handleInputChange: (
    field: keyof ClienteFormData,
    value: string | number | boolean
  ) => void | Promise<void>;
  isSubmitting: boolean;
  clienteId?: number | null;
  createdClienteId: number | null;
  effectiveClienteIdForParcelas?: number;
  hasModuloEquipamentos: boolean;
  hasModuloRpki: boolean;
  isLoadingContratos: boolean;
  sortedContratosData: Contrato[];
  selectedContratosItems: Contrato[];
  setSelectedContratosItems: (items: Contrato[]) => void;
  contratosBulkActions: BulkAction<Contrato>[];
  showInativosContratos: boolean;
  setShowInativosContratos: (show: boolean) => void;
  refetchContratos: () => void;
  onShowContratoCreateModal: () => void;
  onShowContratoEditModal: (contratoId: number) => void;
  isGeneratingPdf: boolean;
  onAuditContrato: (contrato: Contrato) => void;
  contratosSortColumn?: string;
  contratosSortDirection?: SortDirection;
  onContratosSort: (column: string, direction: SortDirection) => void;
  sortedData: CarneParcela[];
  isLoadingParcelas: boolean;
  selectedItems: TituloItem[];
  setSelectedItems: (items: TituloItem[]) => void;
  titulosBulkActions: BulkAction<CarneParcela>[];
  showCancelados: boolean;
  setShowCancelados: (show: boolean) => void;
  refetchParcelas: () => void;
  columns: TableColumnType<CarneParcela>[];
  onAuditTitulo: (titulo: CarneParcela) => void;
  titulosSortColumn?: string;
  titulosSortDirection?: SortDirection;
  onTitulosSort: (column: string, direction: SortDirection) => void;
  onAuditArquivo: (arquivo: { id: number }) => void;
}

function ClienteModalTabPanels({
  activeTab,
  formPrefix,
  formData,
  errors,
  handleInputChange,
  isSubmitting,
  clienteId,
  createdClienteId,
  effectiveClienteIdForParcelas,
  hasModuloEquipamentos,
  hasModuloRpki,
  isLoadingContratos,
  sortedContratosData,
  selectedContratosItems,
  setSelectedContratosItems,
  contratosBulkActions,
  showInativosContratos,
  setShowInativosContratos,
  refetchContratos,
  onShowContratoCreateModal,
  onShowContratoEditModal,
  isGeneratingPdf,
  onAuditContrato,
  contratosSortColumn,
  contratosSortDirection,
  onContratosSort,
  sortedData,
  isLoadingParcelas,
  selectedItems,
  setSelectedItems,
  titulosBulkActions,
  showCancelados,
  setShowCancelados,
  refetchParcelas,
  columns,
  onAuditTitulo,
  titulosSortColumn,
  titulosSortDirection,
  onTitulosSort,
  onAuditArquivo,
}: ClienteModalTabPanelsProps) {
  const tabContentClassName = `tab-content cliente-tab-content ${
    isClienteScrollableTab(activeTab)
      ? 'cliente-tab-content-scrollable'
      : 'cliente-tab-content-padded'
  }`;

  return (
    <div className="cliente-modal-content">
      <div className={tabContentClassName} id="clienteTabContent">
        {activeTab === 'dados-basicos' && (
          <DadosBasicosTab
            formData={formData}
            errors={errors}
            handleInputChange={handleInputChange}
            isSubmitting={isSubmitting}
            formPrefix={formPrefix}
          />
        )}

        {activeTab === 'contato' && (
          <ContatoTab
            formData={formData}
            errors={errors}
            handleInputChange={handleInputChange}
            isSubmitting={isSubmitting}
            formPrefix={formPrefix}
          />
        )}

        {activeTab === 'endereco' && (
          <EnderecoTab
            formData={formData}
            errors={errors}
            handleInputChange={handleInputChange}
            isSubmitting={isSubmitting}
            formPrefix={formPrefix}
          />
        )}

        {activeTab === 'contratos' && (
          <ContratosTab
            clienteId={clienteId || createdClienteId || undefined}
            isLoadingContratos={isLoadingContratos}
            sortedContratosData={sortedContratosData}
            selectedContratosItems={selectedContratosItems}
            setSelectedContratosItems={setSelectedContratosItems}
            contratosBulkActions={contratosBulkActions}
            showInativosContratos={showInativosContratos}
            setShowInativosContratos={setShowInativosContratos}
            onRefresh={() => refetchContratos()}
            onShowCreateModal={onShowContratoCreateModal}
            onShowEditModal={onShowContratoEditModal}
            isGeneratingPdf={isGeneratingPdf}
            onAudit={onAuditContrato}
            auditEntity="Contrato"
            sortColumn={contratosSortColumn}
            sortDirection={contratosSortDirection}
            onSort={onContratosSort}
          />
        )}

        {activeTab === 'financeiro' && (
          <FinanceiroTab
            sortedData={sortedData}
            isLoadingParcelas={isLoadingParcelas}
            selectedItems={selectedItems}
            setSelectedItems={setSelectedItems}
            bulkActions={titulosBulkActions}
            showCancelados={showCancelados}
            setShowCancelados={setShowCancelados}
            onRefresh={() => refetchParcelas()}
            isGeneratingPdf={isGeneratingPdf}
            columns={columns}
            onAudit={onAuditTitulo}
            auditEntity="Titulo"
            sortColumn={titulosSortColumn}
            sortDirection={titulosSortDirection}
            onSort={onTitulosSort}
          />
        )}

        {activeTab === 'observacoes' && (
          <ObservacoesTab
            formData={formData}
            errors={errors}
            handleInputChange={handleInputChange}
            isSubmitting={isSubmitting}
            formPrefix={formPrefix}
          />
        )}

        {activeTab === 'arquivos' && (
          <ArquivosTab
            clienteId={effectiveClienteIdForParcelas}
            onAudit={onAuditArquivo}
            auditEntity="ClienteArquivo"
          />
        )}

        {hasModuloEquipamentos && activeTab === 'tunel' && (
          <ClienteTunelTab clienteId={effectiveClienteIdForParcelas} />
        )}

        {hasModuloEquipamentos && activeTab === 'ssh-devices' && (
          <ClienteSshDevicesTab clienteId={effectiveClienteIdForParcelas} />
        )}

        {hasModuloEquipamentos && activeTab === 'ssh-backups' && (
          <ClienteSshBackupsTab clienteId={effectiveClienteIdForParcelas} />
        )}

        {hasModuloRpki && activeTab === 'rpki-cas' && (
          <ClienteRpkiCasTab clienteId={effectiveClienteIdForParcelas} />
        )}

        {hasModuloRpki && activeTab === 'rpki-cas-pai' && (
          <ClienteRpkiCaPaiTab clienteId={effectiveClienteIdForParcelas} />
        )}

        {hasModuloRpki && activeTab === 'rpki-repositorios' && (
          <ClienteRpkiRepositoriosTab clienteId={effectiveClienteIdForParcelas} />
        )}

        {hasModuloRpki && activeTab === 'rpki-roas' && (
          <ClienteRpkiRoasTab clienteId={effectiveClienteIdForParcelas} />
        )}

        {hasModuloRpki && activeTab === 'rpki-aspas' && (
          <ClienteRpkiAspasTab clienteId={effectiveClienteIdForParcelas} />
        )}
      </div>
    </div>
  );
}

export default ClienteModalTabPanels;
