import React, { useCallback } from 'react';
import FormField from 'components/ui/FormField';
import { CopiarButton, Input, LabelWithHelp } from 'components/ui';
import { BancoTabProps } from '../types';
import { useI18n } from 'contexts/I18nContext';
import { useCopyToClipboard } from 'hooks/useCopyToClipboard';
import { useNotificationContext } from 'components/notifications/NotificationProvider';

const ConfiguracoesApiTab: React.FC<BancoTabProps> = ({
  formData,
  errors,
  handleInputChange,
  isPending,
  formPrefix,
  renderBancoEspecificoCampos
}) => {
  const { t } = useI18n();
  const { success, warning } = useNotificationContext();
  const { copy: copyToClipboard } = useCopyToClipboard();

  const handleCopyWebhookUrl = useCallback(async () => {
    const url = formData.url_retorno?.trim();
    if (!url) {
      warning(t('messages.noTokenToCopy'));
      return;
    }
    const ok = await copyToClipboard(url);
    if (ok) {
      success(t('blockdomi.copiedToClipboard'));
    } else {
      warning(t('messages.copyManual'));
    }
  }, [copyToClipboard, formData.url_retorno, success, warning, t]);

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
                  description={t('form.optionalUpdate')}
                  placeholder={t('placeholder.clientIdProd')}
                  size="sm"
                  value={formData.client_id_producao}
                  onChange={(value) => handleInputChange('client_id_producao', value)}
                  disabled={isPending}
                  autoComplete="off"
                  formPrefix={formPrefix}
                />
              </div>
            </div>

            <div className="col-md-6">
              <div className="mb-3">
                <FormField
                  name="client_secret_producao"
                  type="password"
                  label={formData.tipo_banco === 'efi' ? t('form.clientSecretProd') : t('form.clientSecret')}
                  description={t('form.optionalUpdate')}
                  placeholder={t('placeholder.fillClientSecret')}
                  size="sm"
                  value={formData.client_secret_producao}
                  onChange={(value) => handleInputChange('client_secret_producao', value)}
                  disabled={isPending}
                  autoComplete="off"
                  formPrefix={formPrefix}
                />
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-md-12">
              <div className="mb-3">
                <LabelWithHelp
                  htmlFor={formPrefix ? `${formPrefix}-field-url_retorno` : 'field-url_retorno'}
                  className="form-label"
                  helpText={t('form.webhookUrlHelp')}
                >
                  {t('form.webhookUrl')}
                </LabelWithHelp>
                <div className="input-group input-group-sm">
                  <Input
                    type="url"
                    id={formPrefix ? `${formPrefix}-field-url_retorno` : 'field-url_retorno'}
                    value={formData.url_retorno || ''}
                    onChange={(e) => handleInputChange('url_retorno', (e as { value?: string }).value ?? '')}
                    disabled={isPending}
                    placeholder={t('placeholder.webhookUrl')}
                    size="sm"
                    isInvalid={!!errors?.url_retorno}
                    validationMessage={errors?.url_retorno}
                    className={errors?.url_retorno ? 'is-invalid' : ''}
                  />
                  <CopiarButton
                    type="button"
                    onClick={handleCopyWebhookUrl}
                    disabled={isPending}
                  />
                </div>
                {errors?.url_retorno && <div className="invalid-feedback d-block">{errors.url_retorno}</div>}
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
                  description={t('form.sandboxHelp')}
                  value={formData.sandbox}
                  onChange={(value) => handleInputChange('sandbox', value as boolean)}
                  disabled={isPending}
                  formPrefix={formPrefix}
                  switch={true}
                />
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
                <LabelWithHelp
                  htmlFor={formPrefix ? `${formPrefix}-field-url_retorno-asaas` : 'field-url_retorno-asaas'}
                  className="form-label"
                  helpText={t('form.webhookUrlHelp')}
                >
                  {t('form.webhookUrl')}
                </LabelWithHelp>
                <div className="input-group input-group-sm">
                  <Input
                    type="url"
                    id={formPrefix ? `${formPrefix}-field-url_retorno-asaas` : 'field-url_retorno-asaas'}
                    value={formData.url_retorno || ''}
                    onChange={(e) => handleInputChange('url_retorno', (e as { value?: string }).value ?? '')}
                    disabled={isPending}
                    placeholder={t('placeholder.webhookUrl')}
                    size="sm"
                    isInvalid={!!errors?.url_retorno}
                    validationMessage={errors?.url_retorno}
                    className={errors?.url_retorno ? 'is-invalid' : ''}
                  />
                  <CopiarButton
                    type="button"
                    onClick={handleCopyWebhookUrl}
                    disabled={isPending}
                  />
                </div>
                {errors?.url_retorno && <div className="invalid-feedback d-block">{errors.url_retorno}</div>}
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
                  description={t('form.sandboxHelp')}
                  value={formData.sandbox}
                  onChange={(value) => handleInputChange('sandbox', value as boolean)}
                  disabled={isPending}
                  formPrefix={formPrefix}
                  switch={true}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Campos específicos de cada tipo de banco */}
      {renderBancoEspecificoCampos()}
    </>
  );
};

export default ConfiguracoesApiTab;

