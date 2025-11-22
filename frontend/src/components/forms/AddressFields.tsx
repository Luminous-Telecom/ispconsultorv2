import React, { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FormValue } from '@/types/common';
import FormField from '../ui/FormField';
import { ParametrosService } from '@/services/parametrosService';
import { ClienteService } from '@/services/clienteService';

interface AddressFieldsProps {
  prefix?: string;
  required?: boolean;
  size?: 'sm' | 'md' | 'lg';
  formData?: Record<string, FormValue>;
  onChange?: (name: string, value: FormValue) => void;
  errors?: Record<string, string>;
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

  const handleChange = (field: string, value: FormValue) => {
    if (onChange) {
      onChange(getFieldName(field), value);
    }
  };

  // Buscar parâmetros para verificar se deve buscar CEP automaticamente
  const { data: parametros } = useQuery({
    queryKey: ['parametros'],
    queryFn: () => ParametrosService.get(),
    staleTime: 60 * 1000,
  });

  // Buscar CEP automaticamente quando o CEP tiver 8 dígitos
  const cepValue = getFieldValue('cep');
  const lastSearchedCep = useRef<string>('');
  const isSearching = useRef<boolean>(false);
  
  useEffect(() => {
    // Verificar se a opção de validar CEP está marcada
    if (!parametros?.data?.validar_cep) {
      return;
    }

    const cep = typeof cepValue === 'string' ? cepValue : String(cepValue || '');
    const cepNumbers = cep.replace(/\D/g, '');
    
    // Evitar requisições duplicadas
    if (cepNumbers.length === 8 && cepNumbers !== lastSearchedCep.current && !isSearching.current) {
      isSearching.current = true;
      lastSearchedCep.current = cepNumbers;
      
      // Buscar endereço via backend (centralizado)
      ClienteService.buscarCep(cepNumbers)
        .then((data) => {
          if (data && onChange) {
            // Preencher campos automaticamente
            if (data.logradouro) onChange(getFieldName('endereco'), data.logradouro);
            if (data.bairro) onChange(getFieldName('bairro'), data.bairro);
            if (data.localidade) onChange(getFieldName('cidade'), data.localidade);
            if (data.uf) onChange(getFieldName('estado'), data.uf);
          }
          isSearching.current = false;
        })
        .catch(error => {
          console.error('Erro ao buscar CEP:', error);
          isSearching.current = false;
          lastSearchedCep.current = '';
        });
    } else if (cepNumbers.length !== 8) {
      // Reset quando o CEP não tem 8 dígitos
      lastSearchedCep.current = '';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cepValue, parametros?.data?.validar_cep]);

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