import React, { useCallback } from 'react';
import FormField from '@/components/ui/FormField';
import { Button, Input } from '@/components/ui';
import { BancoTabProps } from '../types';
import { useI18n } from '@/contexts/I18nContext';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';

const ConfiguracoesApiTab: React.FC<BancoTabProps> = ({
  formData,
  handleInputChange,
  isPending,
  formPrefix,
  renderBancoEspecificoCampos,
  handleTestConnection,
  testResult
}) => {
  const { t } = useI18n();
  const { success, warning } = useNotificationContext();

  const handleCopyWebhookUrl = useCallback(async () => {
    const url = formData.url_retorno?.trim();
    if (!url) {
      warning(t('messages.noTokenToCopy'));
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      success(t('blockdomi.copiedToClipboard'));
    } catch {
      warning(t('messages.copyManual'));
    }
  }, [formData.url_retorno, success, warning, t]);

  return (
    <>
      {/* Campos específicos EFI */}
      {formData.tipo_banco === 'efi' && (
        <>
          <div className="row">
            <div className="col-md-6">
              <div className="mb-3">
                <FormField
                  name="client_id_producao"
                  type="text"
                  label={formData.tipo_banco === 'efi' ? t('form.clientIdProd') : t('form.clientId')}
                  placeholder={t('placeholder.clientIdProd')}
                  size="sm"
                  value={formData.client_id_producao}
                  onChange={(value) => handleInputChange('client_id_producao', value)}
                  disabled={isPending}
                  autoComplete="off"
                  formPrefix={formPrefix}
                />
                {!formData.client_id_producao && (
                  <small className="text-secondary d-block mt-1">
                    {t('form.optionalUpdate')}
                  </small>
                )}
              </div>
            </div>

            <div className="col-md-6">
              <div className="mb-3">
                <FormField
                  name="client_secret_producao"
                  type="password"
                  label={formData.tipo_banco === 'efi' ? t('form.clientSecretProd') : t('form.clientSecret')}
                  placeholder={t('placeholder.fillClientSecret')}
                  size="sm"
                  value={formData.client_secret_producao}
                  onChange={(value) => handleInputChange('client_secret_producao', value)}
                  disabled={isPending}
                  autoComplete="off"
                  formPrefix={formPrefix}
                />
                {!formData.client_secret_producao && (
                  <small className="text-secondary d-block mt-1">
                    {t('form.optionalUpdate')}
                  </small>
                )}
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-md-12">
              <div className="mb-3">
                <label className="form-label">{t('form.webhookUrl')}</label>
                <div className="input-group input-group-sm">
                  <Input
                    type="url"
                    value={formData.url_retorno || ''}
                    readOnly
                    size="sm"
                    id={formPrefix ? `${formPrefix}-field-url_retorno` : 'field-url_retorno'}
                  />
                  <Button
                    type="button"
                    variant="outline-secondary"
                    size="sm"
                    onClick={handleCopyWebhookUrl}
                    disabled={isPending}
                  >
                    {t('buttons.copy')}
                  </Button>
                </div>
                <small className="text-secondary d-block mt-1">{t('form.webhookUrlHelp')}</small>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-md-12">
              <div className="mb-3">
                <FormField
                  name="sandbox"
                  type="checkbox"
                  label={t('table.sandbox')}
                  value={formData.sandbox}
                  onChange={(value) => handleInputChange('sandbox', value as boolean)}
                  disabled={isPending}
                  formPrefix={formPrefix}
                  switch={true}
                />
                <small className="text-secondary">
                  {t('form.sandboxHelp')}
                </small>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Campos específicos ASAAS */}
      {formData.tipo_banco === 'asaas' && (
        <>
          <div className="row">
            <div className="col-md-12">
              <div className="mb-3">
                <label className="form-label">{t('form.webhookUrl')}</label>
                <div className="input-group input-group-sm">
                  <Input
                    type="url"
                    value={formData.url_retorno || ''}
                    readOnly
                    size="sm"
                    id={formPrefix ? `${formPrefix}-field-url_retorno-asaas` : 'field-url_retorno-asaas'}
                  />
                  <Button
                    type="button"
                    variant="outline-secondary"
                    size="sm"
                    onClick={handleCopyWebhookUrl}
                    disabled={isPending}
                  >
                    {t('buttons.copy')}
                  </Button>
                </div>
                <small className="text-secondary d-block mt-1">{t('form.webhookUrlHelp')}</small>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-md-12">
              <div className="mb-3">
                <FormField
                  name="sandbox"
                  type="checkbox"
                  label={t('table.sandbox')}
                  value={formData.sandbox}
                  onChange={(value) => handleInputChange('sandbox', value as boolean)}
                  disabled={isPending}
                  formPrefix={formPrefix}
                  switch={true}
                />
                <small className="text-secondary">
                  {t('form.sandboxHelp')}
                </small>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Campos específicos de cada tipo de banco */}
      {renderBancoEspecificoCampos()}

      <div className="mt-3">
        <Button
          type="button"
          variant="outline-primary"
          size="sm"
          onClick={handleTestConnection}
          disabled={isPending}
        >
          {t('buttons.testConnection')}
        </Button>
        {testResult && (
          <span className={`ms-2 badge ${testResult.includes('✅') ? 'bg-success' : 'bg-danger'}`}>
            {testResult}
          </span>
        )}
      </div>
    </>
  );
};

export default ConfiguracoesApiTab;

