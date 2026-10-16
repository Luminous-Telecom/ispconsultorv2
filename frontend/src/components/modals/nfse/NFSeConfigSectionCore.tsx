import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { NFSeConfigUpdate } from 'services/nfseConfigService';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { useI18n } from 'contexts/I18nContext';
import { FormField, Loading } from 'components/ui';
import { NFSE_CONFIG_BY_VARIANT, type NFSeConfigVariant } from './nfseConfigVariants';
import PortalNacionalConfigFields from './PortalNacionalConfigFields';

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
    portal_nacional_ambiente: 'HOMOLOGACAO' as 'HOMOLOGACAO' | 'PRODUCAO',
    asaas_sandbox: false,
    provider: 'PORTAL_NACIONAL' as 'PORTAL_NACIONAL' | 'ASAAS',
    asaas_banco_habilitado: false,
    certificado_pfx_base64: '',
    certificado_senha: '',
    certificado_nome_arquivo: '',
    has_certificado: false,
    certificado_titular: '',
    certificado_cnpj: '',
    certificado_validade: '',
    op_simples_nacional: '1',
    regime_especial_tributacao: '0',
    regime_apuracao_sn: '',
    tp_ret_issqn: '1',
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
      const isAsaasHabilitado = configData.asaas_banco_habilitado ?? false;
      setFormData({
        codigo_servico_municipal: configData.codigo_servico_municipal || '',
        aliquota_iss: String(configData.aliquota_iss || 0),
        descricao_servico: configData.descricao_servico || '',
        serie_nf: configData.serie_nf || '80000',
        numero_dps: String(configData.numero_dps || 1),
        portal_nacional_ambiente: configData.portal_nacional_ambiente || 'HOMOLOGACAO',
        asaas_sandbox: configData.asaas_sandbox || false,
        provider: configData.provider === 'ASAAS' && isAsaasHabilitado ? 'ASAAS' : 'PORTAL_NACIONAL',
        asaas_banco_habilitado: isAsaasHabilitado,
        certificado_pfx_base64: '',
        certificado_senha: '',
        certificado_nome_arquivo: '',
        has_certificado: configData.has_certificado ?? false,
        certificado_titular: configData.certificado_titular || '',
        certificado_cnpj: configData.certificado_cnpj || '',
        certificado_validade: configData.certificado_validade || '',
        op_simples_nacional: String(configData.op_simples_nacional || 1),
        regime_especial_tributacao: String(configData.regime_especial_tributacao ?? 0),
        regime_apuracao_sn: configData.regime_apuracao_sn ? String(configData.regime_apuracao_sn) : '',
        tp_ret_issqn: String(configData.tp_ret_issqn || 1),
      });
    }
  }, [configData]);

  const testAuthMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (data.provider === 'ASAAS') {
        if (!data.asaas_banco_habilitado) {
          throw new Error(t('nfse.messages.providerRequired'));
        }

        const response = await api.testAuth({ provider: 'ASAAS' });
        if (!response.success) {
          throw new Error(response.message || t('nfse.messages.testError'));
        }
        return response.data;
      }
      if (data.provider === 'PORTAL_NACIONAL') {
        if (!data.has_certificado && !(data.certificado_pfx_base64 && data.certificado_senha)) {
          throw new Error(t('nfse.messages.certificateRequired'));
        }

        const response = await api.testAuth({
          provider: 'PORTAL_NACIONAL',
          portal_nacional_ambiente: data.portal_nacional_ambiente,
          certificado_pfx_base64: data.certificado_pfx_base64 || undefined,
          certificado_senha: data.certificado_senha || undefined,
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
        portal_nacional_ambiente: data.portal_nacional_ambiente,
        asaas_sandbox: data.asaas_sandbox,
        provider: data.provider,
        op_simples_nacional: parseInt(data.op_simples_nacional, 10) || 1,
        regime_especial_tributacao: parseInt(data.regime_especial_tributacao, 10) || 0,
        regime_apuracao_sn: data.regime_apuracao_sn ? parseInt(data.regime_apuracao_sn, 10) : null,
        tp_ret_issqn: parseInt(data.tp_ret_issqn, 10) || 1,
      };
      if (data.certificado_pfx_base64 && data.certificado_senha) {
        updateData.certificado_pfx_base64 = data.certificado_pfx_base64;
        updateData.certificado_senha = data.certificado_senha;
      }

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
      ? !!(formData.has_certificado || (formData.certificado_pfx_base64 && formData.certificado_senha))
      : formData.provider === 'ASAAS'
        ? formData.asaas_banco_habilitado
        : false;

  useEffect(() => {
    if (onSaveReady) onSaveReady(handleSave, saveMutation.isPending);
  }, [onSaveReady, saveMutation.isPending, handleSave]);

  useEffect(() => {
    if (onTestReady) onTestReady(handleTest, testAuthMutation.isPending, canTest);
  }, [onTestReady, testAuthMutation.isPending, canTest, handleTest]);

  const isFieldDisabled = disabled || saveMutation.isPending;
  const providerOptions = [
    ...(formData.asaas_banco_habilitado ? [{ value: 'ASAAS', label: 'Asaas' }] : []),
    { value: 'PORTAL_NACIONAL', label: t('nfse.providerPortal') },
  ];

  if (isLoading) {
    return (
      <div className="mb-3">
        <div className="form-section-heading-row">
          <span className="form-section-heading-pill">{t('nfse.title')}</span>
          <div className="form-section-heading-line" aria-hidden />
        </div>
        <Loading variant="centered" size="sm" message={t('ui.loading')} />
      </div>
    );
  }

  return (
    <div className="mb-3">
      <div className="form-section-heading-row">
        <span className="form-section-heading-pill">{t('nfse.title')}</span>
        <div className="form-section-heading-line" aria-hidden />
      </div>
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
                options={providerOptions}
                helpText={t('nfse.providerHelp')}
                size="sm"
              />
            </div>

            {formData.provider === 'PORTAL_NACIONAL' && (
              <PortalNacionalConfigFields
                formData={formData}
                disabled={isFieldDisabled}
                onChange={(field, value) => handleInputChange(field as keyof typeof formData, value)}
              />
            )}
          </div>
        </form>
    </div>
  );
};

export default NFSeConfigSectionCore;
