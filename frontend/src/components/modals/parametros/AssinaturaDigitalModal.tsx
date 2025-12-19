import React, { useState, useMemo, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { AssinaturaDigitalProviderService, AssinaturaDigitalProviderType } from '@/services/assinaturaDigitalProviderService';
import { useFormReset } from '@/hooks/useFormReset';
import DraggableModal from '@/components/common/DraggableModal';
import { Button } from '@/components/ui';

interface AssinaturaDigitalModalProps {
  show: boolean;
  onClose: () => void;
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

const AssinaturaDigitalModal: React.FC<AssinaturaDigitalModalProps> = ({ show, onClose }) => {
  const isMobile = useIsMobile();
  const { success, error: showError } = useNotificationContext();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<AssinaturaDigitalForm>(initialFormData);
  const [showApiKey, setShowApiKey] = useState(false);

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
    if (enabledProviderResponse?.data?.provider) {
      return enabledProviderResponse.data.provider;
    }
    return 'assinafy' as AssinaturaDigitalProviderType;
  }, [enabledProviderResponse?.data?.provider]);

  // Provider a ser usado: o selecionado no formData
  const currentProvider = formData.apiProvider || 'assinafy';

  // Buscar provider atual (usar enabled para evitar chamadas desnecessárias)
  const { data: providerResponse, isLoading, refetch } = useQuery({
    queryKey: ['assinatura-digital-provider', currentProvider],
    queryFn: async () => {
      try {
        return await AssinaturaDigitalProviderService.getByProvider(currentProvider as AssinaturaDigitalProviderType);
      } catch (error) {
        // Se o provider não existir (404), retornar undefined (não é erro crítico)
        const axiosError = error as { response?: { status?: number } };
        if (axiosError.response?.status === 404) {
          return { success: false, data: undefined };
        }
        throw error; // Re-lançar outros erros
      }
    },
    staleTime: 0, // Sempre buscar dados frescos quando o provider mudar
    refetchOnMount: true,
    retry: false, // Não tentar novamente se não encontrar (pode não existir ainda)
    enabled: show && !!currentProvider, // Só buscar quando o modal estiver aberto
  });

  const parametros = useMemo(() => {
    if (!providerResponse?.data) return undefined;
    const p = providerResponse.data;
    return {
      habilitado: p.habilitado ?? false,
      apiProvider: p.provider || currentProvider, // Usar o provider atual
      apiKey: p.api_key || '',
      accountId: p.account_id || '',
      diasExpiracaoPadrao: p.dias_expiracao_padrao || 30
    };
  }, [providerResponse?.data, currentProvider]);

  const customFormData = useMemo(() => {
    if (!parametros) {
      // Se não há dados do provider, retornar dados iniciais com o provider atual
      return {
        ...initialFormData,
        apiProvider: currentProvider
      };
    }
    return parametros;
  }, [parametros, currentProvider]);

  // Definir provider inicial quando o modal abrir e o provider habilitado for encontrado
  useEffect(() => {
    if (show && initialProvider && !isLoadingEnabled) {
      // Quando o modal abrir, definir o provider habilitado como inicial
      setFormData(prev => ({
        ...prev,
        apiProvider: initialProvider
      }));
    }
  }, [show, initialProvider, isLoadingEnabled]);

  // Atualizar formData quando os dados do provider chegarem
  useEffect(() => {
    if (show && customFormData) {
      setFormData(customFormData);
    }
  }, [show, customFormData]);

  // Quando o provider mudar, buscar os dados do novo provider
  useEffect(() => {
    if (show && currentProvider) {
      queryClient.invalidateQueries({ queryKey: ['assinatura-digital-provider', currentProvider] });
      refetch();
    }
  }, [currentProvider, show, queryClient, refetch]);

  useFormReset({
    show,
    initialData: initialFormData,
    setFormData,
    customData: customFormData
  });

  const updateMutation = useMutation({
    mutationFn: async (data: AssinaturaDigitalForm) => {
      // Preparar dados para envio (converter null para undefined)
      const dadosParaEnvio: {
        habilitado: boolean;
        api_key?: string;
        account_id?: string;
        dias_expiracao_padrao: number;
      } = {
        habilitado: data.habilitado,
        dias_expiracao_padrao: data.diasExpiracaoPadrao
      };

      // Adicionar api_key apenas se não estiver vazio
      if (data.apiKey) {
        dadosParaEnvio.api_key = data.apiKey;
      }

      // Adicionar account_id apenas se não estiver vazio
      if (data.accountId) {
        dadosParaEnvio.account_id = data.accountId;
      }

      // Usar upsert para criar ou atualizar
      await AssinaturaDigitalProviderService.upsert(
        data.apiProvider as AssinaturaDigitalProviderType,
        dadosParaEnvio
      );
    },
    onSuccess: () => {
      success('Configurações de assinatura digital atualizadas com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['assinatura-digital-provider'] });
    },
    onError: (error: unknown) => {
      const axiosError = error as AxiosError<{ message?: string; details?: unknown }>;
      const errorData = axiosError?.response?.data;
      const message = errorData?.message || 'Erro ao atualizar configurações';
      const details = errorData?.details;
      
      // Montar mensagem de erro detalhada
      let errorMessage = message;
      if (details) {
        if (Array.isArray(details)) {
          const detailMessages = details.map((d: { field?: string; message?: string }) => 
            d.field ? `${d.field}: ${d.message || ''}` : d.message || ''
          ).filter(Boolean);
          if (detailMessages.length > 0) {
            errorMessage = `${message}\n${detailMessages.join('\n')}`;
          }
        } else {
          errorMessage = `${message}: ${JSON.stringify(details)}`;
        }
      }
      
      showError(errorMessage);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleCancel = () => {
    if (parametros) {
      setFormData(parametros);
    }
    onClose();
  };

  if (isLoading || isLoadingEnabled) {
    return (
      <DraggableModal
        show={show}
        onClose={onClose}
        title="Assinatura Digital"
        size="md"
        modalId="assinatura-digital-modal-loading"
      >
        <div className="text-center p-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
        </div>
      </DraggableModal>
    );
  }

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title="Assinatura Digital Eletrônica"
      size="md"
      modalId="assinatura-digital-modal"
      headerActions={
        <div className="d-flex gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleCancel}
            disabled={updateMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="assinatura-digital-form"
            variant="primary"
            size="sm"
            isLoading={updateMutation.isPending}
          >
            Salvar
          </Button>
        </div>
      }
    >
      <form id="assinatura-digital-form" onSubmit={handleSubmit} style={{ padding: isMobile ? '0' : '16px' }}>
        <div className="card mb-3">
          <div className="card-header">
            <h6 className="mb-0">Configurações Gerais</h6>
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
                Habilitar Assinatura Digital
              </label>
              <div style={{ color: '#6c757d', fontSize: '0.875rem' }}>
                Ativa a funcionalidade de assinatura digital eletrônica no sistema
              </div>
            </div>

            <div className="mb-3">
              <label htmlFor="apiProvider" className="form-label">
                Provedor de API
              </label>
              <select
                className="form-select"
                id="apiProvider"
                value={formData.apiProvider}
                onChange={(e) => setFormData(prev => ({ ...prev, apiProvider: e.target.value }))}
                disabled={updateMutation.isPending}
              >
                <option value="assinafy">Assinafy (100 assinaturas/mês grátis)</option>
                <option value="zapsign">ZapSign (5 assinaturas/mês grátis)</option>
              </select>
              <div style={{ color: '#6c757d', fontSize: '0.875rem' }}>
                Selecione o provedor de API para assinatura digital
              </div>
            </div>

            <div className="mb-3">
              <label htmlFor="diasExpiracaoPadrao" className="form-label">
                Dias de Expiração Padrão
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
              <div style={{ color: '#6c757d', fontSize: '0.875rem' }}>
                Número de dias padrão para expiração de documentos enviados para assinatura (1 a 365 dias)
              </div>
            </div>
          </div>
        </div>

        <div className="card mb-3">
          <div className="card-header">
            <h6 className="mb-0">Configurações da API</h6>
          </div>
          <div className="card-body">
            <div className="mb-3">
              <label htmlFor="apiKey" className="form-label">
                API Key
              </label>
              <div className="input-group">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  className="form-control"
                  id="apiKey"
                  value={formData.apiKey}
                  onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                  disabled={updateMutation.isPending}
                  placeholder="Cole sua API Key aqui"
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowApiKey(!showApiKey)}
                  disabled={updateMutation.isPending}
                >
                  <i className={`bi ${showApiKey ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                </button>
              </div>
              <div style={{ color: '#6c757d', fontSize: '0.875rem' }}>
                {formData.apiProvider === 'assinafy' && (
                  <>
                    Obtenha sua API Key gratuita em{' '}
                    <a href="https://assinafy.com.br" target="_blank" rel="noopener noreferrer">
                      assinafy.com.br
                    </a>
                    {' '}(100 assinaturas/mês grátis)
                  </>
                )}
                {formData.apiProvider === 'zapsign' && 'Obtenha sua API Key no painel do ZapSign'}
              </div>
            </div>

            {formData.apiProvider === 'assinafy' && (
              <div className="mb-3">
                <label htmlFor="accountId" className="form-label">
                  Workspace Account ID <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="accountId"
                  value={formData.accountId}
                  onChange={(e) => setFormData(prev => ({ ...prev, accountId: e.target.value }))}
                  disabled={updateMutation.isPending}
                  placeholder="ID do workspace (obtido em My Account > Workspaces)"
                  required
                />
                <div style={{ color: '#6c757d', fontSize: '0.875rem' }}>
                  Workspace Account ID obtido no painel Assinafy: My Account &gt; Workspaces
                </div>
              </div>
            )}
          </div>
        </div>

        {formData.apiProvider === 'assinafy' && (
          <div className="alert alert-info">
            <strong>Assinafy:</strong> Plano gratuito com 100 assinaturas mensais. 
            Ideal para começar a usar assinatura digital sem custos.
          </div>
        )}
      </form>
    </DraggableModal>
  );
};

export default AssinaturaDigitalModal;
