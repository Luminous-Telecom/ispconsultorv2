import React, { useState, useMemo, useEffect, useLayoutEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { AssinaturaDigitalProviderService, AssinaturaDigitalProviderType } from 'services/assinaturaDigitalProviderService';
import DraggableModal from 'components/common/DraggableModal';
import { CancelarButton, SalvarButton, FormField, AtivoInativoField, Loading, IconOnlyButton } from 'components/ui';
import { useI18n } from 'contexts/I18nContext';

interface AssinaturaDigitalModalProps {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
  onHeaderActionsReady?: (actions: React.ReactNode) => void;
}

interface AssinaturaDigitalForm {
  habilitado: boolean;
  apiProvider: string;
  apiKey: string;
  accountId: string;
  diasExpiracaoPadrao: number;
}

const initialFormData: AssinaturaDigitalForm = {
  habilitado: false,
  apiProvider: 'assinafy',
  apiKey: '',
  accountId: '',
  diasExpiracaoPadrao: 30
};

const AssinaturaDigitalModal: React.FC<AssinaturaDigitalModalProps> = ({ show, onClose, skipWrapper = false, onHeaderActionsReady }) => {
  const { t } = useI18n();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<AssinaturaDigitalForm>(initialFormData);
  const [showApiKey, setShowApiKey] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<AssinaturaDigitalProviderType | null>(null);

  // Buscar provider habilitado quando o modal abrir
  const { data: enabledProviderResponse, isLoading: isLoadingEnabled } = useQuery({
    queryKey: ['assinatura-digital-provider-enabled'],
    queryFn: async () => {
      try {
        return await AssinaturaDigitalProviderService.getEnabled();
      } catch (error) {
        // Se não houver provider habilitado (404), retornar undefined (não é erro crítico)
        const axiosError = error as { response?: { status?: number } };
        if (axiosError.response?.status === 404) {
          return { success: false, data: undefined };
        }
        throw error; // Re-lançar outros erros
      }
    },
    staleTime: 0,
    refetchOnMount: true,
    retry: false,
    enabled: show, // Só buscar quando o modal estiver aberto
  });

  // Determinar o provider inicial: usar o habilitado se existir, senão usar o padrão
  const initialProvider = useMemo(() => {
    return enabledProviderResponse?.data?.provider || 'assinafy' as AssinaturaDigitalProviderType;
  }, [enabledProviderResponse?.data?.provider]);

  // Definir o provider selecionado quando o provider habilitado for carregado
  useEffect(() => {
    if (show && !isLoadingEnabled && initialProvider) {
      setSelectedProvider(initialProvider);
    } else if (!show) {
      // Resetar quando o modal fechar
      setSelectedProvider(null);
      setFormData(initialFormData);
    }
  }, [show, initialProvider, isLoadingEnabled]);

  // Buscar provider atual - só busca quando o provider selecionado estiver definido
  const { data: providerResponse, isLoading } = useQuery({
    queryKey: ['assinatura-digital-provider', selectedProvider],
    queryFn: async () => {
      if (!selectedProvider) return { success: false, data: undefined };
      try {
        return await AssinaturaDigitalProviderService.getByProvider(selectedProvider);
      } catch (error) {
        const axiosError = error as { response?: { status?: number } };
        if (axiosError.response?.status === 404) {
          return { success: false, data: undefined };
        }
        throw error;
      }
    },
    staleTime: 0,
    refetchOnMount: true,
    retry: false,
    enabled: show && !!selectedProvider, // Só buscar quando o modal estiver aberto e o provider selecionado
  });

  // Atualizar formData quando os dados do provider chegarem
  useEffect(() => {
    if (show && selectedProvider && !isLoading) {
      if (providerResponse?.data) {
        const p = providerResponse.data;
        setFormData({
          habilitado: p.habilitado ?? false,
          apiProvider: p.provider || selectedProvider,
          apiKey: p.api_key || '',
          accountId: p.account_id || '',
          diasExpiracaoPadrao: p.dias_expiracao_padrao || 30
        });
      } else {
        // Se não houver dados, usar valores padrão com o provider selecionado
        setFormData({
          ...initialFormData,
          apiProvider: selectedProvider
        });
      }
    }
  }, [show, selectedProvider, providerResponse?.data, isLoading]);

  const updateMutation = useMutation({
    mutationFn: async (data: AssinaturaDigitalForm) => {
      const dadosParaEnvio: {
        habilitado: boolean;
        api_key?: string;
        account_id?: string;
        dias_expiracao_padrao: number;
      } = {
        habilitado: data.habilitado,
        dias_expiracao_padrao: data.diasExpiracaoPadrao
      };

      if (data.apiKey) dadosParaEnvio.api_key = data.apiKey;
      if (data.accountId) dadosParaEnvio.account_id = data.accountId;

      await AssinaturaDigitalProviderService.upsert(
        data.apiProvider as AssinaturaDigitalProviderType,
        dadosParaEnvio
      );
    },
    onSuccess: () => {
      success(t('digitalSignature.successUpdate'));
      queryClient.invalidateQueries({ queryKey: ['assinatura-digital-provider'] });
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.ASSINATURA_DIGITAL_UPDATE_ERROR),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const headerActionsContent = useMemo(() => (
    <div className="d-flex gap-2 modal-header-actions">
      <CancelarButton
        type="button"
        onClick={onClose}
        isPending={updateMutation.isPending}
        disabled={updateMutation.isPending || isLoading || isLoadingEnabled}
      />
      <SalvarButton
        type="submit"
        form="assinatura-digital-form"
        isPending={updateMutation.isPending}
        disabled={isLoading || isLoadingEnabled}
      />
    </div>
  ), [onClose, updateMutation.isPending, isLoading, isLoadingEnabled]);

  // useLayoutEffect garante que os botões apareçam antes da pintura
  useLayoutEffect(() => {
    if (skipWrapper && onHeaderActionsReady) {
      onHeaderActionsReady(headerActionsContent);
    }
  }, [skipWrapper, onHeaderActionsReady, headerActionsContent]);

  const modalContent = (
    <>
      {(isLoading || isLoadingEnabled) ? (
        <Loading variant="centered" message={t('ui.loading')} />
      ) : (
      <form id="assinatura-digital-form" onSubmit={handleSubmit} className="form-modal-simple modal-inner-padding" autoComplete="off" data-form-type="other">
        <div className="card mb-3">
          <div className="card-header">
            <h6 className="mb-0">{t('digitalSignature.generalSettings')}</h6>
          </div>
          <div className="card-body">
            <div className="row g-2">
              <div className="col-12">
                <AtivoInativoField
                  name="habilitado"
                  label={t('digitalSignature.enable')}
                  value={formData.habilitado}
                  onChange={(v) => setFormData(prev => ({ ...prev, habilitado: v }))}
                  disabled={updateMutation.isPending}
                />
              </div>
              <div className="col-12">
                <FormField
                  name="apiProvider"
                  type="select"
                  label={t('digitalSignature.provider')}
                  helpText={t('digitalSignature.providerHelp')}
                  value={formData.apiProvider}
                  onChange={(v) => {
                    const newProvider = String(v ?? '') as AssinaturaDigitalProviderType;
                    setSelectedProvider(newProvider);
                    setFormData(prev => ({ ...prev, apiProvider: newProvider }));
                  }}
                  disabled={updateMutation.isPending}
                  options={[
                    { value: 'assinafy', label: 'Assinafy (100 assinaturas/mês grátis)' },
                    { value: 'zapsign', label: 'ZapSign (5 assinaturas/mês grátis)' },
                  ]}
                  size="sm"
                />
              </div>
              <div className="col-12">
                <FormField
                  name="diasExpiracaoPadrao"
                  type="number"
                  label={t('digitalSignature.expirationDays')}
                  helpText={t('digitalSignature.expirationDaysHelp')}
                  min={1}
                  max={365}
                  value={formData.diasExpiracaoPadrao}
                  onChange={(v) => setFormData(prev => ({ ...prev, diasExpiracaoPadrao: parseInt(String(v), 10) || 30 }))}
                  disabled={updateMutation.isPending}
                  size="sm"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="card mb-3">
          <div className="card-header">
            <h6 className="mb-0">{t('digitalSignature.apiSettings')}</h6>
          </div>
          <div className="card-body">
            <div className="row g-2">
              <div className="col-12">
                <FormField
                  name="apiKey"
                  type={showApiKey ? 'text' : 'password'}
                  label={t('digitalSignature.apiKey')}
                  helpText={formData.apiProvider === 'assinafy' ? t('digitalSignature.assinafyHelp') : t('digitalSignature.zapsignHelp')}
                  value={formData.apiKey}
                  autoComplete="new-password"
                  onChange={(v) => setFormData(prev => ({ ...prev, apiKey: String(v ?? '') }))}
                  disabled={updateMutation.isPending}
                  placeholder={t('placeholder.apiKey')}
                  size="sm"
                />
                <div className="form-modal-input-col mt-2">
                  <IconOnlyButton
                    type="button"
                    variant="outline-primary"
                    onClick={() => setShowApiKey(!showApiKey)}
                    disabled={updateMutation.isPending}
                    label={showApiKey ? 'Ocultar chave' : 'Mostrar chave'}
                  >
                    <i className={`bi ${showApiKey ? 'bi-eye-slash' : 'bi-eye'}`} aria-hidden />
                  </IconOnlyButton>
                </div>
                {formData.apiProvider === 'assinafy' && (
                  <small className="form-helper-message form-modal-input-col">
                    <a href="https://assinafy.com.br" target="_blank" rel="noopener noreferrer">
                      assinafy.com.br
                    </a>
                  </small>
                )}
              </div>

              {formData.apiProvider === 'assinafy' && (
                <div className="col-12">
                  <FormField
                    name="accountId"
                    type="text"
                    label={t('digitalSignature.workspaceId')}
                    helpText={t('digitalSignature.workspaceIdHelp')}
                    value={formData.accountId}
                    autoComplete="off"
                    onChange={(v) => setFormData(prev => ({ ...prev, accountId: String(v ?? '') }))}
                    disabled={updateMutation.isPending}
                    placeholder={t('placeholder.workspaceId')}
                    required
                    size="sm"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </form>
      )}
    </>
  );

  if (skipWrapper) {
    return modalContent;
  }

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={t('modal.digitalSignature')}
      size="md"
      modalId="assinatura-digital-modal"
      headerActions={headerActionsContent}
    >
      {modalContent}
    </DraggableModal>
  );
};

export default AssinaturaDigitalModal;
