import React from 'react';
import { FormValue } from '@/types/common';
import { useI18n } from '@/contexts/I18nContext';
import FormField from '@/components/ui/FormField';
import { PlanoTabProps } from '../types';

const ServicosObservacoesTab: React.FC<PlanoTabProps> = ({
  formData,
  handleInputChange,
  isSubmitting
}) => {
  const { t } = useI18n();
  return (
    <>
      <div className="mb-0">
        <FormField
          name="observacoes"
          type="textarea"
          label={t('form.observations')}
          placeholder={t('form.planObservationsPlaceholder')}
          size="sm"
          value={formData.observacoes}
          onChange={(value: FormValue) => {
            const stringValue = typeof value === 'string' ? value : String(value || '');
            handleInputChange('observacoes', stringValue);
          }}
          disabled={isSubmitting}
          rows={4}
        />
      </div>
    </>
  );
};

export default ServicosObservacoesTab;

