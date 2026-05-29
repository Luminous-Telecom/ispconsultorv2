import React from 'react';
import ContratoModal from 'components/modals/clientes/contrato/ContratoModal';
import ImprimirModal from 'components/common/ImprimirModal';
import { useAuditoria } from 'hooks/useAuditoria';
import { useImpressaoContrato } from 'hooks/useImpressaoContrato';

interface ContratoListSubModalsProps {
  showCreateModal: boolean;
  showEditModal: boolean;
  selectedContratoId: number | null;
  onCloseContratoModal: () => void;
  onContratoSuccess: () => void;
  impressaoHook: ReturnType<typeof useImpressaoContrato>;
  showImprimirModal: boolean;
  onCloseImprimirModal: () => void;
  pdfUrlLocal: string | null;
  isGeneratingPdfLocal: boolean;
  auditoria: ReturnType<typeof useAuditoria>;
}

export const ContratoListSubModals: React.FC<ContratoListSubModalsProps> = ({
  showCreateModal,
  showEditModal,
  selectedContratoId,
  onCloseContratoModal,
  onContratoSuccess,
  impressaoHook,
  showImprimirModal,
  onCloseImprimirModal,
  pdfUrlLocal,
  isGeneratingPdfLocal,
  auditoria,
}) => (
  <>
    <ContratoModal
      show={showCreateModal || showEditModal}
      clienteId={undefined}
      contratoId={showEditModal ? selectedContratoId : null}
      onClose={onCloseContratoModal}
      onSuccess={onContratoSuccess}
    />

    <ImprimirModal
      show={impressaoHook.showModal || showImprimirModal}
      onClose={onCloseImprimirModal}
      pdfUrl={impressaoHook.pdfUrl || pdfUrlLocal || null}
      isGenerating={impressaoHook.isGeneratingPdf || isGeneratingPdfLocal}
      title="Visualizar Documento"
      modalId="contrato-list-imprimir-modal"
    />

    <ImprimirModal
      show={auditoria.showPreview}
      onClose={auditoria.handleClosePreview}
      pdfUrl={auditoria.pdfUrl}
      isGenerating={auditoria.isGeneratingPdf}
      title="Relatórios de logs"
      modalId="auditoria-contrato-modal"
    />
  </>
);
