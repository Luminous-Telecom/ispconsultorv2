import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { NFSeConfigUpdate, NFSeConfigTestAuth } from 'services/nfseConfigService';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { useI18n } from 'contexts/I18nContext';
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

  if (isLoading) {
    return (
      <div className="card mb-3">
        <div className="card-header">
          <h6 className="mb-0">{t('nfse.title')}</h6>
        </div>
        <div className="card-body">
          <div className="text-center p-3">
            <div className="spinner-border spinner-border-sm text-primary" role="status">
              <span className="visually-hidden">{t('ui.loading')}</span>
            </div>
          </div>
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
        <form id={formId} onSubmit={handleSave}>
          <div className="row">
            <div className="col-md-6 mb-3">
              <label htmlFor="nfse_codigo_servico" className="form-label">
                {t('nfse.municipalServiceCode')}
              </label>
              <input
                type="text"
                className="form-control"
                id="nfse_codigo_servico"
                value={formData.codigo_servico_municipal}
                onChange={(e) => handleInputChange('codigo_servico_municipal', e.target.value)}
                disabled={disabled || saveMutation.isPending}
                placeholder={t('placeholder.serviceCode')}
              />
              <small className="text-muted form-hint d-block mt-1">{t('nfse.municipalServiceCodeHelp')}</small>
            </div>

            <div className="col-md-6 mb-3">
              <label htmlFor="nfse_aliquota_iss" className="form-label">
                {t('nfse.issRate')}
              </label>
              <input
                type="number"
                className="form-control"
                id="nfse_aliquota_iss"
                value={formData.aliquota_iss}
                onChange={(e) => handleInputChange('aliquota_iss', e.target.value)}
                disabled={disabled || saveMutation.isPending}
                min="0"
                max="100"
                step="0.01"
                placeholder="0.00"
              />
              <small className="text-muted form-hint d-block mt-1">{t('nfse.issRateHelp')}</small>
            </div>
          </div>

          <div className="mb-3">
            <label htmlFor="nfse_descricao_servico" className="form-label">
              {t('nfse.serviceDescription')}
            </label>
            <textarea
              className="form-control"
              id="nfse_descricao_servico"
              rows={3}
              value={formData.descricao_servico}
              onChange={(e) => handleInputChange('descricao_servico', e.target.value)}
              disabled={disabled || saveMutation.isPending}
              placeholder="Ex: Prestação de serviços de desenvolvimento de software"
            />
            <small className="text-muted form-hint d-block mt-1">{t('nfse.serviceDescriptionHelp')}</small>
          </div>

          <div className="row">
            <div className="col-md-6 mb-3">
              <label htmlFor="nfse_serie_nf" className="form-label">
                {t('nfse.nfSerie')}
              </label>
              <input
                type="text"
                className="form-control"
                id="nfse_serie_nf"
                value={formData.serie_nf}
                onChange={(e) => handleInputChange('serie_nf', e.target.value)}
                disabled={disabled || saveMutation.isPending}
                placeholder="80000"
                maxLength={10}
              />
              <small className="text-muted form-hint d-block mt-1">{t('nfse.nfSerieHelp')}</small>
            </div>

            <div className="col-md-6 mb-3">
              <label htmlFor="nfse_numero_dps" className="form-label">
                {t('nfse.dpsNumber')}
              </label>
              <input
                type="number"
                className="form-control"
                id="nfse_numero_dps"
                value={formData.numero_dps}
                onChange={(e) => handleInputChange('numero_dps', e.target.value)}
                disabled={disabled || saveMutation.isPending}
                min="1"
                placeholder="1"
              />
              <small className="text-muted form-hint d-block mt-1">{t('nfse.dpsNumberHelp')}</small>
            </div>
          </div>

          <div className="mb-3">
            <label htmlFor="nfse_provider" className="form-label">
              {t('nfse.provider')}
            </label>
            <select
              className="form-control"
              id="nfse_provider"
              value={formData.provider}
              onChange={(e) => handleInputChange('provider', e.target.value as 'PORTAL_NACIONAL' | 'ASAAS')}
              disabled={disabled || saveMutation.isPending}
            >
              <option value="ASAAS">Asaas</option>
              <option value="PORTAL_NACIONAL" disabled>
                Portal Nacional (em breve)
              </option>
            </select>
            <small className="text-muted form-hint d-block mt-1">{t('nfse.providerHelp')}</small>
          </div>

          {formData.provider === 'ASAAS' && (
            <>
              <div className="mb-3">
                <label htmlFor="nfse_asaas_api_key" className="form-label">
                  {t('nfse.asaasApiKey')}
                </label>
                <input
                  type="password"
                  className="form-control"
                  id="nfse_asaas_api_key"
                  value={formData.asaas_api_key}
                  onChange={(e) => handleInputChange('asaas_api_key', e.target.value)}
                  disabled={disabled || saveMutation.isPending}
                  placeholder={
                    formData.has_asaas_api_key
                      ? 'Chave configurada — deixe em branco para manter'
                      : t('placeholder.apiToken')
                  }
                  autoComplete="off"
                />
                <small className="text-muted form-hint d-block mt-1">
                  {formData.has_asaas_api_key && !formData.asaas_api_key
                    ? 'Chave de API salva. Preencha apenas para alterar.'
                    : t('nfse.asaasApiKeyHelp')}
                </small>
              </div>

              <div className="mb-3">
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    id="nfse_asaas_sandbox"
                    checked={formData.asaas_sandbox}
                    onChange={(e) => handleInputChange('asaas_sandbox', e.target.checked)}
                    disabled={disabled || saveMutation.isPending}
                    style={{ cursor: 'pointer' }}
                  />
                  <label className="form-check-label" htmlFor="nfse_asaas_sandbox" style={{ cursor: 'pointer' }}>
                    {t('nfse.useSandbox')}
                  </label>
                </div>
                <small className="text-muted form-hint d-block mt-1">{t('nfse.useSandboxHelp')}</small>
              </div>
            </>
          )}

          {formData.provider === 'PORTAL_NACIONAL' && (
            <>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label htmlFor="nfse_portal_username" className="form-label">
                    {t('nfse.username')}
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="nfse_portal_username"
                    value={formData.portal_nacional_username}
                    onChange={(e) => handleInputChange('portal_nacional_username', e.target.value)}
                    disabled={disabled || saveMutation.isPending}
                    placeholder={t('nfse.username')}
                  />
                </div>

                <div className="col-md-6 mb-3">
                  <label htmlFor="nfse_portal_password" className="form-label">
                    {t('nfse.password')}
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    id="nfse_portal_password"
                    value={formData.portal_nacional_password}
                    onChange={(e) => handleInputChange('portal_nacional_password', e.target.value)}
                    disabled={disabled || saveMutation.isPending}
                    placeholder={
                      formData.has_portal_nacional_password
                        ? 'Senha configurada — deixe em branco para manter'
                        : t('nfse.password')
                    }
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className="row">
                <div className="col-md-8 mb-3">
                  <label htmlFor="nfse_portal_base_url" className="form-label">
                    {t('nfse.baseUrl')}
                  </label>
                  <input
                    type="url"
                    className="form-control"
                    id="nfse_portal_base_url"
                    value={formData.portal_nacional_base_url}
                    onChange={(e) => handleInputChange('portal_nacional_base_url', e.target.value)}
                    disabled={disabled || saveMutation.isPending}
                    placeholder="https://sefin.producaorestrita.nfse.gov.br/API/SefinNacional"
                  />
                </div>

                <div className="col-md-4 mb-3">
                  <label htmlFor="nfse_portal_ambiente" className="form-label">
                    {t('nfse.environment')}
                  </label>
                  <select
                    className="form-control"
                    id="nfse_portal_ambiente"
                    value={formData.portal_nacional_ambiente}
                    onChange={(e) =>
                      handleInputChange('portal_nacional_ambiente', e.target.value as 'HOMOLOGACAO' | 'PRODUCAO')
                    }
                    disabled={disabled || saveMutation.isPending}
                  >
                    <option value="HOMOLOGACAO">{t('nfse.homologation')}</option>
                    <option value="PRODUCAO">{t('nfse.production')}</option>
                  </select>
                </div>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default NFSeConfigSectionCore;
