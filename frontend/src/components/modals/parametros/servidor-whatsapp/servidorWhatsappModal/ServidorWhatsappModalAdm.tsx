import React, { useLayoutEffect, useMemo, useRef } from 'react';
import DraggableModal from 'components/common/DraggableModal';
import { ServidorWhatsappModalProps } from '../types';
import ServidorWhatsappModalBody from './ServidorWhatsappModalBody';
import ServidorWhatsappModalHeader from './ServidorWhatsappModalHeader';
import { useServidorWhatsappModal } from './useServidorWhatsappModal';

type ServidorWhatsappModalAdmProps = Omit<ServidorWhatsappModalProps, 'variant'>;

const ServidorWhatsappModalAdm: React.FC<ServidorWhatsappModalAdmProps> = ({
  show,
  onClose,
  skipWrapper = false,
  onHeaderActionsReady,
}) => {
  const modal = useServidorWhatsappModal({ show, onClose });

  const headerActionsContent = useMemo(
    () => (
      <ServidorWhatsappModalHeader
        activeTab={modal.activeTab}
        setActiveTab={modal.setActiveTab}
        formData={modal.formData}
        servidorAtivo={modal.servidorAtivo}
        isSaveServidorPending={modal.saveServidorMutation.isPending}
        isSaveMensagemPending={modal.saveMensagemMutation.isPending}
        onClose={modal.handleClose}
        onReset={modal.handleReset}
        onSaveMensagem={modal.handleSaveMensagem}
      />
    ),
    [
      modal.activeTab,
      modal.formData,
      modal.saveServidorMutation.isPending,
      modal.saveMensagemMutation.isPending,
      modal.servidorAtivo,
      modal.handleClose,
      modal.handleReset,
      modal.handleSaveMensagem,
      modal.setActiveTab,
    ]
  );

  const headerActionsContentRef = useRef(headerActionsContent);
  headerActionsContentRef.current = headerActionsContent;

  useLayoutEffect(() => {
    if (skipWrapper && onHeaderActionsReady) {
      if (!show) {
        onHeaderActionsReady(null);
      } else {
        onHeaderActionsReady(headerActionsContentRef.current);
      }
    }
    return () => {
      if (skipWrapper && onHeaderActionsReady) {
        onHeaderActionsReady(null);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    skipWrapper,
    onHeaderActionsReady,
    modal.activeTab,
    modal.saveServidorMutation.isPending,
    modal.saveMensagemMutation.isPending,
    modal.servidorAtivo?.data,
    show,
  ]);

  const modalContent = (
    <ServidorWhatsappModalBody
      isLoading={modal.isLoading}
      loadingLabel={modal.t('messages.loading')}
      activeTab={modal.activeTab}
      formData={modal.formData}
      onFormFieldChange={modal.handleFormFieldChange}
      isSaveServidorPending={modal.saveServidorMutation.isPending}
      servidorAtivo={modal.servidorAtivo}
      testPhone={modal.testPhone}
      testMessage={modal.testMessage}
      onTestPhoneChange={modal.setTestPhone}
      onTestMessageChange={modal.setTestMessage}
      onSendTestMessage={modal.handleSendTestMessage}
      isSendingTest={modal.sendTestMessageMutation.isPending}
      onSubmit={modal.handleSubmit}
      interacao1={modal.interacao1}
      interacao2={modal.interacao2}
      interacao3={modal.interacao3}
      mensagemType={modal.mensagemType}
      tipoEnvio={modal.tipoEnvio}
      mensagemPadrao={modal.mensagemPadrao}
      mensagemManual={modal.mensagemManual}
      templateId={modal.templateId}
      templateNome={
        modal.mensagemData?.template
          ? `${modal.mensagemData.template.nome} (${modal.mensagemData.template.idioma})`
          : undefined
      }
      onMensagemTypeChange={modal.setMensagemType}
      onTipoEnvioChange={modal.setTipoEnvio}
      onMensagemPadraoChange={modal.setMensagemPadrao}
      onMensagemManualChange={modal.setMensagemManual}
      onTemplateIdChange={modal.setTemplateId}
      onInteracao1Change={modal.setInteracao1}
      onInteracao2Change={modal.setInteracao2}
      onInteracao3Change={modal.setInteracao3}
      onSaveMensagem={modal.handleSaveMensagem}
      isSaveMensagemPending={modal.saveMensagemMutation.isPending}
      variaveisData={modal.variaveisData}
      onInsertVariable={modal.handleInsertVariable}
      onShowTemplates={() => modal.setShowTemplateSelectModal(true)}
      showTemplateSelectModal={modal.showTemplateSelectModal}
      onCloseTemplateSelectModal={() => modal.setShowTemplateSelectModal(false)}
      onTemplateSelect={modal.handleTemplateSelect}
    />
  );

  if (skipWrapper) {
    return modalContent;
  }

  return (
    <DraggableModal
      show={show}
      onClose={modal.handleClose}
      title={modal.t('whatsappServer.title')}
      size="lg"
      modalId="servidor-whatsapp-modal"
      headerActions={headerActionsContent}
    >
      {modalContent}
    </DraggableModal>
  );
};

export default ServidorWhatsappModalAdm;
