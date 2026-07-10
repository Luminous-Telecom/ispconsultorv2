import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useApiError } from 'hooks/useApiError';
import { useContratoForm } from 'hooks/useContratoForm';
import { TermoContrato } from 'services/termoContratoService';
import { Titulo, Plano } from 'types';
import { Banco } from 'types';
import { TipoCobrancaContrato } from 'services/tipoCobrancaContratoService';
import { DocumentoSistema } from 'services/documentoSistemaService';
import { ContratoPlanoAdicional } from 'services/contratoPlanoAdicionalService';
import { useImpressaoContrato } from 'hooks/useImpressaoContrato';
import { useIsMobile } from 'hooks/useMediaQuery';
import { useAuditoria } from 'hooks/useAuditoria';
import { useI18n } from 'contexts/I18nContext';
import DraggableModal from 'components/common/DraggableModal';
import { Loading } from 'components/ui';
import ContratoModalHeader from './ContratoModalHeader';
import ContratoModalSubModals from './ContratoModalSubModals';
import ContratoModalTabPanels from './ContratoModalTabPanels';
import {
  buildContratoServicosAdicionaisColumns,
  buildContratoTermosColumns,
  buildContratoTituloAvulsoColumns,
  buildContratoTituloColumns,
  buildContratoIxcColumns,
} from './contratoTableColumns';
import { useContratoFinanceiroBulkActions } from './useContratoFinanceiroBulkActions';
import { useContratoTermosBulkActions } from './useContratoTermosBulkActions';
import { useContratoServicosBulkActions } from './useContratoServicosBulkActions';
import { useContratoIxcBulkActions } from './useContratoIxcBulkActions';
import { useContratoTitulosPrint } from './useContratoTitulosPrint';
import { useContratoModalFormResources } from './useContratoModalFormResources';
import { useContratoModalTabData } from './useContratoModalTabData';
import { useTableFilters } from 'hooks/useTableFilters';
import {
  useContratoIntegracaoIxc,
  useLinkContratoIntegracaoIxc,
  useUnlinkContratoIntegracaoIxc,
} from 'hooks/useContratoIntegracaoIxc';
import {
  useTestIntegracaoIxcProvedor,
} from 'hooks/useIntegracaoIxcProvedor';
import type { ContratoIntegracaoIxcItem } from 'services/contratoIntegracaoIxcService';
import type { IntegracaoIxcProvedorRow } from './useContratoIxcBulkActions';

interface ContratoModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  contratoId?: number | null;
  clienteId?: number;
}

const ContratoModal: React.FC<ContratoModalProps> = ({
  show,
  onClose,
  onSuccess,
  contratoId = null,
  clienteId,
}) => {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const auditoria = useAuditoria();
  const { showApiError } = useApiError();
  const queryClient = useQueryClient();

  const [internalContratoId, setInternalContratoId] = useState<number | null>(contratoId);
  const [activeTab, setActiveTab] = useState('contrato');
  const [showTermoModal, setShowTermoModal] = useState(false);
  const [showSelecionarTermoModal, setShowSelecionarTermoModal] = useState(false);
  const [showEnviarAssinaturaModal, setShowEnviarAssinaturaModal] = useState(false);
  const [termoParaAssinatura, setTermoParaAssinatura] = useState<TermoContrato | null>(null);
  const [editingTermo, setEditingTermo] = useState<TermoContrato | null>(null);
  const [termoFormData, setTermoFormData] = useState({ assinado: 'NAO' as 'SIM' | 'NAO', termoCadastradoId: 0 });
  const [showTituloCreateModal, setShowTituloCreateModal] = useState(false);
  const [showTituloEditModal, setShowTituloEditModal] = useState(false);
  const [showReceberModal, setShowReceberModal] = useState(false);
  const [selectedTituloId, setSelectedTituloId] = useState<number | null>(null);
  const [selectedParcela, setSelectedParcela] = useState<Titulo | null>(null);
  const [selectedItems, setSelectedItems] = useState<Titulo[]>([]);
  const [selectedAvulsosItems, setSelectedAvulsosItems] = useState<Titulo[]>([]);
  const [selectedTermosItems, setSelectedTermosItems] = useState<TermoContrato[]>([]);
  const [selectedServicosAdicionaisItems, setSelectedServicosAdicionaisItems] = useState<ContratoPlanoAdicional[]>([]);
  const [selectedIntegracaoIxcItems, setSelectedIntegracaoIxcItems] = useState<IntegracaoIxcProvedorRow[]>([]);
  const [isGerandoFinanceiro, setIsGerandoFinanceiro] = useState(false);
  const [showPlanoModal, setShowPlanoModal] = useState(false);
  const [showBancoModal, setShowBancoModal] = useState(false);
  const [showIntegracaoIxcFormModal, setShowIntegracaoIxcFormModal] = useState(false);
  const [showIntegracaoIxcLinkModal, setShowIntegracaoIxcLinkModal] = useState(false);
  const [editingIntegracaoIxcId, setEditingIntegracaoIxcId] = useState<number | null>(null);
  const [showTipoCobrancaContratoModal, setShowTipoCobrancaContratoModal] = useState(false);
  const [showModeloContratoModal, setShowModeloContratoModal] = useState(false);
  const [showServicoAdicionalModal, setShowServicoAdicionalModal] = useState(false);
  const [editingServicoAdicional, setEditingServicoAdicional] = useState<ContratoPlanoAdicional | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [showCancelados, setShowCancelados] = useState(false);
  const [showCanceladosAvulsos, setShowCanceladosAvulsos] = useState(false);

  useEffect(() => {
    setInternalContratoId(contratoId);
  }, [contratoId]);

  useEffect(() => {
    if (!show) {
      setInternalContratoId(contratoId);
      setActiveTab('contrato');
      setShowCancelados(false);
      setShowCanceladosAvulsos(false);
      setPage(1);
      setLimit(10);
      setSelectedItems([]);
      setSelectedAvulsosItems([]);
      setSelectedTermosItems([]);
      setSelectedServicosAdicionaisItems([]);
      setSelectedIntegracaoIxcItems([]);
    }
  }, [show, contratoId]);

  const isEditMode = !!internalContratoId;

  const formHook = useContratoForm({
    contratoId: internalContratoId,
    clienteId,
    show,
    onSuccess: () => onSuccess?.(),
  });

  const formData = formHook.formData;
  const errors = formHook.errors;
  const contratoData = formHook.contrato;
  const isLoading = formHook.isLoadingContrato;
  const handleInputChange = formHook.handleInputChange;
  const handleSubmit = formHook.handleSubmit;

  const formResources = useContratoModalFormResources({ show, formData, contratoData });

  const integracaoIxcTableFilters = useTableFilters({
    initialPage: 1,
    initialLimit: 10,
    initialSortColumn: 'nome',
    initialSortDirection: 'asc',
    resetPageOnFilterChange: false,
  });

  const {
    data: contratoIntegracaoIxc,
    isLoading: isLoadingIntegracaoIxc,
    refetch: refetchIntegracaoIxc,
  } = useContratoIntegracaoIxc(isEditMode ? internalContratoId : null);
  const linkIxcMutation = useLinkContratoIntegracaoIxc(isEditMode ? internalContratoId : null);
  const unlinkIxcMutation = useUnlinkContratoIntegracaoIxc(isEditMode ? internalContratoId : null);
  const testIntegracaoIxcMutation = useTestIntegracaoIxcProvedor();

  const allIntegracaoIxcData = useMemo((): IntegracaoIxcProvedorRow[] => {
    const integracoes: ContratoIntegracaoIxcItem[] = contratoIntegracaoIxc?.integracoes ?? [];
    return integracoes.map((integracao) => ({
      id: integracao.id,
      nome: integracao.nome ?? '',
      api_url: integracao.api_url,
      ativo: !!integracao.ativo,
      has_api_token: integracao.has_api_token,
    }));
  }, [contratoIntegracaoIxc?.integracoes]);

  const sortedIntegracaoIxcData = useMemo((): IntegracaoIxcProvedorRow[] => {
    const sortColumn = integracaoIxcTableFilters.sortColumn || 'nome';
    const sortDirection = integracaoIxcTableFilters.sortDirection || 'asc';
    const sorted = [...allIntegracaoIxcData].sort((a, b) => {
      const aValue = String(a[sortColumn as keyof IntegracaoIxcProvedorRow] ?? '');
      const bValue = String(b[sortColumn as keyof IntegracaoIxcProvedorRow] ?? '');
      const comparison = aValue.localeCompare(bValue, 'pt-BR', { numeric: true });
      return sortDirection === 'desc' ? -comparison : comparison;
    });
    const offset = (page - 1) * limit;
    return sorted.slice(offset, offset + limit);
  }, [
    allIntegracaoIxcData,
    integracaoIxcTableFilters.sortColumn,
    integracaoIxcTableFilters.sortDirection,
    page,
    limit,
  ]);

  const handleIntegracaoIxcLink = useCallback(
    async (integracaoId: number) => {
      if (internalContratoId) {
        await linkIxcMutation.mutateAsync(integracaoId);
      }
      refetchIntegracaoIxc();
    },
    [internalContratoId, linkIxcMutation, refetchIntegracaoIxc]
  );

  const handleIntegracaoIxcFormSuccess = useCallback(() => {
    refetchIntegracaoIxc();
  }, [refetchIntegracaoIxc]);

  const tabData = useContratoModalTabData({
    show,
    isEditMode,
    internalContratoId,
    clienteId,
    contratoClienteId: contratoData?.cliente_id,
    selectedItems,
    setSelectedItems,
    selectedAvulsosItems,
    setSelectedAvulsosItems,
    showCancelados,
    showCanceladosAvulsos,
  });

  const impressaoHook = useImpressaoContrato({ clienteId: contratoData?.cliente_id || undefined });
  const titulosPrint = useContratoTitulosPrint();

  const handleTabChange = useCallback((newTab: string) => {
    setActiveTab(newTab);
    setSelectedItems([]);
    setSelectedAvulsosItems([]);
    setSelectedTermosItems([]);
    setSelectedServicosAdicionaisItems([]);
    setSelectedIntegracaoIxcItems([]);
  }, []);

  const handlePlanoSelect = useCallback(
    (plano: Plano) => {
      formResources.setPlanoSelecionado(plano);
      handleInputChange('plano_id', plano.id);
      setShowPlanoModal(false);
    },
    [formResources, handleInputChange]
  );

  const handleBancoSelect = useCallback(
    (banco: Banco) => {
      formResources.setBancoSelecionado(banco);
      handleInputChange('conta_boleto', banco.id);
      setShowBancoModal(false);
    },
    [formResources, handleInputChange]
  );

  const handleTipoCobrancaContratoSelect = useCallback(
    (tipo: TipoCobrancaContrato) => {
      formResources.setTipoCobrancaContratoSelecionado(tipo);
      handleInputChange('tipo_cobranca_contrato_id', tipo.id);
      setShowTipoCobrancaContratoModal(false);
    },
    [formResources, handleInputChange]
  );

  const handleModeloContratoSelect = useCallback(
    (modelo: DocumentoSistema) => {
      formResources.setModeloContratoSelecionado(modelo);
      handleInputChange('modelo_documento_id', modelo.id);
      setShowModeloContratoModal(false);
    },
    [formResources, handleInputChange]
  );

  const handleImprimirContrato = useCallback(async () => {
    if (!contratoData?.cliente_id) {
      showApiError(t('messages.clientNotFound'));
      return;
    }
    await impressaoHook.imprimirContrato(internalContratoId || undefined, contratoData.cliente_id);
  }, [contratoData?.cliente_id, impressaoHook, internalContratoId, showApiError, t]);

  const handleImprimirSelecionados = useCallback(
    (items?: Titulo[]) =>
      titulosPrint.handleImprimirSelecionados(items?.length ? items : selectedItems),
    [selectedItems, titulosPrint]
  );
  const handleImprimirTodosEmAberto = useCallback(
    () => titulosPrint.handleImprimirTodosEmAberto(tabData.titulosData?.data),
    [tabData.titulosData?.data, titulosPrint]
  );
  const handleImprimirSelecionadosAvulsos = useCallback(
    (items?: Titulo[]) =>
      titulosPrint.handleImprimirSelecionados(items?.length ? items : selectedAvulsosItems),
    [selectedAvulsosItems, titulosPrint]
  );
  const handleImprimirTodosEmAbertoAvulsos = useCallback(
    () => titulosPrint.handleImprimirTodosEmAberto(tabData.titulosAvulsosData?.data),
    [tabData.titulosAvulsosData?.data, titulosPrint]
  );

  const { bulkActions, bulkActionsAvulsos } = useContratoFinanceiroBulkActions({
    isEditMode,
    internalContratoId,
    isGerandoFinanceiro,
    setIsGerandoFinanceiro,
    queryClient,
    refetchTitulos: tabData.refetchTitulos,
    refetchTitulosAvulsos: tabData.refetchTitulosAvulsos,
    setSelectedItems,
    setSelectedAvulsosItems,
    setSelectedTituloId: (id) => setSelectedTituloId(id),
    setShowTituloEditModal,
    setSelectedParcela,
    setShowReceberModal,
    setShowTituloCreateModal,
    handleImprimirSelecionados,
    handleImprimirTodosEmAberto,
    handleImprimirSelecionadosAvulsos,
    handleImprimirTodosEmAbertoAvulsos,
  });

  const { termosBulkActions } = useContratoTermosBulkActions({
    isEditMode,
    internalContratoId,
    selectedTermosItems,
    setEditingTermo,
    setTermoFormData,
    setShowTermoModal,
    setTermoParaAssinatura,
    setShowEnviarAssinaturaModal,
    deleteTermoMutation: tabData.deleteTermoMutation,
    queryClient,
    setShowPreview: titulosPrint.setShowPreview,
    setIsGeneratingPdfLocal: titulosPrint.setIsGeneratingPdfLocal,
    pdfUrlLocal: titulosPrint.pdfUrlLocal,
    setPdfUrlLocal: titulosPrint.setPdfUrlLocal,
  });

  const { servicosAdicionaisBulkActions } = useContratoServicosBulkActions({
    isEditMode,
    internalContratoId,
    setEditingServicoAdicional,
    setShowServicoAdicionalModal,
    deleteServicoAdicionalMutation: tabData.deleteServicoAdicionalMutation,
    queryClient,
  });

  const { integracaoIxcBulkActions } = useContratoIxcBulkActions({
    isEditMode,
    selectedIntegracaoIxcItems,
    setSelectedIntegracaoIxcItems,
    setEditingIntegracaoIxcId,
    setShowIntegracaoIxcFormModal,
    setShowIntegracaoIxcLinkModal,
    testIntegracaoMutation: testIntegracaoIxcMutation,
    unlinkIxcMutation,
  });

  const columns = useMemo(() => buildContratoTituloColumns(t), [t]);
  const columnsAvulsos = useMemo(() => buildContratoTituloAvulsoColumns(t), [t]);
  const termosColumns = useMemo(() => buildContratoTermosColumns(t), [t]);
  const servicosAdicionaisColumns = useMemo(() => buildContratoServicosAdicionaisColumns(t), [t]);
  const integracaoIxcColumns = useMemo(() => buildContratoIxcColumns(t), [t]);

  useEffect(() => {
    if (!isEditMode && formHook.createdContratoId && formHook.createdContratoId !== internalContratoId) {
      setInternalContratoId(formHook.createdContratoId);
    }
  }, [formHook.createdContratoId, isEditMode, internalContratoId]);

  const isContratoFormTab = activeTab === 'contrato' || activeTab === 'endereco';

  const isScrollableTab =
    activeTab === 'termos' ||
    activeTab === 'financeiro' ||
    activeTab === 'financeiro-avulso' ||
    activeTab === 'servicos-adicionais' ||
    activeTab === 'ixc-provedor';

  const tabContentClass = isScrollableTab
    ? 'contrato-tab-content-scrollable'
    : 'contrato-tab-content-padded';

  const tabPanels = (
    <ContratoModalTabPanels
      activeTab={activeTab}
      isEditMode={isEditMode}
      contratoId={internalContratoId}
      formData={formData}
      errors={errors}
      handleInputChange={handleInputChange}
      planoSelecionado={formResources.planoSelecionado}
      bancoSelecionado={formResources.bancoSelecionado}
      tipoCobrancaContratoSelecionado={formResources.tipoCobrancaContratoSelecionado}
      modeloContratoSelecionado={formResources.modeloContratoSelecionado}
      onPlanoSelect={handlePlanoSelect}
      onBancoSelect={handleBancoSelect}
      onTipoCobrancaContratoSelect={handleTipoCobrancaContratoSelect}
      onModeloContratoSelect={handleModeloContratoSelect}
      planosData={formResources.planosData}
      bancosData={formResources.bancosData}
      tiposCobrancaContrato={formResources.tiposCobrancaContrato}
      tipoCobrancaContratoFromContrato={contratoData?.tipoCobrancaContrato ?? undefined}
      modelosContratoData={formResources.modelosContratoData}
      diasVencimento={formResources.diasVencimento}
      onShowPlanoModal={() => setShowPlanoModal(true)}
      onShowBancoModal={() => setShowBancoModal(true)}
      onShowTipoCobrancaContratoModal={() => setShowTipoCobrancaContratoModal(true)}
      onShowModeloContratoModal={() => setShowModeloContratoModal(true)}
      clienteData={tabData.clienteData ?? null}
      limit={limit}
      setLimit={setLimit}
      page={page}
      setPage={setPage}
      termosBulkActions={termosBulkActions}
      isLoadingTermosContrato={tabData.isLoadingTermosContrato}
      sortedTermosData={tabData.sortedTermosData}
      selectedTermosItems={selectedTermosItems}
      setSelectedTermosItems={setSelectedTermosItems}
      termosColumns={termosColumns}
      refetchTermos={tabData.refetchTermos}
      onAuditTermo={(termo) => auditoria.handleAudit('TermoContrato', termo.id)}
      termosSortColumn={tabData.termosTableFilters.sortColumn}
      termosSortDirection={tabData.termosTableFilters.sortDirection}
      onTermosSort={tabData.termosTableFilters.setSort}
      bulkActions={bulkActions}
      bulkActionsAvulsos={bulkActionsAvulsos}
      isLoadingTitulos={tabData.isLoadingTitulos}
      isLoadingTitulosAvulsos={tabData.isLoadingTitulosAvulsos}
      sortedData={tabData.sortedData}
      sortedAvulsosData={tabData.sortedAvulsosData}
      selectedItems={selectedItems}
      setSelectedItems={setSelectedItems}
      selectedAvulsosItems={selectedAvulsosItems}
      setSelectedAvulsosItems={setSelectedAvulsosItems}
      columns={columns}
      columnsAvulsos={columnsAvulsos}
      refetchTitulos={tabData.refetchTitulos}
      refetchTitulosAvulsos={tabData.refetchTitulosAvulsos}
      showCancelados={showCancelados}
      setShowCancelados={setShowCancelados}
      showCanceladosAvulsos={showCanceladosAvulsos}
      setShowCanceladosAvulsos={setShowCanceladosAvulsos}
      onAuditTitulo={(titulo) => auditoria.handleAudit('Titulo', titulo.id)}
      titulosSortColumn={tabData.titulosTableFilters.sortColumn}
      titulosSortDirection={tabData.titulosTableFilters.sortDirection}
      onTitulosSort={tabData.titulosTableFilters.setSort}
      titulosAvulsosSortColumn={tabData.titulosAvulsosTableFilters.sortColumn}
      titulosAvulsosSortDirection={tabData.titulosAvulsosTableFilters.sortDirection}
      onTitulosAvulsosSort={tabData.titulosAvulsosTableFilters.setSort}
      servicosAdicionaisBulkActions={servicosAdicionaisBulkActions}
      isLoadingServicosAdicionais={tabData.isLoadingServicosAdicionais}
      sortedServicosAdicionaisData={tabData.sortedServicosAdicionaisData}
      selectedServicosAdicionaisItems={selectedServicosAdicionaisItems}
      setSelectedServicosAdicionaisItems={setSelectedServicosAdicionaisItems}
      servicosAdicionaisColumns={servicosAdicionaisColumns}
      refetchServicosAdicionais={tabData.refetchServicosAdicionais}
      onAuditServico={(servico) => auditoria.handleAudit('ContratoPlanoAdicional', servico.id)}
      integracaoIxcBulkActions={integracaoIxcBulkActions}
      isLoadingIntegracaoIxc={isLoadingIntegracaoIxc}
      sortedIntegracaoIxcData={sortedIntegracaoIxcData}
      selectedIntegracaoIxcItems={selectedIntegracaoIxcItems}
      setSelectedIntegracaoIxcItems={setSelectedIntegracaoIxcItems}
      integracaoIxcColumns={integracaoIxcColumns}
      refetchIntegracaoIxc={refetchIntegracaoIxc}
      onAuditIntegracaoIxc={(item) => auditoria.handleAudit('IntegracaoIxcProvedor', item.id)}
      integracaoIxcSortColumn={integracaoIxcTableFilters.sortColumn}
      integracaoIxcSortDirection={integracaoIxcTableFilters.sortDirection}
      onIntegracaoIxcSort={integracaoIxcTableFilters.setSort}
      integracaoIxcTotal={allIntegracaoIxcData.length}
    />
  );

  if (isEditMode && isLoading) {
    return (
      <DraggableModal
        show={show}
        onClose={onClose}
        title={t('messages.loading')}
        size="lg"
        modalId="contrato-modal-loading"
      >
        <Loading variant="modal" showMessage={false} />
      </DraggableModal>
    );
  }

  return (
    <>
      <DraggableModal
        show={show}
        onClose={onClose}
        title={isEditMode ? t('modal.editContract') : t('modal.createContract')}
        size="xl"
        modalId="contrato-modal"
        headerActions={
          <ContratoModalHeader
            isEditMode={isEditMode}
            isMobile={isMobile}
            activeTab={activeTab}
            isSubmitting={formHook.isSubmitting}
            formId="contrato-form"
            onClose={onClose}
            onPrintContract={handleImprimirContrato}
            onTabChange={handleTabChange}
          />
        }
      >
        <div className="contrato-modal-content">
          {isContratoFormTab ? (
            <form id="contrato-form" onSubmit={handleSubmit} className="form-modal-simple">
              <div className={`tab-content contrato-tab-content ${tabContentClass}`}>
                {tabPanels}
              </div>
            </form>
          ) : (
            <div className={`tab-content contrato-tab-content ${tabContentClass}`}>
              {tabPanels}
            </div>
          )}
        </div>
      </DraggableModal>

      <ContratoModalSubModals
        isEditMode={isEditMode}
        internalContratoId={internalContratoId}
        contratoData={contratoData}
        showTituloCreateModal={showTituloCreateModal}
        setShowTituloCreateModal={setShowTituloCreateModal}
        showTituloEditModal={showTituloEditModal}
        setShowTituloEditModal={setShowTituloEditModal}
        selectedTituloId={selectedTituloId}
        setSelectedTituloId={setSelectedTituloId}
        showReceberModal={showReceberModal}
        setShowReceberModal={setShowReceberModal}
        selectedParcela={selectedParcela}
        setSelectedParcela={setSelectedParcela}
        showTermoModal={showTermoModal}
        setShowTermoModal={setShowTermoModal}
        showSelecionarTermoModal={showSelecionarTermoModal}
        setShowSelecionarTermoModal={setShowSelecionarTermoModal}
        showEnviarAssinaturaModal={showEnviarAssinaturaModal}
        setShowEnviarAssinaturaModal={setShowEnviarAssinaturaModal}
        showServicoAdicionalModal={showServicoAdicionalModal}
        setShowServicoAdicionalModal={setShowServicoAdicionalModal}
        editingTermo={editingTermo}
        setEditingTermo={setEditingTermo}
        termoFormData={termoFormData}
        setTermoFormData={setTermoFormData}
        termoParaAssinatura={termoParaAssinatura}
        setTermoParaAssinatura={setTermoParaAssinatura}
        editingServicoAdicional={editingServicoAdicional}
        setEditingServicoAdicional={setEditingServicoAdicional}
        showPlanoModal={showPlanoModal}
        setShowPlanoModal={setShowPlanoModal}
        showBancoModal={showBancoModal}
        setShowBancoModal={setShowBancoModal}
        showTipoCobrancaContratoModal={showTipoCobrancaContratoModal}
        setShowTipoCobrancaContratoModal={setShowTipoCobrancaContratoModal}
        showModeloContratoModal={showModeloContratoModal}
        setShowModeloContratoModal={setShowModeloContratoModal}
        showIntegracaoIxcFormModal={showIntegracaoIxcFormModal}
        setShowIntegracaoIxcFormModal={setShowIntegracaoIxcFormModal}
        showIntegracaoIxcLinkModal={showIntegracaoIxcLinkModal}
        setShowIntegracaoIxcLinkModal={setShowIntegracaoIxcLinkModal}
        editingIntegracaoIxcId={editingIntegracaoIxcId}
        setEditingIntegracaoIxcId={setEditingIntegracaoIxcId}
        onIntegracaoIxcFormSuccess={handleIntegracaoIxcFormSuccess}
        onIntegracaoIxcLink={handleIntegracaoIxcLink}
        onPlanoSelect={handlePlanoSelect}
        onBancoSelect={handleBancoSelect}
        onTipoCobrancaContratoSelect={handleTipoCobrancaContratoSelect}
        onModeloContratoSelect={handleModeloContratoSelect}
        impressaoShowModal={impressaoHook.showModal}
        impressaoPdfUrl={impressaoHook.pdfUrl}
        impressaoIsGenerating={impressaoHook.isGeneratingPdf}
        onCloseImpressaoContrato={() => impressaoHook.limparPdfUrl()}
        showPreview={titulosPrint.showPreview}
        pdfUrlLocal={titulosPrint.pdfUrlLocal}
        isGeneratingPdfLocal={titulosPrint.isGeneratingPdfLocal}
        onClosePreview={titulosPrint.closePreview}
        auditoriaShowPreview={auditoria.showPreview}
        auditoriaPdfUrl={auditoria.pdfUrl}
        auditoriaIsGenerating={auditoria.isGeneratingPdf}
        onCloseAuditoriaPreview={auditoria.handleClosePreview}
        refetchTitulos={tabData.refetchTitulos}
        refetchTitulosAvulsos={tabData.refetchTitulosAvulsos}
        refetchTermos={tabData.refetchTermos}
        refetchServicosAdicionais={tabData.refetchServicosAdicionais}
      />
    </>
  );
};

export default ContratoModal;
