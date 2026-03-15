import React from 'react';
import { FormValue } from 'types/common';
import FormField from 'components/ui/FormField';
import { Button } from 'components/ui';
import { BancoForm } from '../types';
import { useI18n } from 'contexts/I18nContext';

interface AsaasFormProps {
  formData: BancoForm;
  isPending: boolean;
  formPrefix: string;
  isGeneratingSecret: boolean;
  isBancoPersisted: boolean;
  handleInputChange: (field: keyof BancoForm, value: FormValue) => void;
  onGenerateWebhookSecret: () => void;
  onCopyWebhookSecret: () => void;
}

const AsaasForm: React.FC<AsaasFormProps> = ({
  formData,
  isPending,
  formPrefix,
  isGeneratingSecret,
  isBancoPersisted,
  handleInputChange,
  onGenerateWebhookSecret,
  onCopyWebhookSecret
}) => {
  const { t } = useI18n();

  return (
    <>
      <div className="row">
        <div className="col-md-12">
          <div className="mb-3">
            <FormField
              name="api_key"
              type="password"
              label={t('form.apiKey')}
              placeholder={t('placeholder.apiKeyAsaas')}
              required={true}
              size="sm"
              value={formData.api_key}
              onChange={(value) => handleInputChange('api_key', value)}
              disabled={isPending}
              autoComplete="off"
            />
            <small className="text-secondary d-block mt-1">
              {t('form.apiKeyAsaasHelp')}
            </small>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-md-12">
          <div className="mb-3">
            <FormField
              name="webhook_secret"
              type="text"
              label={t('form.webhookSecret')}
              placeholder={t('placeholder.webhookSecretHelp')}
              size="sm"
              value={formData.webhook_secret}
              readOnly
              autoComplete="off"
            />
            <div className="d-flex flex-wrap gap-2 mt-2">
              <Button
                type="button"
                variant="outline-primary"
                size="sm"
                onClick={onGenerateWebhookSecret}
                isLoading={isGeneratingSecret}
                disabled={isPending || isGeneratingSecret || !isBancoPersisted}
              >
                {t('buttons.generateToken')}
              </Button>
              <Button
                type="button"
                variant="outline-primary"
                size="sm"
                onClick={onCopyWebhookSecret}
                disabled={!formData.webhook_secret}
              >
                {t('buttons.copy')}
              </Button>
            </div>
            <small className="text-secondary d-block mt-1">
              {formData.webhook_secret
                ? t('form.webhookSecretAsaasHelp')
                : t('form.generateWebhookSecretHelp')}
            </small>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-md-6">
          <div className="mb-3">
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
        </div>
        <div className="col-md-6">
          <div className="mb-3">
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
        </div>
      </div>

      <div className="row">
        <div className="col-md-6">
          <div className="mt-4">
            <FormField
              name="incluir_taxa"
              type="checkbox"
              label={t('form.includeFee')}
              value={formData.incluir_taxa}
              onChange={(value) => handleInputChange('incluir_taxa', value)}
              disabled={isPending}
              formPrefix={formPrefix}
              switch={true}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default AsaasForm;

