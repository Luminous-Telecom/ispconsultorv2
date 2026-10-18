import React from 'react';
import { formatCNPJ } from 'utils/formatters';
import { CartaoCnpjButton, FormField } from 'components/ui';
import { openCartaoCnpj } from 'utils/cartaoCnpj';
import { withCacheBust } from 'utils/urlUtils';
import { DadosEmpresaTabProps } from '../types';
import { useI18n } from 'contexts/I18nContext';

const DadosBasicosTab: React.FC<DadosEmpresaTabProps & { onLogoChange: (file: File | null) => void }> = ({
  dados,
  onChange,
  isPending,
  onLogoChange
}) => {
  const { t } = useI18n();
  const handleInputChange = (field: keyof typeof dados, value: string) => {
    // Aplicar formatação baseada no campo
    let formattedValue = value;
    if (field === 'cnpj' && typeof value === 'string') {
      formattedValue = formatCNPJ(value);
    }

    onChange(field, formattedValue || '');
  };

  return (
    <>
      <div className="row g-2">
        <div className="col-12">
          <FormField
            name="razao_social"
            type="text"
            label={t('company.razaoSocial')}
            placeholder={t('company.razaoSocial')}
            required={true}
            size="md"
            value={dados.razao_social}
            onChange={(value) => handleInputChange('razao_social', String(value ?? ''))}
            disabled={isPending}
          />
        </div>
        <div className="col-12">
          <FormField
            name="nome_fantasia"
            type="text"
            label={t('company.nomeFantasia')}
            placeholder={t('company.nomeFantasia')}
            size="md"
            value={dados.nome_fantasia}
            onChange={(value) => handleInputChange('nome_fantasia', String(value ?? ''))}
            disabled={isPending}
          />
        </div>
        <div className="col-12">
          <FormField
            name="cnpj"
            type="text"
            label={t('company.cnpj')}
            placeholder="AA.AAA.AAA/AAAA-00"
            required={true}
            size="md"
            value={dados.cnpj}
            onChange={(value) => handleInputChange('cnpj', String(value ?? ''))}
            disabled={isPending}
            trailing={<CartaoCnpjButton type="button" onClick={openCartaoCnpj} />}
          />
        </div>
        <div className="col-12">
          <FormField
            name="inscricao_estadual"
            type="text"
            label={t('company.inscricaoEstadual')}
            placeholder={t('company.inscricaoEstadual')}
            size="md"
            value={dados.inscricao_estadual}
            onChange={(value) => handleInputChange('inscricao_estadual', String(value ?? ''))}
            disabled={isPending}
          />
        </div>
        <div className="col-12">
          <FormField
            name="inscricao_municipal"
            type="text"
            label={t('company.inscricaoMunicipal')}
            placeholder={t('company.inscricaoMunicipal')}
            size="md"
            value={dados.inscricao_municipal}
            onChange={(value) => handleInputChange('inscricao_municipal', String(value ?? ''))}
            disabled={isPending}
          />
        </div>
      </div>

      {/* Logo da Empresa */}
      <div className="row mt-4 pt-3 border-top">
        <div className="col-12">
          <label htmlFor="logo" className="form-label small fw-bold">{t('company.logo')}</label>
          <div className="d-flex align-items-start gap-3">
            <div className="empresa-logo-wrap">
              {dados.logo ? (
                <img 
                  src={withCacheBust(dados.logo, dados.updated_at)} 
                  alt={t('company.logo')} 
                  className="empresa-logo-img border rounded p-2 bg-light"
                  key={withCacheBust(dados.logo, dados.updated_at)}
                />
              ) : (
                <div 
                  className="border rounded p-2 bg-light text-center text-secondary empresa-logo-placeholder"
                  
                >
                  <div>
                    <i className="bi bi-image fs-icon-md" ></i>
                    <div className="small">{t('company.noLogo')}</div>
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
                helpText={t('company.acceptedFormats')}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DadosBasicosTab;

