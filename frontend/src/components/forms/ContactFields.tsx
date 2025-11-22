import React from 'react';
import { FormValue } from '@/types/common';
import FormField from '../ui/FormField';

interface ContactFieldsProps {
  prefix?: string;
  required?: boolean;
  size?: 'sm' | 'md' | 'lg';
  includeWhatsApp?: boolean;
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
  includeEmail = true,
  formData = {},
  onChange,
  errors = {}
}) => {
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
      label: 'Email',
      placeholder: 'email@empresa.com',
      validation: required ? [
        { type: 'required', message: 'Email é obrigatório' },
        { type: 'email', message: 'Email inválido' }
      ] : [
        { type: 'email', message: 'Email inválido' }
      ]
    });
  }

  // Telefone
  contactFields.push({
    name: 'telefone',
    type: 'tel' as const,
    label: 'Telefone',
    placeholder: '(11) 99999-9999',
    validation: required ? [
      { type: 'required', message: 'Telefone é obrigatório' },
      { type: 'pattern', value: /^\(\d{2}\)\s\d{4,5}-\d{4}$/, message: 'Telefone inválido' }
    ] : [
      { type: 'pattern', value: /^\(\d{2}\)\s\d{4,5}-\d{4}$/, message: 'Telefone inválido' }
    ]
  });

  // WhatsApp
  if (includeWhatsApp) {
    contactFields.push({
      name: 'whatsapp',
      type: 'tel' as const,
      label: 'WhatsApp',
      placeholder: '(11) 99999-9999',
      validation: [
        { type: 'pattern', value: /^\(\d{2}\)\s\d{4,5}-\d{4}$/, message: 'WhatsApp inválido' }
      ]
    });
  }

  return (
    <div className="row g-2">
      {contactFields.map((field) => (
        <div key={field.name} className="col-md-6">
          <FormField
            name={getFieldName(field.name)}
            type={field.type}
            label={field.label}
            placeholder={field.placeholder}
            required={required}
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