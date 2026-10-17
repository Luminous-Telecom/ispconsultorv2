import React from 'react';
import { AtivoInativoField, CartaoCnpjButton, FormField } from 'components/ui';
import { openCartaoCnpj } from 'utils/cartaoCnpj';
import { FornecedorFormData, FornecedorFormErrors } from './types';

interface FornecedorModalDadosBasicosTabProps {
  formData: FornecedorFormData;
  errors: FornecedorFormErrors;
  formPrefix: string;
  personTypeLabel: string;
  personTypePhysicalLabel: string;
  personTypeLegalLabel: string;
  cpfLabel: string;
  cnpjLabel: string;
  cnpjPlaceholder: string;
  nameLabel: string;
  companyNameLabel: string;
  tradeNameLabel: string;
  onInputChange: (field: keyof FornecedorFormData, value: string) => void;
  onTipoPessoaChange: (tipoPessoa: 'FISICA' | 'JURIDICA') => void;
}

const FornecedorModalDadosBasicosTab: React.FC<FornecedorModalDadosBasicosTabProps> = ({
  formData,
  errors,
  formPrefix,
  personTypeLabel,
  personTypePhysicalLabel,
  personTypeLegalLabel,
  cpfLabel,
  cnpjLabel,
  cnpjPlaceholder,
  nameLabel,
  companyNameLabel,
  tradeNameLabel,
  onInputChange,
  onTipoPessoaChange,
}) => (
  <div className="row g-2">
    <div className="col-12">
      <AtivoInativoField
        value={formData.tipo_pessoa === 'FISICA'}
        onChange={(value) => onTipoPessoaChange(value ? 'FISICA' : 'JURIDICA')}
        label={personTypeLabel}
        trueLabel={personTypePhysicalLabel}
        falseLabel={personTypeLegalLabel}
        name={`${formPrefix}-tipo-pessoa`}
        required
      />
    </div>

    <div className="col-12">
      <FormField
        name="cpf_cnpj"
        type="text"
        label={formData.tipo_pessoa === 'FISICA' ? cpfLabel : cnpjLabel}
        value={formData.cpf_cnpj}
        onChange={(value) => onInputChange('cpf_cnpj', value as string)}
        placeholder={formData.tipo_pessoa === 'FISICA' ? '000.000.000-00' : cnpjPlaceholder}
        required
        error={errors.cpf_cnpj}
        formPrefix={formPrefix}
        leading={formData.tipo_pessoa === 'JURIDICA' ? <CartaoCnpjButton type="button" onClick={openCartaoCnpj} /> : undefined}
      />
    </div>

    <div className="col-12">
      <FormField
        name="nome_razao_social"
        type="text"
        label={formData.tipo_pessoa === 'FISICA' ? nameLabel : companyNameLabel}
        value={formData.nome_razao_social}
        onChange={(value) => onInputChange('nome_razao_social', value as string)}
        required
        error={errors.nome_razao_social}
        formPrefix={formPrefix}
      />
    </div>

    <div className="col-12">
      <FormField
        name="nome_fantasia"
        type="text"
        label={tradeNameLabel}
        value={formData.nome_fantasia}
        onChange={(value) => onInputChange('nome_fantasia', value as string)}
        error={errors.nome_fantasia}
        formPrefix={formPrefix}
      />
    </div>
  </div>
);

export default FornecedorModalDadosBasicosTab;
