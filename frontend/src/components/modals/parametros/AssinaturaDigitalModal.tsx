import React, { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { ParametrosService } from '@/services/parametrosService';
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

const AssinaturaDigitalModal: React.FC<AssinaturaDigitalModalProps> = ({ show, onClose }) => {
  const isMobile = useIsMobile();
  const { success, error: showError } = useNotificationContext();
  const queryClient = useQueryClient();

  const initialFormData: AssinaturaDigitalForm = {
    habilitado: false,
    apiProvider: 'assinafy',
    apiKey: '',
    accountId: '',
    diasExpiracaoPadrao: 30
  };

  const [formData, setFormData] = useState<AssinaturaDigitalForm>(initialFormData);
  const [showApiKey, setShowApiKey] = useState(false);

  // Buscar parâmetros
  const { data: parametrosResponse, isLoading } = useQuery({
    queryKey: ['parametros'],
    queryFn: () => ParametrosService.get(),
    staleTime: 60 * 1000,
    refetchOnMount: true,
  });

  const parametros = useMemo(() => {
    if (!parametrosResponse?.data) return undefined;
    const p = parametrosResponse.data;
    return {
      habilitado: p.assinatura_digital_habilitado ?? false,
      apiProvider: p.assinatura_digital_api_provider || 'assinafy',
      apiKey: p.assinatura_digital_api_key || '',
      accountId: p.assinatura_digital_account_id || '',
      diasExpiracaoPadrao: p.assinatura_digital_dias_expiracao_padrao || 30
    };
  }, [parametrosResponse?.data]);

  const customFormData = useMemo(() => {
    if (!parametros) return undefined;
    return parametros;
  }, [parametros]);

  useFormReset({
    show,
    initialData: initialFormData,
    setFormData,
    customData: customFormData
  });

  const updateMutation = useMutation({
    mutationFn: async (data: AssinaturaDigitalForm) => {
      const currentParams = parametrosResponse?.data;
      if (!currentParams) {
        throw new Error('Parâmetros não encontrados');
      }

      // Preparar dados para envio (remover campos undefined)
      const dadosParaEnvio: Record<string, unknown> = {
        validar_cpf_cnpj: currentParams.validar_cpf_cnpj,
        validar_cep: currentParams.validar_cep,
        titulos_vence_sabado: currentParams.titulos_vence_sabado,
        titulos_vence_domingo: currentParams.titulos_vence_domingo,
        auto_lancamento_titulos: currentParams.auto_lancamento_titulos,
        total_titulos_financeiro: currentParams.total_titulos_financeiro,
        assinatura_digital_habilitado: data.habilitado,
        assinatura_digital_api_provider: data.apiProvider,
        assinatura_digital_dias_expiracao_padrao: data.diasExpiracaoPadrao
      };

      // Adicionar api_key apenas se não estiver vazio
      if (data.apiKey) {
        dadosParaEnvio.assinatura_digital_api_key = data.apiKey;
      }

      // Adicionar account_id apenas se não estiver vazio
      if (data.accountId) {
        dadosParaEnvio.assinatura_digital_account_id = data.accountId;
      }

      // Manter URL da API do banco (não atualizar pelo frontend)
      if (currentParams.assinatura_digital_api_url) {
        dadosParaEnvio.assinatura_digital_api_url = currentParams.assinatura_digital_api_url;
      }

      await ParametrosService.update(dadosParaEnvio);
    },
    onSuccess: () => {
      success('Configurações de assinatura digital atualizadas com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['parametros'] });
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

  if (isLoading) {
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
                <option value="assinafy">Assinafy (Recomendado - 100 assinaturas/mês grátis)</option>
                <option value="zapsign">ZapSign</option>
                <option value="govbr">Gov.br (Apenas órgãos públicos)</option>
                <option value="outro">Outro</option>
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
                {formData.apiProvider === 'govbr' && 'Configure conforme documentação do Gov.br'}
                {formData.apiProvider === 'outro' && 'Configure conforme documentação do seu provedor'}
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
