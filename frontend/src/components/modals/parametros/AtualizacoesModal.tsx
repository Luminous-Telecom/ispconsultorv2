import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { formatDate } from '@/utils/formatters';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { apiService } from '@/services/api';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';
import DraggableModal from '@/components/common/DraggableModal';
import { ApiResponse } from '@/types/api';
import { API_CONFIG } from '@/config/api';

interface Atualizacao {
  versao: string;
  data: string;
  descricao: string;
  tipo: 'feature' | 'bugfix' | 'security' | 'melhoria';
}

interface ApiResponseWithVersao extends ApiResponse<Atualizacao[]> {
  versao_atual?: string;
}

interface AtualizacoesModalProps {
  show: boolean;
  onClose: () => void;
}

const AtualizacoesModal: React.FC<AtualizacoesModalProps> = ({ show, onClose }) => {
  const isMobile = useIsMobile();
  const { success, error: showError } = useNotificationContext();
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState<string>('');
  const [updateProgressPercent, setUpdateProgressPercent] = useState<number>(0);
  const [versaoAtual, setVersaoAtual] = useState<string>('N/A');
  const [updateLogs, setUpdateLogs] = useState<string[]>([]);

  const { data: atualizacoes, isLoading, error } = useQuery<Atualizacao[]>({
    queryKey: ['atualizacoes'],
    queryFn: async (): Promise<Atualizacao[]> => {
      const response = await apiService.get<Atualizacao[]>('/atualizacoes') as ApiResponseWithVersao;
      
      if (response.success) {
        const atualizacoesArray = Array.isArray(response.data) ? response.data : [];
        const versao = response.versao_atual || 'N/A';
        setVersaoAtual(versao);
        return atualizacoesArray;
      }
      return [];
    },
    enabled: show,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const executeUpdateWithSSE = async (branch: string = 'main'): Promise<void> => {
    return new Promise((resolve, reject) => {
      setIsUpdating(true);
      setUpdateProgress('Iniciando atualização...');
      setUpdateProgressPercent(0);
      setUpdateLogs(['Iniciando processo de atualização...']);

      const token = localStorage.getItem('auth_token');
      if (!token) {
        reject(new Error('Token de autenticação não encontrado'));
        return;
      }

      const url = `${API_CONFIG.BASE_URL}/atualizacoes/update-stream?branch=${encodeURIComponent(branch)}`;
      
      fetch(url, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      })
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error('Response body não disponível');
          }

          const decoder = new TextDecoder();
          const processStream = async () => {
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const lines = decoder.decode(value, { stream: true }).split('\n');
                for (const line of lines) {
                  if (!line.startsWith('data: ')) continue;
                  
                  try {
                    const data = JSON.parse(line.substring(6));
                    
                    if (data.error) {
                      setIsUpdating(false);
                      setUpdateLogs(prev => [...prev, `✗ Erro: ${data.error}`]);
                      reject(new Error(data.error));
                      return;
                    }

                    if (data.step && data.progress !== undefined && data.message) {
                      setUpdateProgress(data.message);
                      setUpdateProgressPercent(data.progress);
                      if (data.logs?.length) {
                        setUpdateLogs(prev => [...prev, ...data.logs]);
                      }
                    }

                    if (data.success || (data.step === 'finalizado' && data.progress === 100)) {
                      setIsUpdating(false);
                      setUpdateProgress('Atualização concluída!');
                      setUpdateProgressPercent(100);
                      resolve();
                      return;
                    }
                  } catch {
                    // Ignorar erros de parsing
                  }
                }
              }
            } catch (streamError) {
              reject(streamError);
            }
          };

          processStream();
        })
        .catch(error => {
          setIsUpdating(false);
          setUpdateProgress('');
          setUpdateProgressPercent(0);
          reject(error);
        });
    });
  };

  const updateMutation = useMutation({
    mutationFn: (branch: string = 'main') => executeUpdateWithSSE(branch),
    onSuccess: () => {
      success('Atualização concluída com sucesso! A aplicação será reiniciada em breve.', {
        id: `update-success-${Date.now()}`,
        duration: 5000,
      });
      setTimeout(() => {
        setIsUpdating(false);
        onClose();
        setTimeout(() => window.location.reload(), 1500);
      }, 1500);
    },
    onError: (err: unknown) => {
      setIsUpdating(false);
      setUpdateProgress('');
      const error = err instanceof Error ? err.message : 'Erro ao executar atualização';
      showError(error);
    },
  });

  const handleUpdate = () => {
    if (!window.confirm('Tem certeza que deseja atualizar o sistema? Esta ação irá:\n\n1. Baixar as últimas alterações do repositório\n2. Atualizar dependências\n3. Compilar o código\n4. Executar migrations do banco de dados\n5. Reiniciar a aplicação\n\nO processo pode levar alguns minutos.')) {
      return;
    }

    // Limpar logs anteriores
    setUpdateLogs([]);
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
                {error instanceof Error 
                  ? error.message 
                  : 'Verifique a conexão ou configure o GitHub corretamente.'}
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
              <div 
                className="mb-3" 
                role="alert"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--info-color)',
                  borderRadius: '0.375rem',
                  padding: '1rem',
                  color: 'var(--text-primary)'
                }}
              >
                <div className="d-flex align-items-center mb-2">
                  <div className="spinner-border spinner-border-sm text-primary me-2" role="status">
                    <span className="visually-hidden">Carregando...</span>
                  </div>
                  <div className="flex-grow-1">
                    <strong style={{ color: 'var(--info-color)' }}>Atualizando sistema...</strong>
                    <p className="mb-0 small mt-1" style={{ color: 'var(--text-secondary)' }}>{updateProgress}</p>
                  </div>
                </div>
                
                {/* Barra de Progresso */}
                <div className="mt-3 mb-2">
                  <div 
                    className="progress" 
                    style={{ 
                      height: '24px', 
                      borderRadius: '0.375rem',
                      backgroundColor: 'var(--bg-tertiary)'
                    }}
                  >
                    <div 
                      className="progress-bar progress-bar-striped progress-bar-animated bg-primary" 
                      role="progressbar" 
                      style={{ width: `${updateProgressPercent}%` }}
                      aria-valuenow={updateProgressPercent} 
                      aria-valuemin={0} 
                      aria-valuemax={100}
                    >
                      <span className="small fw-semibold" style={{ color: '#ffffff' }}>{updateProgressPercent}%</span>
                    </div>
                  </div>
                </div>

                {/* Logs da atualização */}
                {updateLogs.length > 0 && (
                  <div className="mt-2" style={{ 
                    maxHeight: '200px', 
                    overflowY: 'auto', 
                    backgroundColor: 'var(--bg-secondary)', 
                    color: 'var(--text-primary)',
                    padding: '0.5rem', 
                    borderRadius: '0.25rem', 
                    fontSize: '0.75rem', 
                    fontFamily: 'monospace',
                    border: '1px solid var(--border-color)'
                  }}>
                    {updateLogs.map((log, index) => (
                      <div key={index} className={log.startsWith('✗') ? 'text-danger' : log.startsWith('✓') ? 'text-success' : log.startsWith('⚠') ? 'text-warning' : 'text-muted'}>
                        {log}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {atualizacoes.map((atualizacao: Atualizacao) => {
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

