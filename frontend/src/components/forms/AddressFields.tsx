import React from 'react';
import FormFieldWrapper from './FormFieldWrapper';
import { FieldConfig } from './types';

interface AddressFieldsProps {
  prefix?: string;
  required?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const AddressFields: React.FC<AddressFieldsProps> = ({ 
  prefix = '', 
  required = false, 
  size = 'sm' 
}) => {
  const getFieldName = (field: string) => prefix ? `${prefix}_${field}` : field;

  const addressFields: FieldConfig[] = [
    {
      name: getFieldName('cep'),
      type: 'text',
      label: 'CEP',
      placeholder: '00000-000',
      required,
      size,
      validation: required ? [
        { type: 'required', message: 'CEP é obrigatório' },
        { type: 'pattern', value: /^\d{5}-?\d{3}$/, message: 'CEP inválido' }
      ] : [
        { type: 'pattern', value: /^\d{5}-?\d{3}$/, message: 'CEP inválido' }
      ]
    },
    {
      name: getFieldName('endereco'),
      type: 'text',
      label: 'Endereço',
      placeholder: 'Rua, Avenida...',
      required,
      size,
      validation: required ? [
        { type: 'required', message: 'Endereço é obrigatório' }
      ] : []
    },
    {
      name: getFieldName('numero'),
      type: 'text',
      label: 'Número',
      placeholder: '123',
      required,
      size,
      validation: required ? [
        { type: 'required', message: 'Número é obrigatório' }
      ] : []
    },
    {
      name: getFieldName('complemento'),
      type: 'text',
      label: 'Complemento',
      placeholder: 'Apto, Sala...',
      size
    },
    {
      name: getFieldName('bairro'),
      type: 'text',
      label: 'Bairro',
      placeholder: 'Nome do bairro',
      required,
      size,
      validation: required ? [
        { type: 'required', message: 'Bairro é obrigatório' }
      ] : []
    },
    {
      name: getFieldName('cidade'),
      type: 'text',
      label: 'Cidade',
      placeholder: 'Nome da cidade',
      required,
      size,
      validation: required ? [
        { type: 'required', message: 'Cidade é obrigatória' }
      ] : []
    },
    {
      name: getFieldName('estado'),
      type: 'text',
      label: 'Estado',
      placeholder: 'SP',
      required,
      size,
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
          <FormFieldWrapper
            field={field}
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
