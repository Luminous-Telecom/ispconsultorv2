import React from 'react';
import FormField from '../ui/FormField';

interface AddressFieldsProps {
  prefix?: string;
  required?: boolean;
  size?: 'sm' | 'md' | 'lg';
  formData?: Record<string, any>;
  onChange?: (name: string, value: any) => void;
  errors?: Record<string, any>;
}

const AddressFields: React.FC<AddressFieldsProps> = ({ 
  prefix = '', 
  required = false, 
  size = 'sm',
  formData = {},
  onChange,
  errors = {}
}) => {
  const getFieldName = (field: string) => prefix ? `${prefix}_${field}` : field;
  const getFieldValue = (field: string) => formData[getFieldName(field)] || '';
  const getFieldError = (field: string) => errors[getFieldName(field)] || '';

  const handleChange = (field: string, value: any) => {
    if (onChange) {
      onChange(getFieldName(field), value);
    }
  };

  const addressFields = [
    {
      name: 'cep',
      label: 'CEP',
      placeholder: '00000-000',
      validation: required ? [
        { type: 'required', message: 'CEP é obrigatório' },
        { type: 'pattern', value: /^\d{5}-?\d{3}$/, message: 'CEP inválido' }
      ] : [
        { type: 'pattern', value: /^\d{5}-?\d{3}$/, message: 'CEP inválido' }
      ]
    },
    {
      name: 'endereco',
      label: 'Endereço',
      placeholder: 'Rua, Avenida...',
      validation: required ? [
        { type: 'required', message: 'Endereço é obrigatório' }
      ] : []
    },
    {
      name: 'numero',
      label: 'Número',
      placeholder: '123',
      validation: required ? [
        { type: 'required', message: 'Número é obrigatório' }
      ] : []
    },
    {
      name: 'complemento',
      label: 'Complemento',
      placeholder: 'Apto, Sala...',
      validation: []
    },
    {
      name: 'bairro',
      label: 'Bairro',
      placeholder: 'Nome do bairro',
      validation: required ? [
        { type: 'required', message: 'Bairro é obrigatório' }
      ] : []
    },
    {
      name: 'cidade',
      label: 'Cidade',
      placeholder: 'Nome da cidade',
      validation: required ? [
        { type: 'required', message: 'Cidade é obrigatória' }
      ] : []
    },
    {
      name: 'estado',
      label: 'Estado',
      placeholder: 'SP',
      validation: required ? [
        { type: 'required', message: 'Estado é obrigatório' },
        { type: 'minLength', value: 2, message: 'Estado deve ter pelo menos 2 caracteres' },
        { type: 'maxLength', value: 2, message: 'Estado deve ter no máximo 2 caracteres' }
      ] : [
        { type: 'minLength', value: 2, message: 'Estado deve ter pelo menos 2 caracteres' },
        { type: 'maxLength', value: 2, message: 'Estado deve ter no máximo 2 caracteres' }
      ]
    }
  ];

  return (
    <div className="row g-2">
      {addressFields.map((field) => (
        <div key={field.name} className={getColumnClass(field.name)}>
          <FormField
            name={getFieldName(field.name)}
            type="text"
            label={field.label}
            placeholder={field.placeholder}
            required={required}
            size={size}
            value={getFieldValue(field.name)}
            onChange={(e) => handleChange(field.name, e.value)}
            error={getFieldError(field.name)}
            isInvalid={!!getFieldError(field.name)}
          />
        </div>
      ))}
    </div>
  );
};

const getColumnClass = (fieldName: string): string => {
  // CEP e Estado em colunas menores
  if (fieldName.includes('cep') || fieldName.includes('estado')) {
    return 'col-md-3';
  }
  // Número e Complemento em colunas menores
  if (fieldName.includes('numero') || fieldName.includes('complemento')) {
    return 'col-md-3';
  }
  // Endereço, Bairro e Cidade ocupam mais espaço
  return 'col-md-6';
};

export default AddressFields;