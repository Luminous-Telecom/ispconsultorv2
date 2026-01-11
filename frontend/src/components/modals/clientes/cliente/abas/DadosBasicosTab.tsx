import React from 'react';
import { FormValue } from '@/types/common';
import FormField from '@/components/ui/FormField';
import { ClienteTabProps } from '../types';

const DadosBasicosTab: React.FC<ClienteTabProps> = ({
  formData,
  errors,
  handleInputChange,
  isSubmitting,
  formPrefix
}) => {
  return (
    <div className="d-flex flex-column gap-2">
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
  );
};

export default DadosBasicosTab;

