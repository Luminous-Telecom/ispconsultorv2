import React from 'react';
import ImprimirModal from 'components/common/ImprimirModal';
import ClienteListModal from 'components/modals/clientes/ClienteListModal';
import { useI18n } from 'contexts/I18nContext';

interface DocumentoModalSubModalsProps {
  isEditing: boolean;
  showPreview: boolean;
  pdfUrl: string | null;
  isGeneratingPdf: boolean;
  showClienteModal: boolean;
  onClosePreview: () => void;
  onCloseClienteModal: () => void;
  onSelectCliente: (cliente: { id: number }) => void;
}

function DocumentoModalSubModals({
  isEditing,
  showPreview,
  pdfUrl,
  isGeneratingPdf,
  showClienteModal,
  onClosePreview,
  onCloseClienteModal,
  onSelectCliente,
}: DocumentoModalSubModalsProps) {
  const { t } = useI18n();

  return (
    <>
      {isEditing && (
        <ImprimirModal
          show={showPreview}
          onClose={onClosePreview}
          pdfUrl={pdfUrl}
          isGenerating={isGeneratingPdf}
          title={t('document.viewDocument')}
          modalId="documento-imprimir-modal"
        />
      )}

      <ClienteListModal
        show={showClienteModal}
        onClose={onCloseClienteModal}
        onSelectClient={onSelectCliente}
      />
    </>
  );
}

export default DocumentoModalSubModals;
