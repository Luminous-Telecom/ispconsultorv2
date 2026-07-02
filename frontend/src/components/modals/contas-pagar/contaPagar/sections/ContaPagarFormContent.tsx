import React from 'react';
import { useI18n } from 'contexts/I18nContext';
import { Loading } from 'components/ui';
import ContaPagarFornecedorSection from './ContaPagarFornecedorSection';
import ContaPagarVencimentoSection from './ContaPagarVencimentoSection';
import ContaPagarValorTipoPagamentoSection from './ContaPagarValorTipoPagamentoSection';
import ContaPagarPixBoletoSection from './ContaPagarPixBoletoSection';
import ContaPagarDocumentoDescricaoSection from './ContaPagarDocumentoDescricaoSection';
import type { ContaPagarFormData, ContaPagarFormErrors } from '../types';

interface ContaPagarFormContentProps {
  isEditing: boolean;
  isLoading: boolean;
  isMobile: boolean;
  formData: ContaPagarFormData;
  errors: ContaPagarFormErrors;
  fornecedores: Array<{ id: number; nome: string }>;
  onSubmit: (e: React.FormEvent) => void;
  onFornecedorChange: (value: number) => void;
  onShowFornecedorModal: () => void;
  onFieldChange: <K extends keyof ContaPagarFormData>(field: K, value: ContaPagarFormData[K]) => void;
  onClearError: (field: keyof ContaPagarFormData) => void;
  onTipoCriacaoChange: (value: 'unica' | 'lote') => void;
  onTipoPagamentoChange: (value: ContaPagarFormData['tipo_pagamento']) => void;
}

const ContaPagarFormContent: React.FC<ContaPagarFormContentProps> = ({
  isEditing,
  isLoading,
  isMobile: _isMobile,
  formData,
  errors,
  fornecedores,
  onSubmit,
  onFornecedorChange,
  onShowFornecedorModal,
  onFieldChange,
  onClearError,
  onTipoCriacaoChange,
  onTipoPagamentoChange
}) => {
  const { t } = useI18n();

  if (isLoading && isEditing) {
    return (
      <Loading variant="centered" message={t('messages.loadingAccountData')} />
    );
  }

  return (
    <form
      id={isEditing ? 'conta-pagar-edit-form' : 'conta-pagar-create-form'}
      onSubmit={onSubmit}
      className="form-modal-simple"
    >
      <div className="row g-2">
        <div className="col-12">
          <ContaPagarFornecedorSection
            formData={formData}
            errors={errors}
            fornecedores={fornecedores}
            isEditing={isEditing}
            onFornecedorChange={onFornecedorChange}
            onShowFornecedorModal={onShowFornecedorModal}
            onTipoCriacaoChange={onTipoCriacaoChange}
          />
        </div>

        <div className="col-12">
          <ContaPagarVencimentoSection
            formData={formData}
            errors={errors}
            isEditing={isEditing}
            onFieldChange={onFieldChange}
            onClearError={onClearError}
          />
        </div>

        <div className="col-12">
          <ContaPagarValorTipoPagamentoSection
            formData={formData}
            errors={errors}
            onFieldChange={onFieldChange}
            onClearError={onClearError}
            onTipoPagamentoChange={onTipoPagamentoChange}
          />
        </div>

        <div className="col-12">
          <ContaPagarPixBoletoSection
            formData={formData}
            onFieldChange={onFieldChange}
          />
        </div>

        <div className="col-12">
          <ContaPagarDocumentoDescricaoSection
            formData={formData}
            onFieldChange={onFieldChange}
          />
        </div>
      </div>
    </form>
  );
};

export default ContaPagarFormContent;
