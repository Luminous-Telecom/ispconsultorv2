import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { TituloModal } from 'components/modals/titulos/titulo';
import ReceberModal from 'components/modals/pagamentos/ReceberModal';
import PlanoListModal from 'components/modals/planos/PlanoListModal';
import BancoListModal from 'components/modals/bancos/BancoListModal';
import { TipoCobrancaContratoListModal } from 'components/modals/tipoCobrancaContrato';
import ModeloContratoSelectModal from 'components/modals/parametros/ModeloContratoSelectModal';
import ImprimirModal from 'components/common/ImprimirModal';
import { useI18n } from 'contexts/I18nContext';
import { Banco, Cliente, Plano, Titulo } from 'types';
import { Contrato } from 'hooks/useContratos';
import { TipoCobrancaContrato } from 'services/tipoCobrancaContratoService';
import { DocumentoSistema } from 'services/documentoSistemaService';
import { TermoContrato } from 'services/termoContratoService';
import { ContratoPlanoAdicional } from 'services/contratoPlanoAdicionalService';
import { TermoFormData } from './types';
import { TermoEditModal, SelecionarTermoModal, ServicoAdicionalModal, EnviarAssinaturaModal } from './modals';

interface ContratoModalSubModalsProps {
  isEditMode: boolean;
  internalContratoId: number | null;
  contratoData: Contrato | undefined;
  showTituloCreateModal: boolean;
  setShowTituloCreateModal: (show: boolean) => void;
  showTituloEditModal: boolean;
  setShowTituloEditModal: (show: boolean) => void;
  selectedTituloId: number | null;
  setSelectedTituloId: (id: number | null) => void;
  showReceberModal: boolean;
  setShowReceberModal: (show: boolean) => void;
  selectedParcela: Titulo | null;
  setSelectedParcela: (parcela: Titulo | null) => void;
  showTermoModal: boolean;
  setShowTermoModal: (show: boolean) => void;
  showSelecionarTermoModal: boolean;
  setShowSelecionarTermoModal: (show: boolean) => void;
  showEnviarAssinaturaModal: boolean;
  setShowEnviarAssinaturaModal: (show: boolean) => void;
  showServicoAdicionalModal: boolean;
  setShowServicoAdicionalModal: (show: boolean) => void;
  editingTermo: TermoContrato | null;
  setEditingTermo: (termo: TermoContrato | null) => void;
  termoFormData: TermoFormData;
  setTermoFormData: React.Dispatch<React.SetStateAction<TermoFormData>>;
  termoParaAssinatura: TermoContrato | null;
  setTermoParaAssinatura: (termo: TermoContrato | null) => void;
  editingServicoAdicional: ContratoPlanoAdicional | null;
  setEditingServicoAdicional: (servico: ContratoPlanoAdicional | null) => void;
  showPlanoModal: boolean;
  setShowPlanoModal: (show: boolean) => void;
  showBancoModal: boolean;
  setShowBancoModal: (show: boolean) => void;
  showTipoCobrancaContratoModal: boolean;
  setShowTipoCobrancaContratoModal: (show: boolean) => void;
  showModeloContratoModal: boolean;
  setShowModeloContratoModal: (show: boolean) => void;
  onPlanoSelect: (plano: Plano) => void;
  onBancoSelect: (banco: Banco) => void;
  onTipoCobrancaContratoSelect: (tipo: TipoCobrancaContrato) => void;
  onModeloContratoSelect: (modelo: DocumentoSistema) => void;
  impressaoShowModal: boolean;
  impressaoPdfUrl: string | null;
  impressaoIsGenerating: boolean;
  onCloseImpressaoContrato: () => void;
  showPreview: boolean;
  pdfUrlLocal: string | null;
  isGeneratingPdfLocal: boolean;
  onClosePreview: () => void;
  auditoriaShowPreview: boolean;
  auditoriaPdfUrl: string | null;
  auditoriaIsGenerating: boolean;
  onCloseAuditoriaPreview: () => void;
  refetchTitulos: () => void;
  refetchTitulosAvulsos: () => void;
  refetchTermos: () => void;
  refetchServicosAdicionais: () => void;
}

function ContratoModalSubModals({
  isEditMode,
  internalContratoId,
  contratoData,
  showTituloCreateModal,
  setShowTituloCreateModal,
  showTituloEditModal,
  setShowTituloEditModal,
  selectedTituloId,
  setSelectedTituloId,
  showReceberModal,
  setShowReceberModal,
  selectedParcela,
  setSelectedParcela,
  showTermoModal,
  setShowTermoModal,
  showSelecionarTermoModal,
  setShowSelecionarTermoModal,
  showEnviarAssinaturaModal,
  setShowEnviarAssinaturaModal,
  showServicoAdicionalModal,
  setShowServicoAdicionalModal,
  editingTermo,
  setEditingTermo,
  termoFormData,
  setTermoFormData,
  termoParaAssinatura,
  setTermoParaAssinatura,
  editingServicoAdicional,
  setEditingServicoAdicional,
  showPlanoModal,
  setShowPlanoModal,
  showBancoModal,
  setShowBancoModal,
  showTipoCobrancaContratoModal,
  setShowTipoCobrancaContratoModal,
  showModeloContratoModal,
  setShowModeloContratoModal,
  onPlanoSelect,
  onBancoSelect,
  onTipoCobrancaContratoSelect,
  onModeloContratoSelect,
  impressaoShowModal,
  impressaoPdfUrl,
  impressaoIsGenerating,
  onCloseImpressaoContrato,
  showPreview,
  pdfUrlLocal,
  isGeneratingPdfLocal,
  onClosePreview,
  auditoriaShowPreview,
  auditoriaPdfUrl,
  auditoriaIsGenerating,
  onCloseAuditoriaPreview,
  refetchTitulos,
  refetchTitulosAvulsos,
  refetchTermos,
  refetchServicosAdicionais,
}: ContratoModalSubModalsProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  return (
    <>
      {isEditMode && internalContratoId && (
        <>
          <TituloModal
            show={showTituloCreateModal}
            clienteId={contratoData?.cliente_id}
            contratoId={internalContratoId || undefined}
            isAvulso={true}
            onClose={() => setShowTituloCreateModal(false)}
            onSuccess={() => {
              setShowTituloCreateModal(false);
              queryClient.invalidateQueries({ queryKey: ['titulos', 'contrato', internalContratoId] });
              queryClient.invalidateQueries({
                queryKey: ['titulos', 'contrato', internalContratoId, 'avulsos'],
              });
              if (contratoData?.cliente_id) {
                queryClient.invalidateQueries({
                  queryKey: ['titulos', { cliente_id: contratoData.cliente_id }],
                });
              }
              queryClient.invalidateQueries({ queryKey: ['titulos'] });
              refetchTitulos();
              refetchTitulosAvulsos();
            }}
          />

          <TituloModal
            show={showTituloEditModal}
            tituloId={selectedTituloId || null}
            onClose={() => {
              setShowTituloEditModal(false);
              setSelectedTituloId(null);
            }}
            onSuccess={() => {
              setShowTituloEditModal(false);
              setSelectedTituloId(null);
              queryClient.invalidateQueries({ queryKey: ['titulos', 'contrato', internalContratoId] });
            }}
          />

          <ReceberModal
            isOpen={showReceberModal}
            parcela={
              selectedParcela
                ? {
                    id: selectedParcela.id,
                    numero_titulo: selectedParcela.numero_titulo,
                    valor_parcela: selectedParcela.valor,
                    data_vencimento: selectedParcela.data_vencimento,
                    cliente: selectedParcela.cliente,
                  }
                : null
            }
            onClose={() => {
              setShowReceberModal(false);
              setSelectedParcela(null);
            }}
          />

          <TermoEditModal
            show={showTermoModal}
            onClose={() => {
              setShowTermoModal(false);
              setEditingTermo(null);
              setTermoFormData({ assinado: 'NAO', termoCadastradoId: 0 });
            }}
            editingTermo={editingTermo}
            contratoId={internalContratoId}
            termoFormData={termoFormData}
            setTermoFormData={setTermoFormData}
            onShowSelecionarTermo={() => setShowSelecionarTermoModal(true)}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['termos-contrato', internalContratoId] });
            }}
          />

          <SelecionarTermoModal
            show={showSelecionarTermoModal}
            onClose={() => setShowSelecionarTermoModal(false)}
            onSelect={(termo) => {
              setTermoFormData((prev) => ({ ...prev, termoCadastradoId: termo.id }));
              setShowSelecionarTermoModal(false);
            }}
          />

          <ServicoAdicionalModal
            show={showServicoAdicionalModal}
            onClose={() => {
              setShowServicoAdicionalModal(false);
              setEditingServicoAdicional(null);
            }}
            editingServico={editingServicoAdicional}
            contratoId={internalContratoId}
            onSuccess={() => {
              queryClient.invalidateQueries({
                queryKey: ['contrato-planos-adicionais', internalContratoId],
              });
              refetchServicosAdicionais();
            }}
          />

          <EnviarAssinaturaModal
            show={showEnviarAssinaturaModal}
            onClose={() => {
              setShowEnviarAssinaturaModal(false);
              setTermoParaAssinatura(null);
            }}
            termo={termoParaAssinatura}
            cliente={contratoData?.cliente as Cliente | undefined}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['termos-contrato', internalContratoId] });
              queryClient.invalidateQueries({ queryKey: ['assinaturas-digital'] });
              refetchTermos();
            }}
          />

          <ImprimirModal
            show={impressaoShowModal || showPreview}
            onClose={() => {
              onCloseImpressaoContrato();
              onClosePreview();
            }}
            pdfUrl={impressaoPdfUrl || pdfUrlLocal}
            isGenerating={impressaoIsGenerating || isGeneratingPdfLocal}
            title={t('modal.viewDocument')}
            modalId="contrato-imprimir-modal"
          />

          <ImprimirModal
            show={auditoriaShowPreview}
            onClose={onCloseAuditoriaPreview}
            pdfUrl={auditoriaPdfUrl}
            isGenerating={auditoriaIsGenerating}
            title={t('financial.executionLogs')}
            modalId="auditoria-contrato-modal"
          />
        </>
      )}

      <PlanoListModal
        show={showPlanoModal}
        onClose={() => setShowPlanoModal(false)}
        onSelectPlano={onPlanoSelect}
        title={t('ui.selectPlan')}
      />

      <BancoListModal
        show={showBancoModal}
        onClose={() => setShowBancoModal(false)}
        onSelectBanco={onBancoSelect}
        title={t('ui.selectBank')}
      />

      <TipoCobrancaContratoListModal
        show={showTipoCobrancaContratoModal}
        onClose={() => setShowTipoCobrancaContratoModal(false)}
        onSelectTipo={onTipoCobrancaContratoSelect}
        title={t('modal.billingType')}
      />

      <ModeloContratoSelectModal
        show={showModeloContratoModal}
        onClose={() => setShowModeloContratoModal(false)}
        onSelect={onModeloContratoSelect}
        title={t('form.contractModel')}
      />
    </>
  );
}

export default ContratoModalSubModals;
