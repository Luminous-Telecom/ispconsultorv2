import React from 'react';
import { useI18n } from 'contexts/I18nContext';
import { CarneParcela, Cliente } from 'types';
import { TituloItem } from 'types/cliente';
import ImprimirModal from 'components/common/ImprimirModal';
import { TituloModal } from 'components/modals/titulos/titulo';
import ReceberModal from 'components/modals/pagamentos/ReceberModal';
import ContratoModal from '../../contrato/ContratoModal';
import GerarNFeModal from 'components/modals/notas-fiscais/GerarNFeModal';

interface ClienteModalSubModalsProps {
  showTituloEditModal: boolean;
  selectedTituloId: number | null;
  onCloseTituloEditModal: () => void;
  onTituloEditSuccess: () => void;
  showReceberModal: boolean;
  selectedParcela: TituloItem | null;
  onCloseReceberModal: () => void;
  onReceberSuccess: () => void;
  showContratoCreateModal: boolean;
  showContratoEditModal: boolean;
  selectedContratoId: number | null;
  contratoClienteId?: number;
  onCloseContratoModal: () => void;
  showImprimirModal: boolean;
  onCloseImprimirModal: () => void;
  pdfUrl: string | null;
  isGeneratingPdf: boolean;
  showAuditoriaPreview: boolean;
  onCloseAuditoriaPreview: () => void;
  auditoriaPdfUrl: string | null;
  auditoriaIsGenerating: boolean;
  showGerarNFeModal: boolean;
  onCloseGerarNFeModal: () => void;
  cliente?: Cliente;
  selectedTituloForNFe: CarneParcela | null;
  onGerarNFeSuccess: () => void;
}

function ClienteModalSubModals({
  showTituloEditModal,
  selectedTituloId,
  onCloseTituloEditModal,
  onTituloEditSuccess,
  showReceberModal,
  selectedParcela,
  onCloseReceberModal,
  onReceberSuccess,
  showContratoCreateModal,
  showContratoEditModal,
  selectedContratoId,
  contratoClienteId,
  onCloseContratoModal,
  showImprimirModal,
  onCloseImprimirModal,
  pdfUrl,
  isGeneratingPdf,
  showAuditoriaPreview,
  onCloseAuditoriaPreview,
  auditoriaPdfUrl,
  auditoriaIsGenerating,
  showGerarNFeModal,
  onCloseGerarNFeModal,
  cliente,
  selectedTituloForNFe,
  onGerarNFeSuccess,
}: ClienteModalSubModalsProps) {
  const { t } = useI18n();

  return (
    <>
      <TituloModal
        show={showTituloEditModal}
        tituloId={selectedTituloId || null}
        onClose={onCloseTituloEditModal}
        onSuccess={onTituloEditSuccess}
      />

      <ReceberModal
        isOpen={showReceberModal}
        onClose={onCloseReceberModal}
        parcela={
          selectedParcela
            ? {
                id: selectedParcela.id,
                numero_titulo: (
                  selectedParcela.numero_titulo ||
                  selectedParcela.numero_parcela ||
                  `${t('table.id')} ${selectedParcela.id}`
                ).toString(),
                valor_parcela: selectedParcela.valor || selectedParcela.valor_parcela,
                data_vencimento: selectedParcela.data_vencimento,
                cliente: (selectedParcela.cliente as { razao_social?: string })?.razao_social
                  ? {
                      razao_social: (selectedParcela.cliente as { razao_social?: string })
                        .razao_social!,
                    }
                  : undefined,
              }
            : null
        }
        onSuccess={onReceberSuccess}
      />

      {(showContratoCreateModal || showContratoEditModal) && (
        <ContratoModal
          show
          clienteId={contratoClienteId}
          contratoId={showContratoEditModal ? selectedContratoId : null}
          onClose={onCloseContratoModal}
          onSuccess={() => {
            // Não fechar o modal automaticamente - permitir criar múltiplos contratos
          }}
        />
      )}

      <ImprimirModal
        show={showImprimirModal}
        onClose={onCloseImprimirModal}
        pdfUrl={pdfUrl}
        isGenerating={isGeneratingPdf}
        title={t('modal.viewDocument')}
        fileName="boleto.pdf"
        modalId="cliente-imprimir-modal"
      />

      <ImprimirModal
        show={showAuditoriaPreview}
        onClose={onCloseAuditoriaPreview}
        pdfUrl={auditoriaPdfUrl}
        isGenerating={auditoriaIsGenerating}
        title={t('financial.executionLogs')}
        modalId="auditoria-cliente-modal"
      />

      <GerarNFeModal
        show={showGerarNFeModal}
        onClose={onCloseGerarNFeModal}
        cliente={cliente || undefined}
        titulo={selectedTituloForNFe || undefined}
        onSuccess={onGerarNFeSuccess}
      />
    </>
  );
}

export default ClienteModalSubModals;
