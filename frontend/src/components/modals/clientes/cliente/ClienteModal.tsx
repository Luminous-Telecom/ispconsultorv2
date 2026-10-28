import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFormPrefix } from 'hooks/useFormId';
import { useClienteForm } from 'hooks/useClienteForm';
import { useClienteContratos } from 'hooks/useClienteContratos';
import { useClienteImpressao } from 'hooks/useClienteImpressao';
import { useClienteBulkActions } from 'hooks/useClienteBulkActions';
import { useIsMobile } from 'hooks/useMediaQuery';
import { useAuditoria } from 'hooks/useAuditoria';
import { usePlanoModulos } from 'hooks/usePlanoModulos';
import { useI18n } from 'contexts/I18nContext';
import { TituloItem } from 'types/cliente';
import DraggableModal from 'components/common/DraggableModal';
import ClienteModalHeader from './clienteModal/ClienteModalHeader';
import ClienteModalTabPanels from './clienteModal/ClienteModalTabPanels';
import ClienteModalSubModals from './clienteModal/ClienteModalSubModals';
import ClienteModalLoadingState from './clienteModal/ClienteModalLoadingState';
import { buildClienteTituloColumns } from './clienteModal/clienteTituloColumns';
import { useClienteModalTabData } from './clienteModal/useClienteModalTabData';
import {
  useClienteModalActiveTab,
  useClienteModalNestedModals,
} from './clienteModal/useClienteModalState';
import {
  useClienteModalTabs,
  shouldRenderClienteHeader,
} from './clienteModal/useClienteModalTabs';
import { ClienteModalProps } from './clienteModal/types';
import { authService } from 'services/authService';
import { canSeeFinanceAreas, canSeeModal } from 'constants/userRoles';
import { withInvalidTabs } from 'utils/tabValidation';

const ClienteModal = ({
  show,
  onClose,
  clienteId = null,
  onSuccess,
}: ClienteModalProps) => {
  const { t } = useI18n();
  const { hasModulo } = usePlanoModulos();
  const formPrefix = useFormPrefix('ClienteEditModal');
  const isMobile = useIsMobile();
  const { data: currentUser } = useQuery({
    queryKey: ['auth-me-profile'],
    queryFn: async () => {
      const res = await authService.getCurrentUser();
      if (!res.success || !res.data) return null;
      return res.data;
    },
    staleTime: 0,
  });
  const hasModuloEquipamentos = hasModulo('equipamentos') && canSeeModal(currentUser?.role, 'ssh-devices');
  const hasModuloRpki = hasModulo('rpki') && canSeeModal(currentUser?.role, 'rpki-cas');
  const showFinanceTabs = canSeeFinanceAreas(currentUser?.role);

  const [showCancelados, setShowCancelados] = useState(false);

  const { activeTab, setActiveTab } = useClienteModalActiveTab(
    show,
    hasModuloEquipamentos,
    hasModuloRpki,
    showFinanceTabs
  );

  const nestedModals = useClienteModalNestedModals();

  const formHook = useClienteForm({
    clienteId,
    show,
    onSuccess,
  });

  const tabData = useClienteModalTabData({
    clienteId,
    createdClienteId: formHook.createdClienteId,
    showCancelados,
    showFinanceTabs,
  });

  const contratosHook = useClienteContratos({
    clienteId,
    createdClienteId: formHook.createdClienteId,
    sortColumn: tabData.contratosTableFilters.sortColumn,
    sortDirection: tabData.contratosTableFilters.sortDirection as 'asc' | 'desc' | undefined,
  });

  const impressaoHook = useClienteImpressao({
    clienteId,
    parcelasData: tabData.parcelasData,
  });

  const auditoria = useAuditoria();

  const handleImprimirTitulosSelecionadosWrapper = useCallback(
    async (selectedItems: TituloItem[]) => {
      await impressaoHook.handleImprimirTitulosSelecionados(selectedItems);
    },
    [impressaoHook]
  );

  const bulkActionsHook = useClienteBulkActions({
    clienteId,
    createdClienteId: formHook.createdClienteId,
    parcelasData: tabData.parcelasData,
    contratosData: contratosHook.contratosData,
    onRefreshParcelas: async () => {
      await tabData.refetchParcelas();
    },
    onRefreshContratos: async () => {
      await contratosHook.refetchContratos();
    },
    onShowTituloEditModal: nestedModals.openTituloEditModal,
    onShowReceberModal: nestedModals.openReceberModal,
    onShowContratoCreateModal: () => nestedModals.setShowContratoCreateModal(true),
    onShowContratoEditModal: nestedModals.openContratoEditModal,
    onShowImprimirModal: () => {
      impressaoHook.setShowImprimirModal(true);
    },
    handleImprimirTitulosSelecionados: handleImprimirTitulosSelecionadosWrapper,
    handleImprimirTodosEmAberto: impressaoHook.handleImprimirTodosEmAberto,
    handleImprimirContrato: impressaoHook.handleImprimirContrato,
    handleImprimirTermoAdesao: impressaoHook.handleImprimirTermoAdesao,
    handleImprimirContratoPermanencia: impressaoHook.handleImprimirContratoPermanencia,
    handleImprimirRecibos: impressaoHook.handleImprimirRecibos,
    onShowGerarNFeModal: nestedModals.openGerarNFeModal,
    handleImprimirNF: impressaoHook.handleImprimirNF,
  });

  const canEditContratosFinanceiro = useMemo(() => {
    return formHook.isEditing || !!formHook.createdClienteId;
  }, [formHook.isEditing, formHook.createdClienteId]);

  const columns = useMemo(() => buildClienteTituloColumns(t), [t]);

  const clienteTabsBase = useClienteModalTabs({
    canEditContratosFinanceiro,
    hasModuloEquipamentos,
    hasModuloRpki,
    showFinanceTabs,
  });
  const clienteTabs = useMemo(
    () => withInvalidTabs(clienteTabsBase, formHook.errors, {
      'dados-basicos': ['cnpj', 'razao_social', 'nome_fantasia', 'ativo', 'tipo_cobranca', 'valor_primeiro_titulo'],
      contato: ['email', 'telefone', 'whatsapp', 'central_assinante_senha', 'recebe_email', 'recebe_whatsapp'],
      endereco: ['cep', 'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'estado'],
      observacoes: ['observacoes'],
    }),
    [clienteTabsBase, formHook.errors]
  );

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const modalTitle = formHook.isEditing ? t('modal.editClient') : t('modal.createClient');

  const headerActionsContent = useMemo(() => {
    if (
      !shouldRenderClienteHeader(
        formHook.isLoadingCliente,
        formHook.isEditing,
        formHook.cliente
      )
    ) {
      return undefined;
    }

    return (
      <ClienteModalHeader
        isMobile={isMobile}
        activeTab={activeTab}
        isSubmitting={formHook.isSubmitting}
        clienteTabs={clienteTabs}
        onClose={handleClose}
        onSave={() => formHook.handleSubmit()}
        onTabChange={setActiveTab}
      />
    );
  }, [formHook, clienteTabs, activeTab, isMobile, handleClose, setActiveTab]);

  const handleTituloEditClose = useCallback(() => {
    nestedModals.closeTituloEditModal();
    tabData.refetchParcelas();
  }, [nestedModals, tabData]);

  return (
    <>
      <DraggableModal
        show={show}
        onClose={handleClose}
        title={modalTitle}
        size="xl"
        modalId={formHook.isEditing ? 'cliente-edit-modal' : 'cliente-create-modal'}
        headerActions={headerActionsContent}
      >
        <ClienteModalLoadingState
          isLoadingCliente={formHook.isLoadingCliente}
          isEditing={formHook.isEditing}
          cliente={formHook.cliente}
        >
          <ClienteModalTabPanels
            activeTab={activeTab}
            formPrefix={formPrefix}
            formData={formHook.formData}
            errors={formHook.errors}
            handleInputChange={formHook.handleInputChange}
            isSubmitting={formHook.isSubmitting}
            clienteId={clienteId}
            createdClienteId={formHook.createdClienteId}
            effectiveClienteIdForParcelas={tabData.effectiveClienteIdForParcelas}
            hasModuloEquipamentos={hasModuloEquipamentos}
            hasModuloRpki={hasModuloRpki}
            isLoadingContratos={contratosHook.isLoadingContratos}
            sortedContratosData={contratosHook.sortedContratosData}
            selectedContratosItems={bulkActionsHook.selectedContratosItems}
            setSelectedContratosItems={bulkActionsHook.setSelectedContratosItems}
            contratosBulkActions={bulkActionsHook.contratosBulkActions}
            showInativosContratos={contratosHook.showInativosContratos}
            setShowInativosContratos={contratosHook.setShowInativosContratos}
            refetchContratos={contratosHook.refetchContratos}
            onShowContratoCreateModal={() => nestedModals.setShowContratoCreateModal(true)}
            onShowContratoEditModal={nestedModals.openContratoEditModal}
            isGeneratingPdf={impressaoHook.isGeneratingPdf}
            onAuditContrato={(contrato) => auditoria.handleAudit('Contrato', contrato.id)}
            contratosSortColumn={tabData.contratosTableFilters.sortColumn}
            contratosSortDirection={tabData.contratosTableFilters.sortDirection}
            onContratosSort={tabData.contratosTableFilters.setSort}
            sortedData={tabData.sortedData}
            isLoadingParcelas={tabData.isLoadingParcelas}
            selectedItems={bulkActionsHook.selectedItems}
            setSelectedItems={bulkActionsHook.setSelectedItems}
            titulosBulkActions={bulkActionsHook.titulosBulkActions}
            showCancelados={showCancelados}
            setShowCancelados={setShowCancelados}
            refetchParcelas={tabData.refetchParcelas}
            columns={columns}
            onAuditTitulo={(titulo) => auditoria.handleAudit('Titulo', titulo.id)}
            titulosSortColumn={tabData.titulosTableFilters.sortColumn}
            titulosSortDirection={tabData.titulosTableFilters.sortDirection}
            onTitulosSort={tabData.titulosTableFilters.setSort}
            onAuditArquivo={(arquivo) => auditoria.handleAudit('ClienteArquivo', arquivo.id)}
          />
        </ClienteModalLoadingState>
      </DraggableModal>

      <ClienteModalSubModals
        showTituloEditModal={nestedModals.showTituloEditModal}
        selectedTituloId={nestedModals.selectedTituloId}
        onCloseTituloEditModal={handleTituloEditClose}
        onTituloEditSuccess={() => tabData.refetchParcelas()}
        showReceberModal={nestedModals.showReceberModal}
        selectedParcela={nestedModals.selectedParcela}
        onCloseReceberModal={nestedModals.closeReceberModal}
        onReceberSuccess={() => tabData.refetchParcelas()}
        showContratoCreateModal={nestedModals.showContratoCreateModal}
        showContratoEditModal={nestedModals.showContratoEditModal}
        selectedContratoId={nestedModals.selectedContratoId}
        contratoClienteId={formHook.cliente?.id || formHook.createdClienteId || undefined}
        onCloseContratoModal={nestedModals.closeContratoModal}
        showImprimirModal={impressaoHook.showImprimirModal}
        onCloseImprimirModal={impressaoHook.handleCloseImprimirModal}
        pdfUrl={impressaoHook.pdfUrl}
        isGeneratingPdf={impressaoHook.isGeneratingPdf}
        showAuditoriaPreview={auditoria.showPreview}
        onCloseAuditoriaPreview={auditoria.handleClosePreview}
        auditoriaPdfUrl={auditoria.pdfUrl}
        auditoriaIsGenerating={auditoria.isGeneratingPdf}
        showGerarNFeModal={nestedModals.showGerarNFeModal}
        onCloseGerarNFeModal={nestedModals.closeGerarNFeModal}
        cliente={formHook.cliente || undefined}
        selectedTituloForNFe={nestedModals.selectedTituloForNFe}
        onGerarNFeSuccess={() => tabData.refetchParcelas()}
      />
    </>
  );
};

export default ClienteModal;
