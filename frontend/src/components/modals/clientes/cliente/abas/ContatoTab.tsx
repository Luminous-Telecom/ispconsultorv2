import React from 'react';
import { FormValue } from '@/types/common';
import { useI18n } from '@/contexts/I18nContext';
import FormField from '@/components/ui/FormField';
import ContactFields from '@/components/forms/ContactFields';
import { ClienteTabProps } from '../types';

const ContatoTab: React.FC<ClienteTabProps> = ({
  formData,
  errors,
  handleInputChange,
  formPrefix
}) => {
  const { t } = useI18n();
  return (
    <div className="d-flex flex-column gap-2">
      <ContactFields
        required={true}
        size="md"
        includeEmail={true}
        includeWhatsApp={true}
        formData={formData as unknown as Record<string, FormValue>}
        onChange={(name: string, value: FormValue) => {
          const normalizedValue = typeof value === 'string' ? value : (typeof value === 'number' ? value : (typeof value === 'boolean' ? value : String(value || '')));
          handleInputChange(name as keyof typeof formData, normalizedValue as string | number | boolean);
        }}
        errors={errors as unknown as Record<string, string>}
      />

      <div>
        <h6 className="text-primary mb-2">{t('tabs.communicationPreferences')}</h6>

        <div className="d-flex flex-column gap-2">
          <FormField
            name="recebe_email"
            type="checkbox"
            label={t('form.receivesEmail')}
            value={formData.recebe_email}
            onChange={(value: FormValue) => handleInputChange('recebe_email', value as boolean)}
            formPrefix={formPrefix}
          />

          <FormField
            name="recebe_whatsapp"
            type="checkbox"
            label={t('form.receivesWhatsApp')}
            value={formData.recebe_whatsapp}
            onChange={(value: FormValue) => handleInputChange('recebe_whatsapp', value as boolean)}
            formPrefix={formPrefix}
          />
        </div>
      </div>
    </div>
  );
};

export default ContatoTab;

