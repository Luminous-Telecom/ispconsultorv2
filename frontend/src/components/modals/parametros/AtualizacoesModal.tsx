import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { formatDate } from '@/utils/formatters';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { apiService } from '@/services/api';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';
import DraggableModal from '@/components/common/DraggableModal';

interface Atualizacao {
  versao: string;
  data: string;
  descricao: string;
  tipo: 'feature' | 'bugfix' | 'security' | 'melhoria';
}

interface BackendAtualizacoesResponse {
  success: boolean;
  data: Atualizacao[];
  versao_atual: string;
}

interface UpdateResponse {
  success: boolean;
  message: string;
  steps: {
    gitPull: { success: boolean };
    npmInstall: { success: boolean };
    build: { success: boolean };
    migrate: { success: boolean };
  };
}

interface AtualizacoesModalProps {
  show: boolean;
  onClose: () => void;
}

const AtualizacoesModal: React.FC<AtualizacoesModalProps> = ({ show, onClose }) => {
  const isMobile = useIsMobile();
  const { success, error: showError } = useNotificationContext();
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState<string>('');
  const [versaoAtual, setVersaoAtual] = useState<string>('N/A');

  // Query para buscar atualizações
  const { data: atualizacoes, isLoading, error } = useQuery<Atualizacao[]>({
    queryKey: ['atualizacoes'],
    queryFn: async (): Promise<Atualizacao[]> => {
      try {
        // Buscar da API usando apiService
        // Backend retorna: { success: true, data: Atualizacao[], versao_atual: string }
        // ApiClient retorna: ApiResponse<BackendAtualizacoesResponse>
        // Então: response = { success: true, data: { success: true, data: [...], versao_atual: '...' } }
        const response = await apiService.get<BackendAtualizacoesResponse>('/atualizacoes');
        
        if (response.success && response.data) {
          let atualizacoesArray: Atualizacao[] = [];
          let versao: string = 'N/A';
          
          // response.data contém a resposta do backend: { success: true, data: [...], versao_atual: '...' }
          const backendResponse = response.data as BackendAtualizacoesResponse;
          
          // Verificar se tem propriedade 'data' (array) e 'versao_atual'
          if (backendResponse && typeof backendResponse === 'object') {
            if (backendResponse.data && Array.isArray(backendResponse.data)) {
              atualizacoesArray = backendResponse.data;
              versao = backendResponse.versao_atual || 'N/A';
            } 
            // Se response.data é diretamente um array (caso o ResponseTransformer não tenha normalizado)
            else if (Array.isArray(backendResponse)) {
              atualizacoesArray = backendResponse;
            }
          }
          
          // Salvar versão atual do sistema
          if (versao && versao !== 'N/A') {
            setVersaoAtual(versao);
          }
          
          return atualizacoesArray;
        }
        return [];
      } catch (err) {
        // Se houver erro, lançar novamente para o React Query tratar
        throw err;
      }
    },
    enabled: show,
    refetchOnWindowFocus: false,
    retry: false, // Não tentar novamente se falhar
  });

  // Mutation para executar atualização
  const updateMutation = useMutation({
    mutationFn: async (branch: string = 'main'): Promise<UpdateResponse> => {
      setIsUpdating(true);
      setUpdateProgress('Iniciando atualização...');
      
      const response = await apiService.post<UpdateResponse>('/atualizacoes/update', { branch });
      
      if (!response.success || !response.data) {
        throw new Error(response.message || response.data?.message || 'Erro ao executar atualização');
      }
      
      // Se response.data já é UpdateResponse, retornar diretamente
      // Se response.data tem a estrutura { success, message, steps }, usar response.data
      return response.data;
    },
    onSuccess: (data) => {
      setUpdateProgress('Atualização concluída! Reiniciando aplicação...');
      success(data.message || 'Atualização concluída com sucesso! A aplicação será reiniciada em breve.');
      
      // Invalidar query de atualizações para recarregar após reinício
      queryClient.invalidateQueries({ queryKey: ['atualizacoes'] });
      
      // Fechar modal após alguns segundos
      setTimeout(() => {
        setIsUpdating(false);
        setUpdateProgress('');
        onClose();
      }, 3000);
    },
    onError: (err: unknown) => {
      setIsUpdating(false);
      setUpdateProgress('');
      const axiosError = err as AxiosError<{ message?: string; steps?: Record<string, { error?: string }> }>;
      const errorMessage = axiosError.response?.data?.message || 'Erro ao executar atualização';
      showError(errorMessage);
    },
  });

  const handleUpdate = () => {
    if (!window.confirm('Tem certeza que deseja atualizar o sistema? Esta ação irá:\n\n1. Baixar as últimas alterações do repositório\n2. Atualizar dependências\n3. Compilar o código\n4. Executar migrations do banco de dados\n5. Reiniciar a aplicação\n\nO processo pode levar alguns minutos.')) {
      return;
    }

    updateMutation.mutate('main');
  };

  const getTipoBadge = (tipo: string) => {
    const badges = {
      feature: { class: 'text-primary', bgClass: 'bg-primary bg-opacity-10', label: 'Nova', icon: 'bi-star-fill' },
      bugfix: { class: 'text-danger', bgClass: 'bg-danger bg-opacity-10', label: 'Correção', icon: 'bi-bug-fill' },
      security: { class: 'text-warning', bgClass: 'bg-warning bg-opacity-10', label: 'Segurança', icon: 'bi-shield-fill' },
      melhoria: { class: 'text-info', bgClass: 'bg-info bg-opacity-10', label: 'Melhoria', icon: 'bi-arrow-up-circle-fill' }
    };
    return badges[tipo as keyof typeof badges] || { class: 'text-secondary', bgClass: 'bg-secondary bg-opacity-10', label: 'Outro', icon: 'bi-circle-fill' };
  };

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title="Atualizações do Sistema"
      size="md"
      modalId="atualizacoes-modal"
    >
      <div style={{ padding: isMobile ? '0' : '16px' }}>
        {isLoading && (
          <div className="text-center p-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Carregando...</span>
            </div>
            <p className="mt-3 text-muted">Buscando atualizações...</p>
          </div>
        )}

        {error && (
          <div className="alert alert-warning d-flex align-items-center" role="alert">
            <i className="bi bi-exclamation-triangle-fill me-2 fs-5"></i>
            <div className="flex-grow-1">
              <strong>Erro ao buscar atualizações</strong>
              <p className="mb-0 small mt-1">
                {(() => {
                  // Tentar extrair mensagem do erro
                  if (error instanceof Error) {
                    return error.message;
                  }
                  // Se for um objeto com propriedade message
                  if (error && typeof error === 'object' && 'message' in error) {
                    return String((error as { message: unknown }).message);
                  }
                  // Se for um objeto com propriedade response (AxiosError)
                  if (error && typeof error === 'object' && 'response' in error) {
                    const axiosError = error as { response?: { data?: { message?: string } } };
                    return axiosError.response?.data?.message || 'Erro ao conectar com o servidor';
                  }
                  // Mensagem padrão
                  return 'Verifique a conexão ou configure o GitHub corretamente. Configure as variáveis GITHUB_REPO e GITHUB_TOKEN no backend se necessário.';
                })()}
              </p>
            </div>
          </div>
        )}

        {!isLoading && !error && atualizacoes && atualizacoes.length === 0 && (
          <div className="alert alert-info d-flex align-items-center" role="alert">
            <i className="bi bi-info-circle-fill me-2 fs-5"></i>
            <div>
              <strong>Nenhuma atualização disponível</strong>
              <p className="mb-0 small mt-1">O sistema está atualizado com a versão mais recente.</p>
            </div>
          </div>
        )}

        {!isLoading && !error && atualizacoes && atualizacoes.length > 0 && (
          <div>
            <div className="d-flex justify-content-center mb-3">
              <div className="border text-center" style={{ 
                borderRadius: '0.5rem', 
                backgroundColor: 'var(--bg-tertiary)', 
                borderColor: 'var(--border-color)', 
                padding: '0.5rem 1.5rem',
                minWidth: '200px'
              }}>
                <span className="text-muted small d-block mb-1" style={{ fontSize: '0.7rem' }}>Versão Atual do Sistema</span>
                <h6 className="mb-0 fw-bold text-primary" style={{ fontSize: '1rem' }}>
                  <i className="bi bi-check-circle-fill text-success me-1" style={{ fontSize: '0.875rem' }}></i>
                  v{versaoAtual}
                </h6>
              </div>
            </div>

            {/* Botão de Atualizar */}
            <div className="d-flex justify-content-center mb-3">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleUpdate}
                disabled={isUpdating || updateMutation.isPending}
                style={{ minWidth: '200px' }}
              >
                {isUpdating || updateMutation.isPending ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Atualizando...
                  </>
                ) : (
                  'Atualizar Sistema'
                )}
              </button>
            </div>

            {/* Progresso da Atualização */}
            {isUpdating && updateProgress && (
              <div className="alert alert-info d-flex align-items-center mb-3" role="alert">
                <div className="spinner-border spinner-border-sm text-primary me-2" role="status">
                  <span className="visually-hidden">Carregando...</span>
                </div>
                <div className="flex-grow-1">
                  <strong>Atualizando sistema...</strong>
                  <p className="mb-0 small mt-1">{updateProgress}</p>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[...atualizacoes].reverse().map((atualizacao: Atualizacao) => {
                const badge = getTipoBadge(atualizacao.tipo);
                return (
                  <div key={atualizacao.versao} className="border" style={{ 
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-tertiary)',
                    padding: '0.75rem',
                    transition: 'all 0.2s ease'
                  }}>
                    <div className="d-flex align-items-start mb-1">
                      <div className={`me-2 d-flex align-items-center justify-content-center ${badge.bgClass}`} style={{ 
                        width: '28px', 
                        height: '28px', 
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem'
                      }}>
                        <i className={`bi ${badge.icon} ${badge.class}`}></i>
                      </div>
                      <div className="flex-grow-1" style={{ fontSize: '0.875rem' }}>
                        <div className="d-flex justify-content-between align-items-start mb-1">
                          <div className="flex-grow-1">
                            <h6 className="mb-0 fw-semibold" style={{ fontSize: '0.95rem' }}>
                              v{atualizacao.versao}
                            </h6>
                            <small className="text-muted d-flex align-items-center" style={{ fontSize: '0.75rem' }}>
                              <i className="bi bi-calendar3 me-1" style={{ fontSize: '0.7rem' }}></i>
                              {formatDate(atualizacao.data)}
                            </small>
                          </div>
                          <div className="d-flex align-items-center gap-2">
                            <span className={`badge ${badge.bgClass} ${badge.class} border-0`} style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}>
                              {badge.label}
                            </span>
                          </div>
                        </div>
                        <p className="mb-0 text-secondary mt-1" style={{ fontSize: '0.8rem', lineHeight: '1.4' }}>
                          {atualizacao.descricao}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </DraggableModal>
  );
};

export default AtualizacoesModal;

