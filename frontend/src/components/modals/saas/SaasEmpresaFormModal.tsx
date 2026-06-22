import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useIsMobile } from 'hooks/useMediaQuery';
import { useAuditoria } from 'hooks/useAuditoria';
import DraggableModal from 'components/common/DraggableModal';
import type { SaasTitulo } from 'services/saas/saasCrudService';
import type { SaasEmpresaFormModalProps, SaasEmpresaTabId } from './saasEmpresaForm/types';
import { useSaasEmpresaFormData } from './saasEmpresaForm/hooks/useSaasEmpresaFormData';
import { useSaasEmpresaMutations } from './saasEmpresaForm/hooks/useSaasEmpresaMutations';
import { useSaasEmpresaTabData } from './saasEmpresaForm/hooks/useSaasEmpresaTabData';
import { useSaasEmpresaContratosActions } from './saasEmpresaForm/hooks/useSaasEmpresaContratosActions';
import { useSaasEmpresaUsuariosActions } from './saasEmpresaForm/hooks/useSaasEmpresaUsuariosActions';
import { useSaasEmpresaFinanceiroActions } from './saasEmpresaForm/hooks/useSaasEmpresaFinanceiroActions';
import { useSaasEmpresaLogsState } from './saasEmpresaForm/hooks/useSaasEmpresaLogsState';
import SaasEmpresaFormHeader from './saasEmpresaForm/SaasEmpresaFormHeader';
import SaasEmpresaFormContent from './saasEmpresaForm/SaasEmpresaFormContent';
import SaasEmpresaFormSubModals from './saasEmpresaForm/SaasEmpresaFormSubModals';

const SaasEmpresaFormModal: React.FC<SaasEmpresaFormModalProps> = ({ show, onClose, onSuccess, itemId }) => {
  const isMobile = useIsMobile();
  const auditoria = useAuditoria();

  const [activeTab, setActiveTab] = useState<SaasEmpresaTabId>('dados-basicos');
  const [showContratoCreate, setShowContratoCreate] = useState(false);
  const [showContratoEdit, setShowContratoEdit] = useState(false);
  const [selectedContratoId, setSelectedContratoId] = useState<number | null>(null);
  const [showUsuarioCreate, setShowUsuarioCreate] = useState(false);
  const [showUsuarioEdit, setShowUsuarioEdit] = useState(false);
  const [selectedUsuarioId, setSelectedUsuarioId] = useState<number | null>(null);
  const [showTituloCreate, setShowTituloCreate] = useState(false);
  const [showInativosContratos, setShowInativosContratos] = useState(false);
  const [showCanceladosTitulos, setShowCanceladosTitulos] = useState(false);
  const [showReceberModal, setShowReceberModal] = useState(false);
  const [tituloReceber, setTituloReceber] = useState<SaasTitulo | null>(null);

  const formData = useSaasEmpresaFormData({ show, itemId });
  const {
    form,
    errors,
    setErrors,
    setInternalCreatedId,
    isEditing,
    empresaId,
    parametros,
    formDataForAddress,
    handleInputChange,
    handleFieldChange,
    t,
  } = formData;

  const { handleSubmit, isPending } = useSaasEmpresaMutations({
    effectiveId: formData.effectiveId,
    isEditing,
    onSuccess,
    setInternalCreatedId,
    setErrors,
    t,
  });

  const tabData = useSaasEmpresaTabData({
    empresaId,
    activeTab,
    showInativosContratos,
    showCanceladosTitulos,
  });

  const financeiroActions = useSaasEmpresaFinanceiroActions({
    empresaId,
    titulosParaFiltro: tabData.titulosParaFiltro,
    refetchTitulos: tabData.refetchTitulos,
    setShowTituloCreate,
    setShowReceberModal,
    setTituloReceber,
    t,
  });

  const contratosActions = useSaasEmpresaContratosActions({
    empresaId,
    statusEmpresa: tabData.statusEmpresa,
    refetchContratos: tabData.refetchContratos,
    setShowContratoCreate,
    setShowContratoEdit,
    setSelectedContratoId,
    t,
  });

  const usuariosActions = useSaasEmpresaUsuariosActions({
    refetchUsuarios: tabData.refetchUsuarios,
    setShowUsuarioCreate,
    setShowUsuarioEdit,
    setSelectedUsuarioId,
    t,
  });

  const logsState = useSaasEmpresaLogsState();

  const {
    resetSelectedTitulos,
    ...financeiroRest
  } = financeiroActions;

  useEffect(() => {
    if (show) setActiveTab('dados-basicos');
    else resetSelectedTitulos();
  }, [show, resetSelectedTitulos]);

  const onFormSubmit = useCallback(
    (e: React.FormEvent) => handleSubmit(e, form),
    [handleSubmit, form]
  );

  const headerActionsContent = useMemo(() => (
    <SaasEmpresaFormHeader
      empresaId={empresaId}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      isMobile={isMobile}
      isPending={isPending}
      onClose={onClose}
      t={t}
    />
  ), [empresaId, activeTab, isMobile, isPending, onClose, t]);

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={t('modal.clientsTenants')}
      size="xl"
      modalId="saas-empresa-form"
      headerActions={headerActionsContent}
    >
      <form id="saas-empresa-form-id" onSubmit={onFormSubmit}>
        <div className="cliente-modal-content">
          <SaasEmpresaFormContent
            activeTab={activeTab}
            empresaId={empresaId}
            form={form}
            errors={errors}
            isEditing={isEditing}
            formDataForAddress={formDataForAddress}
            validarCep={parametros?.data?.validar_cep}
            isMobile={isMobile}
            t={t}
            onInputChange={handleInputChange}
            onFieldChange={handleFieldChange}
            contratos={tabData.contratos}
            contratosRaw={tabData.contratosRaw}
            contratosData={tabData.contratosData}
            statusEmpresa={tabData.statusEmpresa}
            contratosTf={tabData.contratosTf}
            showInativosContratos={showInativosContratos}
            setShowInativosContratos={setShowInativosContratos}
            contratosBulkActions={contratosActions.contratosBulkActions}
            onContratoRowDoubleClick={contratosActions.handleContratoRowDoubleClick}
            refetchContratos={tabData.refetchContratos}
            onContratoAudit={(i) => auditoria.handleAudit('SaasContrato', i.id)}
            usuarios={tabData.usuarios}
            usuariosData={tabData.usuariosData}
            usuariosTf={tabData.usuariosTf}
            usuariosBulkActions={usuariosActions.usuariosBulkActions}
            onUsuarioRowDoubleClick={usuariosActions.handleUsuarioRowDoubleClick}
            refetchUsuarios={tabData.refetchUsuarios}
            titulos={tabData.titulos}
            titulosParaFiltro={tabData.titulosParaFiltro}
            titulosData={tabData.titulosData}
            titulosTf={tabData.titulosTf}
            showCanceladosTitulos={showCanceladosTitulos}
            setShowCanceladosTitulos={setShowCanceladosTitulos}
            titulosBulkActions={financeiroRest.titulosBulkActions}
            onTituloSelectionChange={financeiroRest.setSelectedTitulos}
            onTituloRowDoubleClick={financeiroRest.handleTituloRowDoubleClick}
            refetchTitulos={tabData.refetchTitulos}
            onTituloAudit={(i) => auditoria.handleAudit('SaasTitulo', i.id)}
            logsData={tabData.logsData}
            logsTf={tabData.logsTf}
            refetchLogs={tabData.refetchLogs}
            onViewLog={logsState.handleViewLog}
          />
        </div>
      </form>
      <SaasEmpresaFormSubModals
        empresaId={empresaId}
        form={form}
        statusEmpresa={tabData.statusEmpresa}
        t={t}
        showContratoCreate={showContratoCreate}
        setShowContratoCreate={setShowContratoCreate}
        showContratoEdit={showContratoEdit}
        setShowContratoEdit={setShowContratoEdit}
        selectedContratoId={selectedContratoId}
        setSelectedContratoId={setSelectedContratoId}
        showUsuarioCreate={showUsuarioCreate}
        setShowUsuarioCreate={setShowUsuarioCreate}
        showUsuarioEdit={showUsuarioEdit}
        setShowUsuarioEdit={setShowUsuarioEdit}
        selectedUsuarioId={selectedUsuarioId}
        setSelectedUsuarioId={setSelectedUsuarioId}
        showTituloCreate={showTituloCreate}
        setShowTituloCreate={setShowTituloCreate}
        showImprimirModal={financeiroRest.showImprimirModal}
        setShowImprimirModal={financeiroRest.setShowImprimirModal}
        pdfUrl={financeiroRest.pdfUrl}
        isGeneratingPdf={financeiroRest.isGeneratingPdf}
        clearPdfUrl={financeiroRest.clearPdfUrl}
        showReceberModal={showReceberModal}
        setShowReceberModal={setShowReceberModal}
        tituloReceber={tituloReceber}
        setTituloReceber={setTituloReceber}
        refetchContratos={tabData.refetchContratos}
        refetchUsuarios={tabData.refetchUsuarios}
        refetchTitulos={tabData.refetchTitulos}
        auditoriaShowPreview={auditoria.showPreview}
        auditoriaPdfUrl={auditoria.pdfUrl}
        auditoriaIsGenerating={auditoria.isGeneratingPdf}
        onCloseAuditoriaPreview={auditoria.handleClosePreview}
        showLogDetailsModal={logsState.showLogDetailsModal}
        closeLogDetailsModal={logsState.closeLogDetailsModal}
        logExibirDetalhe={logsState.logExibirDetalhe}
      />
    </DraggableModal>
  );
};

export default SaasEmpresaFormModal;
