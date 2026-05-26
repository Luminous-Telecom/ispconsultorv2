import React, { useState, useMemo, useEffect, useLayoutEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useIsMobile } from 'hooks/useMediaQuery';
import { AssinaturaDigitalProviderService, AssinaturaDigitalProviderType } from 'services/assinaturaDigitalProviderService';
import DraggableModal from 'components/common/DraggableModal';
import { CancelarButton, SalvarButton } from 'components/ui';
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
  const isMobile = useIsMobile();
  const { success, error: showError } = useNotificationContext();
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
    onError: (error: unknown) => {
      const axiosError = error as AxiosError<{ message?: string }>;
      showError(axiosError?.response?.data?.message || t('digitalSignature.errorUpdate'));
    }
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
        <div className="text-center p-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">{t('ui.loading')}</span>
          </div>
        </div>
      ) : (
      <form id="assinatura-digital-form" onSubmit={handleSubmit} style={{ padding: isMobile ? '0' : '16px' }} autoComplete="off" data-form-type="other">
        <div className="card mb-3">
          <div className="card-header">
            <h6 className="mb-0">{t('digitalSignature.generalSettings')}</h6>
          </div>
          <div className="card-body">
            <div className="form-check mb-3">
              <input
                type="checkbox"
                className="form-check-input"
                id="habilitado"
                checked={formData.habilitado}
                onChange={(e) => setFormData(prev => ({ ...prev, habilitado: e.target.checked }))}
                disabled={updateMutation.isPending}
              />
              <label className="form-check-label" htmlFor="habilitado">
                {t('digitalSignature.enable')}
                <i
                  className="bi bi-info-circle text-muted ms-1"
                  style={{ cursor: 'help', fontSize: '0.85rem' }}
                  title={t('digitalSignature.enableHelp')}
                />
              </label>
            </div>

            <div className="mb-3">
              <label htmlFor="apiProvider" className="form-label">
                {t('digitalSignature.provider')}
                <i
                  className="bi bi-info-circle text-muted ms-1"
                  style={{ cursor: 'help', fontSize: '0.85rem' }}
                  title={t('digitalSignature.providerHelp')}
                />
              </label>
              <select
                className="form-select"
                id="apiProvider"
                value={formData.apiProvider}
                onChange={(e) => {
                  const newProvider = e.target.value as AssinaturaDigitalProviderType;
                  setSelectedProvider(newProvider);
                  setFormData(prev => ({ ...prev, apiProvider: newProvider }));
                }}
                disabled={updateMutation.isPending}
              >
                <option value="assinafy">Assinafy (100 assinaturas/mês grátis)</option>
                <option value="zapsign">ZapSign (5 assinaturas/mês grátis)</option>
              </select>
            </div>

            <div className="mb-3">
              <label htmlFor="diasExpiracaoPadrao" className="form-label">
                {t('digitalSignature.expirationDays')}
                <i
                  className="bi bi-info-circle text-muted ms-1"
                  style={{ cursor: 'help', fontSize: '0.85rem' }}
                  title={t('digitalSignature.expirationDaysHelp')}
                />
              </label>
              <input
                type="number"
                className="form-control"
                id="diasExpiracaoPadrao"
                min="1"
                max="365"
                value={formData.diasExpiracaoPadrao}
                onChange={(e) => setFormData(prev => ({ ...prev, diasExpiracaoPadrao: parseInt(e.target.value) || 30 }))}
                disabled={updateMutation.isPending}
              />
            </div>
          </div>
        </div>

        <div className="card mb-3">
          <div className="card-header">
            <h6 className="mb-0">{t('digitalSignature.apiSettings')}</h6>
          </div>
          <div className="card-body">
            <div className="mb-3">
              <label htmlFor="apiKey" className="form-label">
                {t('digitalSignature.apiKey')}
                <i
                  className="bi bi-info-circle text-muted ms-1"
                  style={{ cursor: 'help', fontSize: '0.85rem' }}
                  title={formData.apiProvider === 'assinafy' ? t('digitalSignature.assinafyHelp') : t('digitalSignature.zapsignHelp')}
                />
              </label>
              <div className="input-group">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  className="form-control"
                  id="apiKey"
                  value={formData.apiKey}
                  autoComplete="new-password"
                  onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                  disabled={updateMutation.isPending}
                  placeholder={t('placeholder.apiKey')}
                />
                <button
                  type="button"
                  className="btn btn-outline-primary"
                  onClick={() => setShowApiKey(!showApiKey)}
                  disabled={updateMutation.isPending}
                >
                  <i className={`bi ${showApiKey ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                </button>
              </div>
              {formData.apiProvider === 'assinafy' && (
                <small className="form-text text-muted">
                  <a href="https://assinafy.com.br" target="_blank" rel="noopener noreferrer">
                    assinafy.com.br
                  </a>
                </small>
              )}
            </div>

            {formData.apiProvider === 'assinafy' && (
              <div className="mb-3">
                <label htmlFor="accountId" className="form-label">
                  {t('digitalSignature.workspaceId')} <span className="text-danger">*</span>
                  <i
                    className="bi bi-info-circle text-muted ms-1"
                    style={{ cursor: 'help', fontSize: '0.85rem' }}
                    title={t('digitalSignature.workspaceIdHelp')}
                  />
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="accountId"
                  value={formData.accountId}
                  autoComplete="off"
                  onChange={(e) => setFormData(prev => ({ ...prev, accountId: e.target.value }))}
                  disabled={updateMutation.isPending}
                  placeholder={t('placeholder.workspaceId')}
                  required
                />
              </div>
            )}
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
