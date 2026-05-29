import React from 'react';
import DraggableModal from 'components/common/DraggableModal';
import { useI18n } from 'contexts/I18nContext';
import { DocumentoModalProps } from '../types';
import DocumentoModalBody from './DocumentoModalBody';
import DocumentoModalHeader from './DocumentoModalHeader';
import DocumentoModalSubModals from './DocumentoModalSubModals';
import { getContentPlaceholder, getTipoLabel } from './documentoModalUtils';
import { useDocumentoModal } from './useDocumentoModal';

const DocumentoModal: React.FC<DocumentoModalProps> = (props) => {
  const { t } = useI18n();
  const modal = useDocumentoModal(props);

  const tipoLabel = getTipoLabel(modal.tipo, t);
  const contentPlaceholder = getContentPlaceholder(modal.tipo, t);

  const headerActions = (
    <DocumentoModalHeader
      tipo={modal.tipo}
      isMobile={modal.isMobile}
      isEditing={modal.isEditing}
      activeTab={modal.activeTab}
      setActiveTab={modal.setActiveTab}
      showImprimirDropdown={modal.showImprimirDropdown}
      setShowImprimirDropdown={modal.setShowImprimirDropdown}
      isSubmitting={modal.isSubmitting}
      tipoLabel={tipoLabel}
      onPrint={modal.handlePrint}
      onSubmit={modal.handleSubmit}
      onClose={modal.handleClose}
    />
  );

  return (
    <>
      <DraggableModal
        show={props.show}
        onClose={modal.handleClose}
        title={tipoLabel}
        size="xl"
        headerActions={headerActions}
      >
        <DocumentoModalBody
          isMobile={modal.isMobile}
          tipo={modal.tipo}
          formData={modal.formData}
          setFormData={modal.setFormData}
          isEditing={modal.isEditing}
          currentDocumento={modal.currentDocumento}
          activeTab={modal.activeTab}
          tipoLabel={tipoLabel}
          contentPlaceholder={contentPlaceholder}
          clientesDisponiveis={modal.clientesDisponiveis}
          clienteTesteId={modal.clienteTesteId}
          setClienteTesteId={modal.setClienteTesteId}
          onShowClienteModal={() => modal.setShowClienteModal(true)}
          onSubmit={modal.handleSubmit}
        />
      </DraggableModal>

      <DocumentoModalSubModals
        isEditing={modal.isEditing}
        showPreview={modal.showPreview}
        pdfUrl={modal.pdfUrl}
        isGeneratingPdf={modal.isGeneratingPdf}
        showClienteModal={modal.showClienteModal}
        onClosePreview={modal.handleClosePreview}
        onCloseClienteModal={() => modal.setShowClienteModal(false)}
        onSelectCliente={modal.handleSelectCliente}
      />
    </>
  );
};

export default DocumentoModal;
