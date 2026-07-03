import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { NFSeConfigUpdate, NFSeConfigTestAuth } from 'services/nfseConfigService';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { useI18n } from 'contexts/I18nContext';
import { FormField, AtivoInativoField, Loading } from 'components/ui';
import { NFSE_CONFIG_BY_VARIANT, type NFSeConfigVariant } from './nfseConfigVariants';

export interface NFSeConfigSectionCoreProps {
  variant: NFSeConfigVariant;
  disabled?: boolean;
  onSaveReady?: (handleSave: () => void, isSaving: boolean) => void;
  onTestReady?: (handleTest: () => void, isTesting: boolean, canTest: boolean) => void;
}

const NFSeConfigSectionCore: React.FC<NFSeConfigSectionCoreProps> = ({
  variant,
  disabled = false,
  onSaveReady,
  onTestReady,
}) => {
  const { queryKey, formId, api } = NFSE_CONFIG_BY_VARIANT[variant];
  const { t } = useI18n();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    codigo_servico_municipal: '',
    aliquota_iss: '0',
    descricao_servico: '',
    serie_nf: '80000',
    numero_dps: '1',
    portal_nacional_username: '',
    portal_nacional_password: '',
    portal_nacional_base_url: 'https://sefin.producaorestrita.nfse.gov.br/API/SefinNacional',
    portal_nacional_ambiente: 'HOMOLOGACAO' as 'HOMOLOGACAO' | 'PRODUCAO',
    asaas_api_key: '',
    asaas_sandbox: false,
    provider: 'ASAAS' as 'PORTAL_NACIONAL' | 'ASAAS',
    has_asaas_api_key: false,
    has_portal_nacional_password: false,
  });

  const { data: configData, isLoading, refetch } = useQuery({
    queryKey: [...queryKey],
    queryFn: async () => {
      const response = await api.get();
      if (!response.success) {
        throw new Error(response.message || t('nfse.messages.loadingError'));
      }
      return response.data;
    },
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (configData) {
      setFormData({
        codigo_servico_municipal: configData.codigo_servico_municipal || '',
        aliquota_iss: String(configData.aliquota_iss || 0),
        descricao_servico: configData.descricao_servico || '',
        serie_nf: configData.serie_nf || '80000',
        numero_dps: String(configData.numero_dps || 1),
        portal_nacional_username: configData.portal_nacional_username || '',
        portal_nacional_password: '',
        portal_nacional_base_url:
          configData.portal_nacional_base_url ||
          'https://sefin.producaorestrita.nfse.gov.br/API/SefinNacional',
        portal_nacional_ambiente: configData.portal_nacional_ambiente || 'HOMOLOGACAO',
        asaas_api_key: '',
        asaas_sandbox: configData.asaas_sandbox || false,
        provider: configData.provider === 'PORTAL_NACIONAL' ? 'ASAAS' : (configData.provider || 'ASAAS'),
        has_asaas_api_key: configData.has_asaas_api_key ?? false,
        has_portal_nacional_password: configData.has_portal_nacional_password ?? false,
      });
    }
  }, [configData]);

  const testAuthMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (data.provider === 'ASAAS') {
        if (!data.asaas_api_key && !data.has_asaas_api_key) {
          throw new Error(t('nfse.messages.apiKeyRequired'));
        }

        const testPayload: NFSeConfigTestAuth = {
          provider: 'ASAAS',
          asaas_sandbox: data.asaas_sandbox,
        };
        if (data.asaas_api_key) testPayload.asaas_api_key = data.asaas_api_key;

        const response = await api.testAuth(testPayload);
        if (!response.success) {
          throw new Error(response.message || t('nfse.messages.testError'));
        }
        return response.data;
      }
      if (data.provider === 'PORTAL_NACIONAL') {
        if (!data.portal_nacional_username || !data.portal_nacional_password) {
          throw new Error(t('nfse.messages.credentialsRequired'));
        }

        const response = await api.testAuth({
          provider: 'PORTAL_NACIONAL',
          portal_nacional_username: data.portal_nacional_username,
          portal_nacional_password: data.portal_nacional_password,
          portal_nacional_ambiente: data.portal_nacional_ambiente,
        });
        if (!response.success) {
          throw new Error(response.message || t('nfse.messages.testError'));
        }
        return response.data;
      }
      throw new Error(t('nfse.messages.providerRequired'));
    },
    onSuccess: () => {
      success(
        formData.provider === 'ASAAS'
          ? t('nfse.messages.testSuccessAsaas')
          : t('nfse.messages.testSuccessPortal')
      );
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.NFSE_TEST_ERROR),
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const updateData: NFSeConfigUpdate = {
        codigo_servico_municipal: data.codigo_servico_municipal || null,
        aliquota_iss: parseFloat(data.aliquota_iss) || 0,
        descricao_servico: data.descricao_servico || null,
        serie_nf: data.serie_nf || null,
        numero_dps: data.numero_dps ? parseInt(data.numero_dps, 10) : null,
        portal_nacional_username: data.portal_nacional_username || null,
        portal_nacional_base_url:
          data.portal_nacional_base_url ||
          'https://sefin.producaorestrita.nfse.gov.br/API/SefinNacional',
        portal_nacional_ambiente: data.portal_nacional_ambiente,
        asaas_sandbox: data.asaas_sandbox,
        provider: data.provider,
      };
      if (data.portal_nacional_password) updateData.portal_nacional_password = data.portal_nacional_password;
      if (data.asaas_api_key) updateData.asaas_api_key = data.asaas_api_key;

      const response = await api.update(updateData);
      if (!response.success) {
        const errorMessage = response.message || response.errors || t('nfse.messages.saveError');
        throw new Error(typeof errorMessage === 'string' ? errorMessage : t('nfse.messages.saveError'));
      }
      return response.data;
    },
    onSuccess: async () => {
      success(t('nfse.messages.saveSuccess'));
      await queryClient.invalidateQueries({ queryKey: [...queryKey] });
      await refetch();
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.NFSE_SAVE_ERROR),
  });

  const handleInputChange = (field: keyof typeof formData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = useCallback(
    (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      saveMutation.mutate(formData);
    },
    [formData, saveMutation]
  );

  const handleTest = useCallback(() => {
    testAuthMutation.mutate(formData);
  }, [formData, testAuthMutation]);

  const canTest =
    formData.provider === 'PORTAL_NACIONAL'
      ? !!(
          formData.portal_nacional_username &&
          (formData.portal_nacional_password || formData.has_portal_nacional_password)
        )
      : formData.provider === 'ASAAS'
        ? !!(formData.asaas_api_key || formData.has_asaas_api_key)
        : false;

  useEffect(() => {
    if (onSaveReady) onSaveReady(handleSave, saveMutation.isPending);
  }, [onSaveReady, saveMutation.isPending, handleSave]);

  useEffect(() => {
    if (onTestReady) onTestReady(handleTest, testAuthMutation.isPending, canTest);
  }, [onTestReady, testAuthMutation.isPending, canTest, handleTest]);

  const isFieldDisabled = disabled || saveMutation.isPending;

  if (isLoading) {
    return (
      <div className="card mb-3">
        <div className="card-header">
          <h6 className="mb-0">{t('nfse.title')}</h6>
        </div>
        <div className="card-body">
          <Loading variant="centered" size="sm" message={t('ui.loading')} />
        </div>
      </div>
    );
  }

  return (
    <div className="card mb-3">
      <div className="card-header">
        <h6 className="mb-0">{t('nfse.title')}</h6>
      </div>
      <div className="card-body">
        <form id={formId} onSubmit={handleSave} className="form-modal-simple">
          <div className="row g-2">
            <div className="col-12">
              <FormField
                name="nfse_codigo_servico"
                type="text"
                label={t('nfse.municipalServiceCode')}
                value={formData.codigo_servico_municipal}
                onChange={(v) => handleInputChange('codigo_servico_municipal', String(v ?? ''))}
                disabled={isFieldDisabled}
                placeholder={t('placeholder.serviceCode')}
                helpText={t('nfse.municipalServiceCodeHelp')}
                size="sm"
              />
            </div>

            <div className="col-12">
              <FormField
                name="nfse_aliquota_iss"
                type="number"
                label={t('nfse.issRate')}
                value={formData.aliquota_iss}
                onChange={(v) => handleInputChange('aliquota_iss', String(v ?? ''))}
                disabled={isFieldDisabled}
                min={0}
                max={100}
                step={0.01}
                placeholder="0.00"
                helpText={t('nfse.issRateHelp')}
                size="sm"
              />
            </div>

            <div className="col-12">
              <FormField
                name="nfse_descricao_servico"
                type="textarea"
                label={t('nfse.serviceDescription')}
                rows={3}
                value={formData.descricao_servico}
                onChange={(v) => handleInputChange('descricao_servico', String(v ?? ''))}
                disabled={isFieldDisabled}
                placeholder="Ex: Prestação de serviços de desenvolvimento de software"
                helpText={t('nfse.serviceDescriptionHelp')}
                size="sm"
              />
            </div>

            <div className="col-12">
              <FormField
                name="nfse_serie_nf"
                type="text"
                label={t('nfse.nfSerie')}
                value={formData.serie_nf}
                onChange={(v) => handleInputChange('serie_nf', String(v ?? ''))}
                disabled={isFieldDisabled}
                placeholder="80000"
                maxLength={10}
                helpText={t('nfse.nfSerieHelp')}
                size="sm"
              />
            </div>

            <div className="col-12">
              <FormField
                name="nfse_numero_dps"
                type="number"
                label={t('nfse.dpsNumber')}
                value={formData.numero_dps}
                onChange={(v) => handleInputChange('numero_dps', String(v ?? ''))}
                disabled={isFieldDisabled}
                min={1}
                placeholder="1"
                helpText={t('nfse.dpsNumberHelp')}
                size="sm"
              />
            </div>

            <div className="col-12">
              <FormField
                name="nfse_provider"
                type="select"
                label={t('nfse.provider')}
                value={formData.provider}
                onChange={(v) => handleInputChange('provider', String(v ?? '') as 'PORTAL_NACIONAL' | 'ASAAS')}
                disabled={isFieldDisabled}
                options={[
                  { value: 'ASAAS', label: 'Asaas' },
                  { value: 'PORTAL_NACIONAL', label: 'Portal Nacional (em breve)', disabled: true },
                ]}
                helpText={t('nfse.providerHelp')}
                size="sm"
              />
            </div>

            {formData.provider === 'ASAAS' && (
              <>
                <div className="col-12">
                  <FormField
                    name="nfse_asaas_api_key"
                    type="password"
                    label={t('nfse.asaasApiKey')}
                    value={formData.asaas_api_key}
                    onChange={(v) => handleInputChange('asaas_api_key', String(v ?? ''))}
                    disabled={isFieldDisabled}
                    placeholder={
                      formData.has_asaas_api_key
                        ? 'Chave configurada — deixe em branco para manter'
                        : t('placeholder.apiToken')
                    }
                    autoComplete="off"
                    helpText={
                      formData.has_asaas_api_key && !formData.asaas_api_key
                        ? 'Chave de API salva. Preencha apenas para alterar.'
                        : t('nfse.asaasApiKeyHelp')
                    }
                    size="sm"
                  />
                </div>

                <div className="col-12">
                  <AtivoInativoField
                    name="nfse_asaas_sandbox"
                    label={t('nfse.useSandbox')}
                    value={formData.asaas_sandbox}
                    onChange={(v) => handleInputChange('asaas_sandbox', v)}
                    disabled={isFieldDisabled}
                  />
                  <small className="form-helper-message form-modal-input-col">
                    {t('nfse.useSandboxHelp')}
                  </small>
                </div>
              </>
            )}

            {formData.provider === 'PORTAL_NACIONAL' && (
              <>
                <div className="col-12">
                  <FormField
                    name="nfse_portal_username"
                    type="text"
                    label={t('nfse.username')}
                    value={formData.portal_nacional_username}
                    onChange={(v) => handleInputChange('portal_nacional_username', String(v ?? ''))}
                    disabled={isFieldDisabled}
                    placeholder={t('nfse.username')}
                    size="sm"
                  />
                </div>

                <div className="col-12">
                  <FormField
                    name="nfse_portal_password"
                    type="password"
                    label={t('nfse.password')}
                    value={formData.portal_nacional_password}
                    onChange={(v) => handleInputChange('portal_nacional_password', String(v ?? ''))}
                    disabled={isFieldDisabled}
                    placeholder={
                      formData.has_portal_nacional_password
                        ? 'Senha configurada — deixe em branco para manter'
                        : t('nfse.password')
                    }
                    autoComplete="off"
                    size="sm"
                  />
                </div>

                <div className="col-12">
                  <FormField
                    name="nfse_portal_base_url"
                    type="url"
                    label={t('nfse.baseUrl')}
                    value={formData.portal_nacional_base_url}
                    onChange={(v) => handleInputChange('portal_nacional_base_url', String(v ?? ''))}
                    disabled={isFieldDisabled}
                    placeholder="https://sefin.producaorestrita.nfse.gov.br/API/SefinNacional"
                    size="sm"
                  />
                </div>

                <div className="col-12">
                  <FormField
                    name="nfse_portal_ambiente"
                    type="select"
                    label={t('nfse.environment')}
                    value={formData.portal_nacional_ambiente}
                    onChange={(v) =>
                      handleInputChange('portal_nacional_ambiente', String(v ?? '') as 'HOMOLOGACAO' | 'PRODUCAO')
                    }
                    disabled={isFieldDisabled}
                    options={[
                      { value: 'HOMOLOGACAO', label: t('nfse.homologation') },
                      { value: 'PRODUCAO', label: t('nfse.production') },
                    ]}
                    size="sm"
                  />
                </div>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default NFSeConfigSectionCore;
