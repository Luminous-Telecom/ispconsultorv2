import React, { useEffect } from 'react';
import FormField from '../ui/FormField';

interface AddressFieldsProps {
  prefix?: string;
  required?: boolean;
  size?: 'sm' | 'md' | 'lg';
  formData?: Record<string, any>;
  onChange?: (name: string, value: any) => void;
  errors?: Record<string, any>;
}

interface ViaCEPResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
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

  // Buscar CEP automaticamente quando o CEP tiver 8 dígitos
  useEffect(() => {
    const cep = getFieldValue('cep');
    const cepNumbers = cep.replace(/\D/g, '');
    
    if (cepNumbers.length === 8) {
      // Buscar endereço via API ViaCEP
      fetch(`https://viacep.com.br/ws/${cepNumbers}/json/`)
        .then(response => response.json())
        .then((data: ViaCEPResponse) => {
          if (!data.erro) {
            // Preencher campos automaticamente
            if (onChange) {
              if (data.logradouro) onChange(getFieldName('endereco'), data.logradouro);
              if (data.bairro) onChange(getFieldName('bairro'), data.bairro);
              if (data.localidade) onChange(getFieldName('cidade'), data.localidade);
              if (data.uf) onChange(getFieldName('estado'), data.uf);
            }
          }
        })
        .catch(error => {
          console.error('Erro ao buscar CEP:', error);
        });
    }
  }, [getFieldValue('cep'), onChange, prefix]);

  const addressFields = [
    {
      name: 'cep',
      label: 'CEP',
      placeholder: '00000-000',
      fieldRequired: true,
      validation: [
        { type: 'required', message: 'CEP é obrigatório' },
        { type: 'pattern', value: /^\d{5}-?\d{3}$/, message: 'CEP inválido' }
      ]
    },
    {
      name: 'endereco',
      label: 'Endereço',
      placeholder: 'Rua, Avenida...',
      fieldRequired: true,
      validation: [
        { type: 'required', message: 'Endereço é obrigatório' }
      ]
    },
    {
      name: 'numero',
      label: 'Número',
      placeholder: '123',
      fieldRequired: true,
      validation: [
        { type: 'required', message: 'Número é obrigatório' }
      ]
    },
    {
      name: 'complemento',
      label: 'Complemento',
      placeholder: 'Apto, Sala...',
      fieldRequired: false,
      validation: []
    },
    {
      name: 'bairro',
      label: 'Bairro',
      placeholder: 'Nome do bairro',
      fieldRequired: true,
      validation: [
        { type: 'required', message: 'Bairro é obrigatório' }
      ]
    },
    {
      name: 'cidade',
      label: 'Cidade',
      placeholder: 'Nome da cidade',
      fieldRequired: true,
      validation: [
        { type: 'required', message: 'Cidade é obrigatória' }
      ]
    },
    {
      name: 'estado',
      label: 'Estado',
      placeholder: 'SP',
      fieldRequired: true,
      validation: [
        { type: 'required', message: 'Estado é obrigatório' },
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
            required={field.fieldRequired !== undefined ? field.fieldRequired : required}
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