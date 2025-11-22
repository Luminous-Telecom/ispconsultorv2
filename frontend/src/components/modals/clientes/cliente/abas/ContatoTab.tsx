import React from 'react';
import { FormValue } from '@/types/common';
import FormField from '../../../../ui/FormField';
import ContactFields from '../../../../forms/ContactFields';
import { ClienteTabProps } from '../types';

const ContatoTab: React.FC<ClienteTabProps> = ({
  formData,
  errors,
  handleInputChange,
  formPrefix
}) => {
  return (
    <div className="row">
      <div className="col-md-8">
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
      </div>
      
      <div className="col-md-4">
        <h6 className="text-primary mb-3">Preferências de Comunicação</h6>
        
        <div className="mb-3">
          <FormField
            name="recebe_email"
            type="checkbox"
            label="Recebe Email"
            value={formData.recebe_email}
            onChange={(value: FormValue) => handleInputChange('recebe_email', value as boolean)}
            formPrefix={formPrefix}
          />
        </div>

        <div className="mb-3">
          <FormField
            name="recebe_sms"
            type="checkbox"
            label="Recebe SMS"
            value={formData.recebe_sms}
            onChange={(value: FormValue) => handleInputChange('recebe_sms', value as boolean)}
            formPrefix={formPrefix}
          />
        </div>

        <div className="mb-3">
          <FormField
            name="recebe_whatsapp"
            type="checkbox"
            label="Recebe WhatsApp"
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

