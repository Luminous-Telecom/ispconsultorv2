import React from 'react';
import { useI18n } from 'contexts/I18nContext';
import { SortDirection, TableColumn as TableColumnType } from 'components/tables/types';
import { Titulo, Plano, Banco, PaginatedResponse, Cliente } from 'types';
import { TipoCobrancaContrato } from 'services/tipoCobrancaContratoService';
import { DocumentoSistema } from 'services/documentoSistemaService';
import { DiasVencimento } from 'services/diasVencimentoService';
import { TermoContrato } from 'services/termoContratoService';
import { ContratoPlanoAdicional } from 'services/contratoPlanoAdicionalService';
import ContratoTab from './abas/ContratoTab';
import EnderecoTab from './abas/EnderecoTab';
import TermosTab from './abas/TermosTab';
import FinanceiroTab from './abas/FinanceiroTab';
import FinanceiroAvulsoTab from './abas/FinanceiroAvulsoTab';
import ServicosAdicionaisTab from './abas/ServicosAdicionaisTab';
import IxcProvedorIntegracaoTab from './abas/IxcProvedorIntegracaoTab';
import type { IntegracaoIxcProvedorRow } from './useContratoIxcBulkActions';
import { BulkAction, ContratoForm } from './types';

interface ContratoModalTabPanelsProps {
  activeTab: string;
  isEditMode: boolean;
  contratoId?: number | null;
  formData: ContratoForm;
  errors: Partial<ContratoForm>;
  handleInputChange: (field: keyof ContratoForm, value: string | number | boolean | null) => void;
  planoSelecionado: Plano | null;
  bancoSelecionado: Banco | null;
  tipoCobrancaContratoSelecionado: TipoCobrancaContrato | null;
  modeloContratoSelecionado: DocumentoSistema | null;
  onPlanoSelect: (plano: Plano) => void;
  onBancoSelect: (banco: Banco) => void;
  onTipoCobrancaContratoSelect: (tipo: TipoCobrancaContrato) => void;
  onModeloContratoSelect: (modelo: DocumentoSistema) => void;
  planosData: PaginatedResponse<Plano> | Plano[] | undefined;
  bancosData: PaginatedResponse<Banco> | Banco[] | undefined;
  tiposCobrancaContrato: TipoCobrancaContrato[];
  tipoCobrancaContratoFromContrato?:
    | TipoCobrancaContrato
    | { id: number; nome: string; quantidade_titulos: number; periodicidade?: string }
    | null;
  modelosContratoData: { success: boolean; data: DocumentoSistema[]; message: string } | undefined;
  diasVencimento: DiasVencimento[];
  onShowPlanoModal: () => void;
  onShowBancoModal: () => void;
  onShowTipoCobrancaContratoModal: () => void;
  onShowModeloContratoModal: () => void;
  clienteData?: Cliente | null;
  limit: number;
  setLimit: (limit: number) => void;
  page: number;
  setPage: (page: number) => void;
  termosBulkActions: BulkAction<TermoContrato>[];
  isLoadingTermosContrato: boolean;
  sortedTermosData: TermoContrato[];
  selectedTermosItems: TermoContrato[];
  setSelectedTermosItems: React.Dispatch<React.SetStateAction<TermoContrato[]>>;
  termosColumns: TableColumnType<TermoContrato>[];
  refetchTermos: () => void;
  onAuditTermo: (termo: TermoContrato) => void;
  termosSortColumn?: string;
  termosSortDirection?: SortDirection;
  onTermosSort: (column: string, direction: SortDirection) => void;
  bulkActions: BulkAction<Titulo>[];
  bulkActionsAvulsos: BulkAction<Titulo>[];
  isLoadingTitulos: boolean;
  isLoadingTitulosAvulsos: boolean;
  sortedData: Titulo[];
  sortedAvulsosData: Titulo[];
  selectedItems: Titulo[];
  setSelectedItems: React.Dispatch<React.SetStateAction<Titulo[]>>;
  selectedAvulsosItems: Titulo[];
  setSelectedAvulsosItems: React.Dispatch<React.SetStateAction<Titulo[]>>;
  columns: TableColumnType<Titulo>[];
  columnsAvulsos: TableColumnType<Titulo>[];
  refetchTitulos: () => void;
  refetchTitulosAvulsos: () => void;
  showCancelados: boolean;
  setShowCancelados: (show: boolean) => void;
  showCanceladosAvulsos: boolean;
  setShowCanceladosAvulsos: (show: boolean) => void;
  onAuditTitulo: (titulo: Titulo) => void;
  titulosSortColumn?: string;
  titulosSortDirection?: SortDirection;
  onTitulosSort: (column: string, direction: SortDirection) => void;
  titulosAvulsosSortColumn?: string;
  titulosAvulsosSortDirection?: SortDirection;
  onTitulosAvulsosSort: (column: string, direction: SortDirection) => void;
  servicosAdicionaisBulkActions: BulkAction<ContratoPlanoAdicional>[];
  isLoadingServicosAdicionais: boolean;
  sortedServicosAdicionaisData: ContratoPlanoAdicional[];
  selectedServicosAdicionaisItems: ContratoPlanoAdicional[];
  setSelectedServicosAdicionaisItems: React.Dispatch<React.SetStateAction<ContratoPlanoAdicional[]>>;
  servicosAdicionaisColumns: TableColumnType<ContratoPlanoAdicional>[];
  refetchServicosAdicionais: () => void;
  onAuditServico: (servico: ContratoPlanoAdicional) => void;
  integracaoIxcBulkActions: BulkAction<IntegracaoIxcProvedorRow>[];
  isLoadingIntegracaoIxc: boolean;
  sortedIntegracaoIxcData: IntegracaoIxcProvedorRow[];
  selectedIntegracaoIxcItems: IntegracaoIxcProvedorRow[];
  setSelectedIntegracaoIxcItems: React.Dispatch<React.SetStateAction<IntegracaoIxcProvedorRow[]>>;
  integracaoIxcColumns: TableColumnType<IntegracaoIxcProvedorRow>[];
  refetchIntegracaoIxc: () => void;
  onAuditIntegracaoIxc: (item: IntegracaoIxcProvedorRow) => void;
  integracaoIxcSortColumn?: string;
  integracaoIxcSortDirection?: SortDirection;
  onIntegracaoIxcSort: (column: string, direction: SortDirection) => void;
  integracaoIxcTotal: number;
}

function Placeholder({ messageKey }: { messageKey: 'placeholder.contractCreationHelp' | 'placeholder.financialTitlesCreationHelp' | 'placeholder.financialMiscCreationHelp' | 'placeholder.additionalServicesCreationHelp' | 'placeholder.ixcProvedorCreationHelp' }) {
  const { t } = useI18n();
  return (
    <div className="d-flex align-items-center justify-content-center contrato-placeholder">
      <div className="text-center">
        <p className="text-muted">{t(messageKey)}</p>
      </div>
    </div>
  );
}

function ContratoModalTabPanels({
  activeTab,
  isEditMode,
  contratoId,
  formData,
  errors,
  handleInputChange,
  planoSelecionado,
  bancoSelecionado,
  tipoCobrancaContratoSelecionado,
  modeloContratoSelecionado,
  onPlanoSelect,
  onBancoSelect,
  onTipoCobrancaContratoSelect,
  onModeloContratoSelect,
  planosData,
  bancosData,
  tiposCobrancaContrato,
  tipoCobrancaContratoFromContrato,
  modelosContratoData,
  diasVencimento,
  onShowPlanoModal,
  onShowBancoModal,
  onShowTipoCobrancaContratoModal,
  onShowModeloContratoModal,
  clienteData,
  limit,
  setLimit,
  page,
  setPage,
  termosBulkActions,
  isLoadingTermosContrato,
  sortedTermosData,
  selectedTermosItems,
  setSelectedTermosItems,
  termosColumns,
  refetchTermos,
  onAuditTermo,
  termosSortColumn,
  termosSortDirection,
  onTermosSort,
  bulkActions,
  bulkActionsAvulsos,
  isLoadingTitulos,
  isLoadingTitulosAvulsos,
  sortedData,
  sortedAvulsosData,
  selectedItems,
  setSelectedItems,
  selectedAvulsosItems,
  setSelectedAvulsosItems,
  columns,
  columnsAvulsos,
  refetchTitulos,
  refetchTitulosAvulsos,
  showCancelados,
  setShowCancelados,
  showCanceladosAvulsos,
  setShowCanceladosAvulsos,
  onAuditTitulo,
  titulosSortColumn,
  titulosSortDirection,
  onTitulosSort,
  titulosAvulsosSortColumn,
  titulosAvulsosSortDirection,
  onTitulosAvulsosSort,
  servicosAdicionaisBulkActions,
  isLoadingServicosAdicionais,
  sortedServicosAdicionaisData,
  selectedServicosAdicionaisItems,
  setSelectedServicosAdicionaisItems,
  servicosAdicionaisColumns,
  refetchServicosAdicionais,
  onAuditServico,
  integracaoIxcBulkActions,
  isLoadingIntegracaoIxc,
  sortedIntegracaoIxcData,
  selectedIntegracaoIxcItems,
  setSelectedIntegracaoIxcItems,
  integracaoIxcColumns,
  refetchIntegracaoIxc,
  onAuditIntegracaoIxc,
  integracaoIxcSortColumn,
  integracaoIxcSortDirection,
  onIntegracaoIxcSort,
  integracaoIxcTotal,
}: ContratoModalTabPanelsProps) {
  if (activeTab === 'contrato') {
    return (
      <ContratoTab
        entityId={contratoId}
        formData={formData}
        errors={errors}
        handleInputChange={handleInputChange}
        planoSelecionado={planoSelecionado}
        bancoSelecionado={bancoSelecionado}
        tipoCobrancaContratoSelecionado={tipoCobrancaContratoSelecionado}
        modeloContratoSelecionado={modeloContratoSelecionado}
        onPlanoSelect={onPlanoSelect}
        onBancoSelect={onBancoSelect}
        onTipoCobrancaContratoSelect={onTipoCobrancaContratoSelect}
        onModeloContratoSelect={onModeloContratoSelect}
        planosData={planosData}
        bancosData={bancosData}
        tiposCobrancaContratoData={tiposCobrancaContrato}
        tipoCobrancaContratoFromContrato={tipoCobrancaContratoFromContrato}
        modelosContratoData={modelosContratoData}
        diasVencimento={diasVencimento}
        clienteData={clienteData}
        onShowPlanoModal={onShowPlanoModal}
        onShowBancoModal={onShowBancoModal}
        onShowTipoCobrancaContratoModal={onShowTipoCobrancaContratoModal}
        onShowModeloContratoModal={onShowModeloContratoModal}
      />
    );
  }

  if (activeTab === 'endereco') {
    return (
      <EnderecoTab
        formData={formData}
        handleInputChange={handleInputChange}
        clienteData={clienteData ?? null}
      />
    );
  }

  if (activeTab === 'termos') {
    return isEditMode ? (
      <TermosTab
        isLoading={isLoadingTermosContrato}
        bulkActions={termosBulkActions as unknown as BulkAction[]}
        limit={limit}
        setLimit={setLimit}
        page={page}
        setPage={setPage}
        sortedData={sortedTermosData}
        selectedTermosItems={selectedTermosItems}
        setSelectedTermosItems={setSelectedTermosItems}
        columns={termosColumns}
        onRefresh={refetchTermos}
        onAudit={onAuditTermo}
        auditEntity="TermoContrato"
        sortColumn={termosSortColumn}
        sortDirection={termosSortDirection}
        onSort={onTermosSort}
      />
    ) : (
      <Placeholder messageKey="placeholder.contractCreationHelp" />
    );
  }

  if (activeTab === 'financeiro') {
    return isEditMode ? (
      <FinanceiroTab
        isLoading={isLoadingTitulos}
        bulkActions={bulkActions}
        limit={limit}
        setLimit={setLimit}
        page={page}
        setPage={setPage}
        sortedData={sortedData}
        selectedItems={selectedItems}
        setSelectedItems={setSelectedItems}
        columns={columns}
        onRefresh={refetchTitulos}
        showCancelados={showCancelados}
        setShowCancelados={setShowCancelados}
        onAudit={onAuditTitulo}
        auditEntity="Titulo"
        sortColumn={titulosSortColumn}
        sortDirection={titulosSortDirection}
        onSort={onTitulosSort}
      />
    ) : (
      <Placeholder messageKey="placeholder.financialTitlesCreationHelp" />
    );
  }

  if (activeTab === 'financeiro-avulso') {
    return isEditMode ? (
      <FinanceiroAvulsoTab
        isLoading={isLoadingTitulosAvulsos}
        bulkActions={bulkActionsAvulsos}
        limit={limit}
        setLimit={setLimit}
        page={page}
        setPage={setPage}
        sortedData={sortedAvulsosData}
        selectedItems={selectedAvulsosItems}
        setSelectedItems={setSelectedAvulsosItems}
        columns={columnsAvulsos}
        onRefresh={refetchTitulosAvulsos}
        showCancelados={showCanceladosAvulsos}
        setShowCancelados={setShowCanceladosAvulsos}
        onAudit={onAuditTitulo}
        auditEntity="Titulo"
        sortColumn={titulosAvulsosSortColumn}
        sortDirection={titulosAvulsosSortDirection}
        onSort={onTitulosAvulsosSort}
      />
    ) : (
      <Placeholder messageKey="placeholder.financialMiscCreationHelp" />
    );
  }

  if (activeTab === 'servicos-adicionais') {
    return isEditMode ? (
      <ServicosAdicionaisTab
        isLoading={isLoadingServicosAdicionais}
        bulkActions={servicosAdicionaisBulkActions as unknown as BulkAction[]}
        limit={limit}
        setLimit={setLimit}
        page={page}
        setPage={setPage}
        sortedData={sortedServicosAdicionaisData}
        selectedItems={selectedServicosAdicionaisItems}
        setSelectedItems={setSelectedServicosAdicionaisItems}
        columns={servicosAdicionaisColumns}
        onRefresh={refetchServicosAdicionais}
        onAudit={onAuditServico}
        auditEntity="ContratoPlanoAdicional"
      />
    ) : (
      <Placeholder messageKey="placeholder.additionalServicesCreationHelp" />
    );
  }

  if (activeTab === 'ixc-provedor') {
    return isEditMode ? (
      <IxcProvedorIntegracaoTab
        isLoading={isLoadingIntegracaoIxc}
        bulkActions={integracaoIxcBulkActions as unknown as BulkAction[]}
        limit={limit}
        setLimit={setLimit}
        page={page}
        setPage={setPage}
        sortedData={sortedIntegracaoIxcData}
        selectedItems={selectedIntegracaoIxcItems}
        setSelectedItems={setSelectedIntegracaoIxcItems}
        columns={integracaoIxcColumns}
        onRefresh={refetchIntegracaoIxc}
        onAudit={onAuditIntegracaoIxc}
        auditEntity="IntegracaoIxcProvedor"
        sortColumn={integracaoIxcSortColumn}
        sortDirection={integracaoIxcSortDirection}
        onSort={onIntegracaoIxcSort}
        totalItems={integracaoIxcTotal}
      />
    ) : (
      <Placeholder messageKey="placeholder.ixcProvedorCreationHelp" />
    );
  }

  return null;
}

export default ContratoModalTabPanels;
