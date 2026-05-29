import React from 'react';
import FormField from 'components/ui/FormField';
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
  <div className="d-flex flex-column gap-2">
    <div>
      <label className="form-label">
        {personTypeLabel}:
        <span className="text-danger ms-1">*</span>
      </label>
      <div className="d-flex gap-3 mt-2">
        <div className="form-check">
          <input
            className="form-check-input"
            type="radio"
            name={`${formPrefix}-tipo_pessoa`}
            id={`${formPrefix}-tipo_pessoa_fisica`}
            value="FISICA"
            checked={formData.tipo_pessoa === 'FISICA'}
            onChange={() => onTipoPessoaChange('FISICA')}
          />
          <label className="form-check-label" htmlFor={`${formPrefix}-tipo_pessoa_fisica`}>
            {personTypePhysicalLabel}
          </label>
        </div>
        <div className="form-check">
          <input
            className="form-check-input"
            type="radio"
            name={`${formPrefix}-tipo_pessoa`}
            id={`${formPrefix}-tipo_pessoa_juridica`}
            value="JURIDICA"
            checked={formData.tipo_pessoa === 'JURIDICA'}
            onChange={() => onTipoPessoaChange('JURIDICA')}
          />
          <label className="form-check-label" htmlFor={`${formPrefix}-tipo_pessoa_juridica`}>
            {personTypeLegalLabel}
          </label>
        </div>
      </div>
      {errors.tipo_pessoa && <div className="form-text text-danger">{errors.tipo_pessoa}</div>}
    </div>

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
    />

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
);

export default FornecedorModalDadosBasicosTab;
