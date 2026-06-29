import React, { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FormValue } from 'types/common';
import { useI18n } from 'contexts/I18nContext';
import FormField from '../ui/FormField';
import { ParametrosService } from 'services/parametrosService';
import { ClienteService } from 'services/clienteService';

interface AddressFieldsProps {
  prefix?: string;
  required?: boolean;
  size?: 'sm' | 'md' | 'lg';
  formData?: Record<string, FormValue>;
  onChange?: (name: string, value: FormValue) => void;
  errors?: Record<string, string>;
  /** Quando informado, usa estes parâmetros ao invés de buscar (útil no contexto SaaS) */
  parametrosOverride?: { validar_cep?: boolean };
}

const AddressFields: React.FC<AddressFieldsProps> = ({ 
  prefix = '', 
  required = false, 
  size = 'sm',
  formData = {},
  onChange,
  errors = {},
  parametrosOverride
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

  // Buscar parâmetros para verificar se deve buscar CEP automaticamente (ignorado se parametrosOverride)
  const { data: parametros } = useQuery({
    queryKey: ['parametros'],
    queryFn: () => ParametrosService.get(),
    staleTime: 60 * 1000,
    enabled: !parametrosOverride
  });

  const validarCep = parametrosOverride?.validar_cep ?? parametros?.data?.validar_cep ?? false;

  // Buscar CEP automaticamente quando o CEP tiver 8 dígitos
  const cepValue = getFieldValue('cep');
  const lastSearchedCep = useRef<string>('');
  const isSearching = useRef<boolean>(false);
  
  useEffect(() => {
    if (!validarCep) return;

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
        .catch(() => {
          isSearching.current = false;
          // Não resetar lastSearchedCep em caso de erro — manter para não re-tentar o mesmo CEP (evitar loop infinito)
        });
    } else if (cepNumbers.length !== 8) {
      // Reset quando o CEP não tem 8 dígitos
      lastSearchedCep.current = '';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cepValue, validarCep]);

  const addressFields = [
    {
      name: 'cep',
      label: t('form.zipCode'),
      placeholder: '00000-000',
      fieldRequired: true,
      validation: [
        { type: 'required', message: t('form.required') },
        { type: 'pattern', value: /^\d{5}-?\d{3}$/, message: t('form.invalidZipCode') }
      ]
    },
    {
      name: 'endereco',
      label: t('form.address'),
      placeholder: t('placeholder.street'),
      fieldRequired: true,
      validation: [
        { type: 'required', message: t('form.required') }
      ]
    },
    {
      name: 'numero',
      label: t('form.number'),
      placeholder: t('placeholder.number'),
      fieldRequired: true,
      validation: [
        { type: 'required', message: t('form.required') }
      ]
    },
    {
      name: 'complemento',
      label: t('form.complement'),
      placeholder: t('placeholder.complement'),
      fieldRequired: false,
      validation: []
    },
    {
      name: 'bairro',
      label: t('form.neighborhood'),
      placeholder: t('placeholder.neighborhood'),
      fieldRequired: true,
      validation: [
        { type: 'required', message: t('form.required') }
      ]
    },
    {
      name: 'cidade',
      label: t('form.city'),
      placeholder: t('placeholder.city'),
      fieldRequired: true,
      validation: [
        { type: 'required', message: t('form.required') }
      ]
    },
    {
      name: 'estado',
      label: t('form.state'),
      placeholder: t('placeholder.state'),
      fieldRequired: true,
      validation: [
        { type: 'required', message: t('form.required') },
        { type: 'minLength', value: 2, message: t('form.invalidState') },
        { type: 'maxLength', value: 2, message: t('form.invalidState') }
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

const getColumnClass = (_fieldName: string): string => 'col-12';

export default AddressFields;