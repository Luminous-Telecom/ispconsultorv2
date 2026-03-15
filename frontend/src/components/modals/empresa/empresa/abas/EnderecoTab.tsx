import React from 'react';
import { FormValue } from 'types/common';
import { formatCEP } from 'utils/formatters';
import { AddressFields } from 'components/forms';
import { DadosEmpresaTabProps } from '../types';

interface EnderecoTabProps extends DadosEmpresaTabProps {
  parametrosOverride?: { validar_cep?: boolean };
}

const EnderecoTab: React.FC<EnderecoTabProps> = ({
  dados,
  onChange,
  isPending: _isPending,
  parametrosOverride
}) => {
  const handleChange = (name: string, value: FormValue) => {
    let formattedValue = value;
    if (name === 'cep' && typeof value === 'string') {
      formattedValue = formatCEP(value);
    }
    onChange(name as keyof typeof dados, String(formattedValue ?? ''));
  };

  return (
    <div className="mb-0">
      <AddressFields 
        required={false}
        size="md"
        formData={dados as unknown as Record<string, FormValue>}
        onChange={handleChange}
        errors={{}}
        parametrosOverride={parametrosOverride}
      />
    </div>
  );
};

export default EnderecoTab;

