import React from 'react';
import { FormValue } from 'types/common';
import { useI18n } from 'contexts/I18nContext';
import FormField from 'components/ui/FormField';
import { ClienteTabProps } from '../types';

const ObservacoesTab: React.FC<ClienteTabProps> = ({
  formData,
  errors,
  handleInputChange,
  formPrefix
}) => {
  const { t } = useI18n();
  return (
    <div className="row g-2">
      <div className="col-12">
        <FormField
          name="observacoes"
          type="textarea"
          label={t('form.observations')}
          placeholder={t('placeholder.observations')}
          size="md"
          value={formData.observacoes || ''}
          onChange={(value: FormValue) => handleInputChange('observacoes', value as string)}
          formPrefix={formPrefix}
          error={errors.observacoes}
          rows={8}
        />
      </div>
    </div>
  );
};

export default ObservacoesTab;

