import React from 'react';
import { formatCNPJ } from '@/utils/formatters';
import { FormField } from '@/components/ui';
import { DadosEmpresaTabProps } from '../types';

const DadosBasicosTab: React.FC<DadosEmpresaTabProps & { onLogoChange: (file: File | null) => void }> = ({
  dados,
  onChange,
  isPending,
  onLogoChange
}) => {
  const handleInputChange = (field: keyof typeof dados, value: string) => {
    // Aplicar formatação baseada no campo
    let formattedValue = value;
    if (field === 'cnpj' && typeof value === 'string') {
      formattedValue = formatCNPJ(value);
    }

    onChange(field, formattedValue || '');
  };

  return (
    <div className="mb-0">
      <div className="row">
        <div className="col-md-6">
          <FormField
            name="razao_social"
            type="text"
            label="Razão Social"
            placeholder="Nome da empresa"
            required={true}
            size="md"
            value={dados.razao_social}
            onChange={(value) => handleInputChange('razao_social', String(value ?? ''))}
            disabled={isPending}
          />
        </div>
        <div className="col-md-6">
          <FormField
            name="nome_fantasia"
            type="text"
            label="Nome Fantasia"
            placeholder="Nome fantasia da empresa"
            size="md"
            value={dados.nome_fantasia}
            onChange={(value) => handleInputChange('nome_fantasia', String(value ?? ''))}
            disabled={isPending}
          />
        </div>
      </div>

      <div className="row">
        <div className="col-md-4">
          <FormField
            name="cnpj"
            type="text"
            label="CNPJ"
            placeholder="00.000.000/0000-00"
            required={true}
            size="md"
            value={dados.cnpj}
            onChange={(value) => handleInputChange('cnpj', String(value ?? ''))}
            disabled={isPending}
          />
        </div>
        <div className="col-md-4">
          <FormField
            name="inscricao_estadual"
            type="text"
            label="Inscrição Estadual"
            placeholder="Inscrição estadual"
            size="md"
            value={dados.inscricao_estadual}
            onChange={(value) => handleInputChange('inscricao_estadual', String(value ?? ''))}
            disabled={isPending}
          />
        </div>
        <div className="col-md-4">
          <FormField
            name="inscricao_municipal"
            type="text"
            label="Inscrição Municipal"
            placeholder="Inscrição municipal"
            size="md"
            value={dados.inscricao_municipal}
            onChange={(value) => handleInputChange('inscricao_municipal', String(value ?? ''))}
            disabled={isPending}
          />
        </div>
      </div>

      {/* Logo da Empresa */}
      <div className="row mt-4 pt-3 border-top">
        <div className="col-md-12">
          <label htmlFor="logo" className="form-label small fw-bold">Logo da Empresa</label>
          <div className="d-flex align-items-start gap-3">
            <div style={{ minWidth: '200px' }}>
              {dados.logo ? (
                <img 
                  src={dados.logo} 
                  alt="Logo da empresa" 
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
                    <div className="small">Sem logo</div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex-grow-1">
              <FormField
                name="logo"
                id="logo"
                type="file"
                value=""
                onChange={(value) => {
                  if (value instanceof File) {
                    onLogoChange(value);
                  } else if (value === null) {
                    onLogoChange(null);
                  }
                }}
                disabled={isPending}
                accept="image/*"
                helpText="Formatos aceitos: JPG, PNG, GIF (máx. 2MB)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DadosBasicosTab;

