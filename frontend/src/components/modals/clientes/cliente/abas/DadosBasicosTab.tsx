import React from 'react';
import FormField from '../../../../ui/FormField';
import { ClienteTabProps } from '../types';
import { FormValue } from '../../../../../types/common';

const DadosBasicosTab: React.FC<ClienteTabProps> = ({
  formData,
  errors,
  handleInputChange,
  isSubmitting,
  formPrefix
}) => {
  return (
    <div className="row">
      <div className="col-md-4">
        <FormField
          name="cnpj"
          type="text"
          label="CNPJ"
          placeholder="00.000.000/0000-00"
          required={true}
          size="md"
          value={formData.cnpj || ''}
          onChange={(value: FormValue) => handleInputChange('cnpj', value as string)}
          disabled={isSubmitting}
          formPrefix={formPrefix}
          error={errors.cnpj}
        />
      </div>
      <div className="col-md-8">
        <FormField
          name="razao_social"
          type="text"
          label="Razão Social"
          placeholder="Razão social da empresa"
          required={true}
          size="md"
          value={formData.razao_social || ''}
          onChange={(value: FormValue) => handleInputChange('razao_social', value as string)}
          disabled={isSubmitting}
          formPrefix={formPrefix}
          error={errors.razao_social}
        />
      </div>
      <div className="col-md-6">
        <FormField
          name="nome_fantasia"
          type="text"
          label="Nome Fantasia"
          placeholder="Nome fantasia da empresa"
          size="md"
          value={formData.nome_fantasia || ''}
          onChange={(value: FormValue) => handleInputChange('nome_fantasia', value as string)}
          disabled={isSubmitting}
          formPrefix={formPrefix}
          error={errors.nome_fantasia}
        />
      </div>
      <div className="col-md-6">
        <FormField
          name="ativo"
          type="checkbox"
          label="Cliente Ativo"
          value={formData.ativo}
          onChange={(value: FormValue) => handleInputChange('ativo', value as boolean)}
          disabled={isSubmitting}
          formPrefix={formPrefix}
        />
      </div>
    </div>
  );
};

export default DadosBasicosTab;

