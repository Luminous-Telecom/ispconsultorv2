import React from 'react';
import { FormValue } from 'types/common';
import { useI18n } from 'contexts/I18nContext';
import FormField from '../ui/FormField';

interface ContactFieldsProps {
  prefix?: string;
  required?: boolean;
  size?: 'sm' | 'md' | 'lg';
  includeWhatsApp?: boolean;
  includeCelular?: boolean;
  includeEmail?: boolean;
  formData?: Record<string, FormValue>;
  onChange?: (name: string, value: FormValue) => void;
  errors?: Record<string, string>;
}

const ContactFields: React.FC<ContactFieldsProps> = ({ 
  prefix = '', 
  required = false, 
  size = 'sm',
  includeWhatsApp = true,
  includeCelular = false,
  includeEmail = true,
  formData = {},
  onChange,
  errors = {}
}) => {
  const { t } = useI18n();
  const getFieldName = (field: string) => prefix ? `${prefix}_${field}` : field;
  const getFieldValue = (field: string) => formData[getFieldName(field)] || '';
  const getFieldError = (field: string) => errors[getFieldName(field)] || '';

  const handleChange = (field: string, value: FormValue) => {
    if (onChange) {
      onChange(getFieldName(field), value);
    }
  };

  const contactFields = [];

  // Email
  if (includeEmail) {
    contactFields.push({
      name: 'email',
      type: 'email' as const,
      label: t('form.email'),
      placeholder: t('placeholder.email'),
      fieldRequired: required,
      validation: required ? [
        { type: 'required', message: t('form.required') },
        { type: 'email', message: t('form.invalidEmail') }
      ] : [
        { type: 'email', message: t('form.invalidEmail') }
      ]
    });
  }

  // Telefone
  contactFields.push({
    name: 'telefone',
    type: 'tel' as const,
    label: t('form.phone'),
    placeholder: '(11) 99999-9999',
    fieldRequired: false,
    validation: [
      { type: 'pattern', value: /^\(\d{2}\)\s\d{4,5}-\d{4}$/, message: t('form.invalidPhone') }
    ]
  });

  if (includeCelular) {
    contactFields.push({
      name: 'celular',
      type: 'tel' as const,
      label: t('form.cell'),
      placeholder: '(11) 99999-9999',
      fieldRequired: false,
      validation: [
        { type: 'pattern', value: /^\(\d{2}\)\s\d{4,5}-\d{4}$/, message: t('form.invalidPhone') }
      ]
    });
  }

  // WhatsApp
  if (includeWhatsApp) {
    contactFields.push({
      name: 'whatsapp',
      type: 'tel' as const,
      label: t('form.whatsapp'),
      placeholder: '(11) 99999-9999',
      validation: [
        { type: 'pattern', value: /^\(\d{2}\)\s\d{4,5}-\d{4}$/, message: t('form.invalidWhatsApp') }
      ]
    });
  }

  return (
    <div className="row g-2">
      {contactFields.map((field) => (
        <div key={field.name} className="col-12">
          <FormField
            name={getFieldName(field.name)}
            type={field.type}
            label={field.label}
            placeholder={field.placeholder}
            required={field.fieldRequired ?? required}
            size={size}
            value={getFieldValue(field.name)}
            onChange={(value) => handleChange(field.name, value)}
            error={getFieldError(field.name)}
            isInvalid={!!getFieldError(field.name)}
          />
        </div>
      ))}
    </div>
  );
};

export default ContactFields;