import React, { useState, useMemo, useEffect, useLayoutEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { useIsMobile } from 'hooks/useMediaQuery';
import { AssinaturaDigitalProviderService, AssinaturaDigitalProviderType } from 'services/assinaturaDigitalProviderService';
import DraggableModal from 'components/common/DraggableModal';
import { CancelarButton, SalvarButton, LabelWithHelp, Loading } from 'components/ui';
import Button from 'components/ui/Button';
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
      <form id="assinatura-digital-form" onSubmit={handleSubmit} className="modal-inner-padding" autoComplete="off" data-form-type="other">
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
              <LabelWithHelp htmlFor="habilitado" className="form-check-label" helpText={t('digitalSignature.enableHelp')}>
                {t('digitalSignature.enable')}
              </LabelWithHelp>
            </div>

            <div className="mb-3">
              <LabelWithHelp htmlFor="apiProvider" className="form-label" helpText={t('digitalSignature.providerHelp')}>
                {t('digitalSignature.provider')}
              </LabelWithHelp>
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
              <LabelWithHelp htmlFor="diasExpiracaoPadrao" className="form-label" helpText={t('digitalSignature.expirationDaysHelp')}>
                {t('digitalSignature.expirationDays')}
              </LabelWithHelp>
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
              <LabelWithHelp
                htmlFor="apiKey"
                className="form-label"
                helpText={formData.apiProvider === 'assinafy' ? t('digitalSignature.assinafyHelp') : t('digitalSignature.zapsignHelp')}
              >
                {t('digitalSignature.apiKey')}
              </LabelWithHelp>
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
                <Button
                  type="button"
                  variant="outline-primary"
                  onClick={() => setShowApiKey(!showApiKey)}
                  disabled={updateMutation.isPending}
                  aria-label={showApiKey ? 'Ocultar chave' : 'Mostrar chave'}
                >
                  <i className={`bi ${showApiKey ? 'bi-eye-slash' : 'bi-eye'}`} aria-hidden />
                </Button>
              </div>
              {formData.apiProvider === 'assinafy' && (
                <small className="form-text form-hint text-muted">
                  <a href="https://assinafy.com.br" target="_blank" rel="noopener noreferrer">
                    assinafy.com.br
                  </a>
                </small>
              )}
            </div>

            {formData.apiProvider === 'assinafy' && (
              <div className="mb-3">
                <LabelWithHelp htmlFor="accountId" className="form-label" helpText={t('digitalSignature.workspaceIdHelp')} required>
                  {t('digitalSignature.workspaceId')}
                </LabelWithHelp>
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
