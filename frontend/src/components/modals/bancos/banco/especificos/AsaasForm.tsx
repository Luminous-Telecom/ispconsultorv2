import React from 'react';
import { FormValue } from 'types/common';
import FormField from 'components/ui/FormField';
import { AtivoInativoField } from 'components/ui';
import { BancoForm } from '../types';
import { useI18n } from 'contexts/I18nContext';

interface AsaasFormProps {
  formData: BancoForm;
  isPending: boolean;
  handleInputChange: (field: keyof BancoForm, value: FormValue) => void;
}

const AsaasForm: React.FC<AsaasFormProps> = ({
  formData,
  isPending,
  handleInputChange
}) => {
  const { t } = useI18n();

  return (
    <div className="row g-2">
      <div className="col-12">
        <FormField
          name="api_key"
          type="password"
          label={t('form.apiKey')}
          description={t('form.apiKeyAsaasHelp')}
          placeholder={t('placeholder.apiKeyAsaas')}
          required={!formData.has_api_key}
          size="sm"
          value={formData.api_key}
          onChange={(value) => handleInputChange('api_key', value)}
          disabled={isPending}
          autoComplete="off"
        />
      </div>

      <div className="col-12">
        <FormField
          name="webhook_secret"
          type="password"
          label={t('form.webhookSecret')}
          description={t('form.webhookSecretAsaasHelp')}
          placeholder={t('placeholder.webhookSecretHelp')}
          size="sm"
          value={formData.webhook_secret || ''}
          disabled={isPending}
          autoComplete="off"
          onChange={(value) => handleInputChange('webhook_secret', value)}
        />
      </div>

      <div className="col-12">
        <FormField
          name="percentual_multa"
          type="number"
          label={t('form.finePercent')}
          placeholder="2.00"
          size="sm"
          value={formData.percentual_multa}
          onChange={(value) => handleInputChange('percentual_multa', parseFloat(String(value ?? '')) || 0)}
          disabled={isPending}
          step={0.01}
        />
      </div>

      <div className="col-12">
        <FormField
          name="percentual_juros"
          type="number"
          label={t('form.interestPercent')}
          placeholder="0.03"
          size="sm"
          value={formData.percentual_juros}
          onChange={(value) => handleInputChange('percentual_juros', parseFloat(String(value ?? '')) || 0)}
          disabled={isPending}
          step={0.01}
        />
      </div>

      <div className="col-12">
        <AtivoInativoField
          value={!!formData.incluir_taxa}
          onChange={(v) => handleInputChange('incluir_taxa', v)}
          label={t('form.includeFee')}
          name="banco-asaas-incluir-taxa"
          disabled={isPending}
        />
      </div>

      <div className="col-12">
        <AtivoInativoField
          value={!!formData.usar_integracao_banco_nfse}
          onChange={(v) => handleInputChange('usar_integracao_banco_nfse', v)}
          label={t('form.useBankIntegrationForNFSe')}
          name="banco-asaas-usar-integracao-nfse"
          disabled={isPending}
        />
        <small className="form-helper-message form-modal-input-col">
          {t('form.useBankIntegrationForNFSeHelp')}
        </small>
      </div>
    </div>
  );
};

export default AsaasForm;
