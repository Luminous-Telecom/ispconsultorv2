import React from 'react';
import { formatCPF } from '@/utils/formatters';
import { FormField } from '@/components/ui';
import { DadosEmpresaTabProps } from '../types';

const ResponsavelTab: React.FC<DadosEmpresaTabProps & { onAssinaturaChange: (file: File | null) => void }> = ({
  dados,
  onChange,
  isPending,
  onAssinaturaChange
}) => {
  const handleInputChange = (field: keyof typeof dados, value: string) => {
    let formattedValue = value;
    if (field === 'responsavel_cpf' && typeof value === 'string') {
      formattedValue = formatCPF(value);
    }
    onChange(field, formattedValue || '');
  };

  return (
    <div className="mb-0">
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

      {/* Assinatura do Responsável */}
      <div className="row mt-4 pt-3 border-top">
        <div className="col-md-12">
          <label htmlFor="assinatura" className="form-label small fw-bold">Assinatura do Responsável</label>
          <div className="d-flex align-items-start gap-3">
            <div style={{ minWidth: '200px' }}>
              {dados.responsavel_assinatura ? (
                <img 
                  src={dados.responsavel_assinatura} 
                  alt="Assinatura do responsável" 
                  style={{ maxWidth: '200px', maxHeight: '100px', objectFit: 'contain' }}
                  className="border rounded p-2 bg-light"
                />
              ) : (
                <div 
                  className="border rounded p-2 bg-light text-center text-secondary"
                  style={{ width: '200px', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <div>
                    <i className="bi bi-image" style={{ fontSize: '2rem' }}></i>
                    <div className="small">Sem assinatura</div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex-grow-1">
              <FormField
                name="assinatura"
                id="assinatura"
                type="file"
                value=""
                onChange={(value) => {
                  if (value instanceof File) {
                    onAssinaturaChange(value);
                  } else if (value === null) {
                    onAssinaturaChange(null);
                  }
                }}
                disabled={isPending}
                accept="image/png"
                helpText="Apenas arquivos PNG são permitidos (máx. 10MB)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResponsavelTab;

