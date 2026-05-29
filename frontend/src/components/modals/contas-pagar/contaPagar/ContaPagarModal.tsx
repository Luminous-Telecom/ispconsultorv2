import React from 'react';
import { useI18n } from 'contexts/I18nContext';
import { useIsMobile } from 'hooks/useMediaQuery';
import { useEntitySelectField } from 'hooks/useEntitySelectField';
import DraggableModal from 'components/common/DraggableModal';
import { ModalFormActions } from 'components/ui';
import FornecedorListModal from 'components/modals/fornecedores/FornecedorListModal';
import { useContaPagarQueries } from './hooks/useContaPagarQueries';
import { useContaPagarForm } from './hooks/useContaPagarForm';
import { useContaPagarPagamento } from './hooks/useContaPagarPagamento';
import ContaPagarFormContent from './sections/ContaPagarFormContent';
import PagamentoModal from './subModals/PagamentoModal';
import type { ContaPagarFormData, ContaPagarModalProps } from './types';

const ContaPagarModal: React.FC<ContaPagarModalProps> = ({
  show,
  onClose,
  contaPagarId = null,
  onSuccess,
  showPagamentoOnOpen = false
}) => {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const fornecedorSelect = useEntitySelectField<{ id: number; nome_razao_social: string }>();

  const {
    isEditing,
    contaPagar,
    isLoadingContaPagar,
    refetchContaPagar,
    createMutation,
    updateMutation,
    pagarMutation,
    fornecedoresData
  } = useContaPagarQueries(contaPagarId);

  const {
    formData,
    setFormData,
    errors,
    setErrors,
    handleSubmit
  } = useContaPagarForm({
    show,
    isEditing,
    contaPagar,
    contaPagarId,
    fornecedorSelect,
    createMutation,
    updateMutation,
    onSuccess
  });

  const {
    showPagamentoModal,
    pagamentoData,
    setPagamentoData,
    valorAberto,
    valorTotalCalculado,
    valorTotal,
    closePagamentoModal,
    handlePagarManual
  } = useContaPagarPagamento({
    show,
    showPagamentoOnOpen,
    contaPagarId,
    contaPagar,
    pagarMutation,
    refetchContaPagar,
    onSuccess
  });

  const modalTitle = isEditing ? t('modal.editAccountPayable') : t('modal.createAccountPayable');

  const fornecedores = (fornecedoresData?.data || []).map((f) => ({
    id: f.id,
    nome: f.nome_razao_social
  }));

  const handleFieldChange = <K extends keyof ContaPagarFormData>(field: K, value: ContaPagarFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleClearError = (field: keyof ContaPagarFormData) => {
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handleFornecedorChange = (value: number) => {
    fornecedorSelect.setSelectedId(value);
    setFormData(prev => ({ ...prev, fornecedor_id: value }));
    setErrors(prev => ({ ...prev, fornecedor_id: undefined }));
  };

  const handleTipoCriacaoChange = (value: 'unica' | 'lote') => {
    setFormData(prev => ({
      ...prev,
      tipo_criacao: value,
      data_vencimento: value === 'lote' ? '' : prev.data_vencimento,
      data_vencimento_inicial: value === 'unica' ? '' : prev.data_vencimento_inicial,
      data_vencimento_final: value === 'unica' ? '' : prev.data_vencimento_final
    }));
  };

  const handleTipoPagamentoChange = (value: ContaPagarFormData['tipo_pagamento']) => {
    setFormData(prev => ({
      ...prev,
      tipo_pagamento: value,
      linha_digitavel: value !== 'BOLETO' ? '' : prev.linha_digitavel,
      tipo_chave_pix: value !== 'PIX' ? '' : prev.tipo_chave_pix,
      chave_pix: value !== 'PIX' ? '' : prev.chave_pix
    }));
  };

  const isPending = createMutation.isPending || updateMutation.isPending || pagarMutation.isPending;

  return (
    <>
      {!showPagamentoOnOpen && (
        <DraggableModal
          show={show}
          onClose={onClose}
          title={modalTitle}
          size="lg"
          modalId={isEditing ? 'conta-pagar-edit-modal' : 'conta-pagar-create-modal'}
          headerActions={
            !(isLoadingContaPagar && isEditing) ? (
              <ModalFormActions
                onCancel={onClose}
                formId={isEditing ? 'conta-pagar-edit-form' : 'conta-pagar-create-form'}
                isPending={isPending}
              />
            ) : undefined
          }
        >
          <ContaPagarFormContent
            isEditing={isEditing}
            isLoading={isLoadingContaPagar}
            isMobile={isMobile}
            formData={formData}
            errors={errors}
            fornecedores={fornecedores}
            onSubmit={handleSubmit}
            onFornecedorChange={handleFornecedorChange}
            onShowFornecedorModal={fornecedorSelect.openModal}
            onFieldChange={handleFieldChange}
            onClearError={handleClearError}
            onTipoCriacaoChange={handleTipoCriacaoChange}
            onTipoPagamentoChange={handleTipoPagamentoChange}
          />
        </DraggableModal>
      )}

      <FornecedorListModal
        show={fornecedorSelect.showModal}
        onClose={fornecedorSelect.closeModal}
        onSelectFornecedor={(fornecedor) => {
          fornecedorSelect.setSelectedId(fornecedor.id);
          setFormData(prev => ({ ...prev, fornecedor_id: fornecedor.id }));
          setErrors(prev => ({ ...prev, fornecedor_id: undefined }));
          fornecedorSelect.closeModal();
        }}
      />

      {showPagamentoModal && contaPagar && (
        <PagamentoModal
          show={showPagamentoModal}
          contaPagar={contaPagar}
          pagamentoData={pagamentoData}
          valorAberto={valorAberto}
          valorTotalCalculado={valorTotalCalculado}
          valorTotal={valorTotal}
          isPending={pagarMutation.isPending}
          onClose={closePagamentoModal}
          onConfirm={handlePagarManual}
          onPagamentoDataChange={setPagamentoData}
        />
      )}
    </>
  );
};

export default ContaPagarModal;
