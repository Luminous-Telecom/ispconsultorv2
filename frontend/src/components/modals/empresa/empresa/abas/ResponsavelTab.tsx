import React from 'react';
import { formatCPF } from '@/utils/formatters';
import { FormField } from '@/components/ui';
import { DadosEmpresaTabProps } from '../types';

const ResponsavelTab: React.FC<DadosEmpresaTabProps> = ({
  dados,
  onChange,
  isPending
}) => {
  const handleInputChange = (field: keyof typeof dados, value: string) => {
    let formattedValue = value;
    if (field === 'responsavel_cpf' && typeof value === 'string') {
      formattedValue = formatCPF(value);
    }
    onChange(field, formattedValue || '');
  };

  return (
    <div className="mb-2">
      <div className="row">
        <div className="col-md-4">
          <FormField
            name="responsavel_nome"
            type="text"
            label="Nome"
            placeholder="Nome do responsável"
            size="md"
            value={dados.responsavel_nome}
            onChange={(value) => handleInputChange('responsavel_nome', String(value ?? ''))}
            disabled={isPending}
          />
        </div>
        <div className="col-md-4">
          <FormField
            name="responsavel_cpf"
            type="text"
            label="CPF"
            placeholder="000.000.000-00"
            size="md"
            value={dados.responsavel_cpf}
            onChange={(value) => handleInputChange('responsavel_cpf', String(value ?? ''))}
            disabled={isPending}
          />
        </div>
        <div className="col-md-4">
          <FormField
            name="responsavel_cargo"
            type="text"
            label="Cargo"
            placeholder="Cargo do responsável"
            size="md"
            value={dados.responsavel_cargo}
            onChange={(value) => handleInputChange('responsavel_cargo', String(value ?? ''))}
            disabled={isPending}
          />
        </div>
      </div>
    </div>
  );
};

export default ResponsavelTab;

