import React from 'react';
import { Titulo } from 'types';
import { TituloItem } from 'types/cliente';
import { TituloModal } from 'components/modals/titulos';
import ReceberModal from 'components/modals/pagamentos/ReceberModal';
import ImprimirModal from 'components/common/ImprimirModal';
import GerarNFeModal from 'components/modals/notas-fiscais/GerarNFeModal';
import { useAuditoria } from 'hooks/useAuditoria';
import { SelectedParcela, ContasReceberTranslateFn } from './contasReceberListTypes';

interface ContasReceberListSubModalsProps {
  isSaas: boolean;
  showTituloEditModal: boolean;
  selectedTituloId: number | null;
  onCloseTituloEditModal: () => void;
  showReceberModal: boolean;
  selectedParcela: SelectedParcela | null;
  onCloseReceberModal: () => void;
  showImprimirModal: boolean;
  onCloseImprimirModal: () => void;
  pdfUrl: string | null;
  isGeneratingPdf: boolean;
  showGerarNFeModal: boolean;
  selectedTituloForNFe: Titulo | null;
  onCloseGerarNFeModal: () => void;
  onRefreshData: () => Promise<void>;
  auditoria: ReturnType<typeof useAuditoria>;
  t: ContasReceberTranslateFn;
}

export const ContasReceberListSubModals: React.FC<ContasReceberListSubModalsProps> = ({
  isSaas,
  showTituloEditModal,
  selectedTituloId,
  onCloseTituloEditModal,
  showReceberModal,
  selectedParcela,
  onCloseReceberModal,
  showImprimirModal,
  onCloseImprimirModal,
  pdfUrl,
  isGeneratingPdf,
  showGerarNFeModal,
  selectedTituloForNFe,
  onCloseGerarNFeModal,
  onRefreshData,
  auditoria,
  t,
}) => (
  <>
    {!isSaas && showTituloEditModal && (
      <TituloModal
        show={showTituloEditModal}
        onClose={onCloseTituloEditModal}
        onSuccess={onRefreshData}
        tituloId={selectedTituloId}
      />
    )}

    {!isSaas && showReceberModal && selectedParcela && (
      <ReceberModal
        isOpen={showReceberModal}
        onClose={onCloseReceberModal}
        onSuccess={onRefreshData}
        parcela={selectedParcela}
      />
    )}

    <ImprimirModal
      show={showImprimirModal}
      onClose={onCloseImprimirModal}
      pdfUrl={pdfUrl}
      isGenerating={isGeneratingPdf}
      title={t('financial.viewDocument')}
      fileName="boleto.pdf"
      modalId="financeiro-imprimir-modal"
    />

    <ImprimirModal
      show={auditoria.showPreview}
      onClose={auditoria.handleClosePreview}
      pdfUrl={auditoria.pdfUrl}
      isGenerating={auditoria.isGeneratingPdf}
      title={t('financial.executionLogs')}
      modalId="auditoria-titulo-modal"
    />

    {!isSaas && (
      <GerarNFeModal
        show={showGerarNFeModal}
        onClose={onCloseGerarNFeModal}
        cliente={selectedTituloForNFe?.cliente || undefined}
        titulo={
          selectedTituloForNFe
            ? ({
                id: selectedTituloForNFe.id,
                numero_titulo: selectedTituloForNFe.numero_titulo,
                status: selectedTituloForNFe.status,
                valor: selectedTituloForNFe.valor,
                valor_parcela: selectedTituloForNFe.valor_final || selectedTituloForNFe.valor,
                valor_pago: selectedTituloForNFe.valor_pago || null,
                data_vencimento: selectedTituloForNFe.data_vencimento,
                data_pagamento: selectedTituloForNFe.data_pagamento || null,
                charge_id: selectedTituloForNFe.charge_id || null,
                descricao: selectedTituloForNFe.descricao,
                observacoes: selectedTituloForNFe.observacoes,
              } as TituloItem & { descricao?: string; observacoes?: string })
            : undefined
        }
        onSuccess={onRefreshData}
      />
    )}
  </>
);
