import React from 'react';
import { FormField, AtivoInativoField, CopyableFormField } from 'components/ui';
import { BancoTabProps } from '../types';
import { useI18n } from 'contexts/I18nContext';
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
  const { warning } = useNotificationContext();

  const renderWebhookUrlField = (idSuffix = '') => (
    <div className="col-12">
      <CopyableFormField
        name={`url_retorno${idSuffix}`}
        formPrefix={formPrefix}
        type="url"
        label={t('form.webhookUrl')}
        helpText={t('form.webhookUrlHelp')}
        placeholder={t('placeholder.webhookUrl')}
        size="sm"
        value={formData.url_retorno || ''}
        onChange={(value) => handleInputChange('url_retorno', value)}
        disabled={isPending}
        copyKey={`url-retorno${idSuffix}`}
        error={errors?.url_retorno}
        isInvalid={!!errors?.url_retorno}
        onCopyFailed={() => warning(t('messages.copyManual'))}
      />
    </div>
  );

  return (
    <>
      {formData.tipo_banco === 'efi' && (
        <div className="row g-2">
          <div className="col-12">
            <FormField
              name="client_id_producao"
              type="text"
              label={t('form.clientIdProd')}
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

          <div className="col-12">
            <FormField
              name="client_secret_producao"
              type="password"
              label={t('form.clientSecretProd')}
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

          {renderWebhookUrlField()}

          <div className="col-12">
            <AtivoInativoField
              value={formData.sandbox}
              onChange={(v) => handleInputChange('sandbox', v)}
              label={t('table.sandbox')}
              name={formPrefix ? `${formPrefix}-sandbox` : 'banco-sandbox'}
              disabled={isPending}
            />
          </div>
        </div>
      )}

      {formData.tipo_banco === 'asaas' && (
        <div className="row g-2">
          {renderWebhookUrlField('-asaas')}

          <div className="col-12">
            <AtivoInativoField
              value={formData.sandbox}
              onChange={(v) => handleInputChange('sandbox', v)}
              label={t('table.sandbox')}
              name={formPrefix ? `${formPrefix}-sandbox` : 'banco-sandbox'}
              disabled={isPending}
            />
          </div>
        </div>
      )}

      {renderBancoEspecificoCampos()}
    </>
  );
};

export default ConfiguracoesApiTab;
