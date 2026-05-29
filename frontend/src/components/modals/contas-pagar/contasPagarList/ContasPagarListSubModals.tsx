import React from 'react';
import ImprimirModal from 'components/common/ImprimirModal';
import { useAuditoria } from 'hooks/useAuditoria';
import ContaPagarModal from '../ContaPagarModal';
import { ContasPagarTranslateFn } from './contasPagarListTypes';

interface ContasPagarListSubModalsProps {
  showCreateModal: boolean;
  onCloseCreateModal: () => void;
  showEditModal: boolean;
  selectedContaPagarId: number | null;
  onCloseEditModal: () => void;
  showPagamentoModal: boolean;
  onClosePagamentoModal: () => void;
  onSuccess: () => void;
  auditoria: ReturnType<typeof useAuditoria>;
  t: ContasPagarTranslateFn;
}

export const ContasPagarListSubModals: React.FC<ContasPagarListSubModalsProps> = ({
  showCreateModal,
  onCloseCreateModal,
  showEditModal,
  selectedContaPagarId,
  onCloseEditModal,
  showPagamentoModal,
  onClosePagamentoModal,
  onSuccess,
  auditoria,
  t,
}) => (
  <>
    {showCreateModal && (
      <ContaPagarModal show={showCreateModal} onClose={onCloseCreateModal} onSuccess={onSuccess} />
    )}

    {showEditModal && selectedContaPagarId && (
      <ContaPagarModal
        show={showEditModal}
        onClose={onCloseEditModal}
        contaPagarId={selectedContaPagarId}
        onSuccess={onSuccess}
      />
    )}

    <ContaPagarModal
      key={`pagamento-manual-${selectedContaPagarId || 'none'}`}
      show={showPagamentoModal}
      onClose={onClosePagamentoModal}
      contaPagarId={selectedContaPagarId}
      onSuccess={onSuccess}
      showPagamentoOnOpen={true}
    />

    <ImprimirModal
      show={auditoria.showPreview}
      onClose={auditoria.handleClosePreview}
      pdfUrl={auditoria.pdfUrl}
      isGenerating={auditoria.isGeneratingPdf}
      title={t('financial.executionLogs')}
      modalId="auditoria-conta-pagar-modal"
    />
  </>
);
