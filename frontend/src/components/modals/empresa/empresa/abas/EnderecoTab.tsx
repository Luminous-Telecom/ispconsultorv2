import React from 'react';
import { AddressFields } from '../../../../forms';
import { DadosEmpresaTabProps } from '../types';
import { FormValue } from '../../../../../types/common';
import { formatCEP } from '../../../../../utils/formatters';

const EnderecoTab: React.FC<DadosEmpresaTabProps> = ({
  dados,
  onChange,
  isPending: _isPending
}) => {
  const handleChange = (name: string, value: FormValue) => {
    let formattedValue = value;
    if (name === 'cep' && typeof value === 'string') {
      formattedValue = formatCEP(value);
    }
    onChange(name as keyof typeof dados, String(formattedValue ?? ''));
  };

  return (
    <div className="mb-4">
      <AddressFields 
        required={false}
        size="md"
        formData={dados as unknown as Record<string, FormValue>}
        onChange={handleChange}
        errors={{}}
      />
    </div>
  );
};

export default EnderecoTab;

