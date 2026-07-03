import React from 'react';
import { formatCPF } from 'utils/formatters';
import { FormField } from 'components/ui';
import { DadosEmpresaTabProps } from '../types';
import { useI18n } from 'contexts/I18nContext';

/** Desativado provisoriamente - trocar para true para reativar */
const SHOW_ASSINATURA_RESPONSAVEL = false;

const ResponsavelTab: React.FC<DadosEmpresaTabProps & { onAssinaturaChange: (file: File | null) => void }> = ({
  dados,
  onChange,
  isPending,
  onAssinaturaChange
}) => {
  const { t } = useI18n();
  const handleInputChange = (field: keyof typeof dados, value: string) => {
    let formattedValue = value;
    if (field === 'responsavel_cpf' && typeof value === 'string') {
      formattedValue = formatCPF(value);
    }
    onChange(field, formattedValue || '');
  };

  return (
    <>
      <div className="row g-2">
        <div className="col-12">
          <FormField
            name="responsavel_nome"
            type="text"
            label={t('form.name')}
            placeholder={t('placeholder.responsibleName')}
            size="md"
            value={dados.responsavel_nome}
            onChange={(value) => handleInputChange('responsavel_nome', String(value ?? ''))}
            disabled={isPending}
          />
        </div>
        <div className="col-12">
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
        <div className="col-12">
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
      {SHOW_ASSINATURA_RESPONSAVEL && <div className="row mt-4 pt-3 border-top">
        <div className="col-12">
          <label htmlFor="assinatura" className="form-label small fw-bold">{t('company.responsibleSignature')}</label>
          <div className="d-flex align-items-start gap-3">
            <div className="empresa-logo-wrap">
              {dados.responsavel_assinatura ? (
                <img 
                  src={dados.responsavel_assinatura} 
                  alt="Assinatura do responsável" 
                  className="empresa-logo-img border rounded p-2 bg-light"
                  
                />
              ) : (
                <div 
                  className="border rounded p-2 bg-light text-center text-secondary empresa-logo-placeholder"
                  
                >
                  <div>
                    <i className="bi bi-image fs-icon-md" ></i>
                    <div className="small">{t('company.noSignature')}</div>
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
                helpText={t('company.pngOnly')}
              />
            </div>
          </div>
        </div>
      </div>}
    </>
  );
};

export default ResponsavelTab;

