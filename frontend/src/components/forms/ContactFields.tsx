import React from 'react';
import FormFieldWrapper from './FormFieldWrapper';
import { FieldConfig } from './types';

interface ContactFieldsProps {
  prefix?: string;
  required?: boolean;
  size?: 'sm' | 'md' | 'lg';
  includeWhatsApp?: boolean;
  includeEmail?: boolean;
}

const ContactFields: React.FC<ContactFieldsProps> = ({ 
  prefix = '', 
  required = false, 
  size = 'sm',
  includeWhatsApp = true,
  includeEmail = true
}) => {
  const getFieldName = (field: string) => prefix ? `${prefix}_${field}` : field;

  const contactFields: FieldConfig[] = [];

  // Email
  if (includeEmail) {
    contactFields.push({
      name: getFieldName('email'),
      type: 'email',
      label: 'Email',
      placeholder: 'email@empresa.com',
      required,
      size,
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
    name: getFieldName('telefone'),
    type: 'tel',
    label: 'Telefone',
    placeholder: '(11) 99999-9999',
    required,
    size,
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
      name: getFieldName('whatsapp'),
      type: 'tel',
      label: 'WhatsApp',
      placeholder: '(11) 99999-9999',
      size,
      validation: [
        { type: 'pattern', value: /^\(\d{2}\)\s\d{4,5}-\d{4}$/, message: 'WhatsApp inválido' }
      ]
    });
  }

  return (
    <div className="row g-2">
      {contactFields.map((field) => (
        <div key={field.name} className="col-md-6">
          <FormFieldWrapper
            field={field}
          />
        </div>
      ))}
    </div>
  );
};

export default ContactFields;
