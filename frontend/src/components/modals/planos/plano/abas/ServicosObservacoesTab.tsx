import React from 'react';
import { FormValue } from 'types/common';
import { useI18n } from 'contexts/I18nContext';
import FormField from 'components/ui/FormField';
import { PlanoTabProps } from '../types';

const ServicosObservacoesTab: React.FC<PlanoTabProps> = ({
  formData,
  handleInputChange,
  isSubmitting
}) => {
  const { t } = useI18n();
  return (
    <div className="row g-2">
      <div className="col-12">
        <FormField
          name="observacoes"
          type="textarea"
          label={t('form.observations')}
          placeholder={t('form.planObservationsPlaceholder')}
          size="md"
          value={formData.observacoes}
          onChange={(value: FormValue) => {
            const stringValue = typeof value === 'string' ? value : String(value || '');
            handleInputChange('observacoes', stringValue);
          }}
          disabled={isSubmitting}
          rows={4}
        />
      </div>
    </div>
  );
};

export default ServicosObservacoesTab;

