import React from 'react';
import { formatPhone } from '@/utils/formatters';
import { FormField } from '@/components/ui';
import { DadosEmpresaTabProps } from '../types';

const ContatoTab: React.FC<DadosEmpresaTabProps> = ({
  dados,
  onChange,
  isPending
}) => {
  const handleInputChange = (field: keyof typeof dados, value: string) => {
    let formattedValue = value;
    if ((field === 'telefone' || field === 'celular') && typeof value === 'string') {
      formattedValue = formatPhone(value);
    }
    onChange(field, formattedValue || '');
  };

  return (
    <div className="mb-0">
      <div className="row">
        <div className="col-md-4">
          <FormField
            name="telefone"
            type="tel"
            label="Telefone"
            placeholder="(11) 3333-4444"
            size="md"
            value={dados.telefone}
            onChange={(value) => handleInputChange('telefone', String(value ?? ''))}
            disabled={isPending}
          />
        </div>
        <div className="col-md-4">
          <FormField
            name="celular"
            type="tel"
            label="Celular"
            placeholder="(11) 99999-9999"
            size="md"
            value={dados.celular}
            onChange={(value) => handleInputChange('celular', String(value ?? ''))}
            disabled={isPending}
          />
        </div>
        <div className="col-md-4">
          <FormField
            name="email"
            type="email"
            label="E-mail"
            placeholder="email@empresa.com"
            size="md"
            value={dados.email}
            onChange={(value) => handleInputChange('email', String(value ?? ''))}
            disabled={isPending}
          />
        </div>
      </div>

      <div className="row">
        <div className="col-md-12">
          <FormField
            name="site"
            type="url"
            label="Site"
            placeholder="https://www.empresa.com"
            size="md"
            value={dados.site}
            onChange={(value) => handleInputChange('site', String(value ?? ''))}
            disabled={isPending}
          />
        </div>
      </div>
    </div>
  );
};

export default ContatoTab;

