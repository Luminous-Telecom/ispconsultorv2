import React from 'react';
import { FormValue } from 'types/common';
import { useI18n } from 'contexts/I18nContext';
import FormField from 'components/ui/FormField';
import AtivoInativoField from 'components/ui/AtivoInativoField';
import { ClienteTabProps } from '../types';

const DadosBasicosTab: React.FC<ClienteTabProps> = ({
  formData,
  errors,
  handleInputChange,
  isSubmitting,
  formPrefix
}) => {
  const { t } = useI18n();
  return (
    <div className="row g-2">
      <div className="col-12">
        <FormField
          name="cnpj"
        type="text"
        label={t('form.cnpj')}
        placeholder={t('placeholder.cnpj')}
        required={true}
        size="md"
        value={formData.cnpj || ''}
        onChange={(value: FormValue) => handleInputChange('cnpj', value as string)}
        disabled={isSubmitting}
        formPrefix={formPrefix}
        error={errors.cnpj}
        />
      </div>
      <div className="col-12">
        <FormField
          name="razao_social"
        type="text"
        label={t('form.companyName')}
        placeholder={t('placeholder.companyName')}
        required={true}
        size="md"
        value={formData.razao_social || ''}
        onChange={(value: FormValue) => handleInputChange('razao_social', value as string)}
        disabled={isSubmitting}
        formPrefix={formPrefix}
        error={errors.razao_social}
        />
      </div>
      <div className="col-12">
        <FormField
          name="nome_fantasia"
        type="text"
        label={t('form.tradeName')}
        placeholder={t('placeholder.tradeName')}
        size="md"
        value={formData.nome_fantasia || ''}
        onChange={(value: FormValue) => handleInputChange('nome_fantasia', value as string)}
        disabled={isSubmitting}
        formPrefix={formPrefix}
        error={errors.nome_fantasia}
        />
      </div>
      <div className="col-12">
        <AtivoInativoField
        value={formData.ativo}
        onChange={(v) => handleInputChange('ativo', v)}
        name={formPrefix ? `${formPrefix}-ativo` : 'cliente-ativo'}
        disabled={isSubmitting}
        />
      </div>
    </div>
  );
};

export default DadosBasicosTab;

