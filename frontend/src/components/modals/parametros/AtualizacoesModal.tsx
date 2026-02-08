import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { formatDate } from '@/utils/formatters';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { apiService } from '@/services/api';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';
import DraggableModal from '@/components/common/DraggableModal';
import { Button } from '@/components/ui';
import { ApiResponse } from '@/types/api';
import { API_CONFIG } from '@/config/api';
import { useConfirmModal } from '@/hooks/useConfirmModal';
import ConfirmModal from '@/components/modals/ConfirmModal';
import { useI18n } from '@/contexts/I18nContext';
import { waitForBackendHealth } from '@/utils/healthCheck';

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
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const { success, error: showError } = useNotificationContext();
  const { confirm, modalProps } = useConfirmModal();
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState<string>('');
  const [updateProgressPercent, setUpdateProgressPercent] = useState<number>(0);
  const [versaoAtual, setVersaoAtual] = useState<string>('N/A');
  const [updateLogs, setUpdateLogs] = useState<string[]>([]);

  const { data: atualizacoes, isLoading, error } = useQuery<Atualizacao[]>({
    queryKey: ['atualizacoes'],
    queryFn: async (): Promise<Atualizacao[]> => {

      try {
        const response = await apiService.get('/atualizacoes') as ApiResponseWithVersao;


        if (response.success && response.data) {
          // A resposta tem estrutura { data: { data: [...], versao_atual: "..." } }
          const responseData = response.data as { data?: Atualizacao[]; versao_atual?: string };
          const atualizacoesArray = Array.isArray(responseData.data) ? responseData.data : [];
          const versao = responseData.versao_atual || 'N/A';
          setVersaoAtual(versao);

          return atualizacoesArray;
        }
        return [];
      } catch (err) {
        throw err;
      }
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
                if (done) {
                  break;
                }

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
                      setUpdateProgress(t('updates.concluded'));
                      setUpdateProgressPercent(100);
                      resolve();
                      return;
                    }
                  } catch (parseError) {
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

  /** Segundos de espera antes de começar o polling em /health (backend agenda pm2 restart em 5s). */
  const RESTART_GRACE_SECONDS = 6;

  const updateMutation = useMutation({
    mutationFn: (branch: string = 'main') => executeUpdateWithSSE(branch),
    onSuccess: async () => {
      success(t('updates.success'), {
        id: `update-success-${Date.now()}`,
        duration: 5000,
      });
      setUpdateProgressPercent(100);

      for (let s = RESTART_GRACE_SECONDS; s >= 1; s--) {
        setUpdateProgress(t('updates.restartInSeconds', { n: s }));
        await new Promise((r) => setTimeout(r, 1000));
      }

      setUpdateProgress(t('updates.waitingServer'));
      const ready = await waitForBackendHealth({
        maxAttempts: 45,
        delayMs: 1000,
        onAttempt: (attempt) =>
          setUpdateProgress(`${t('updates.waitingServer')} (${attempt}/45)`),
      });
      if (!ready) {
        success(t('updates.concluded'), {
          id: `update-reload-${Date.now()}`,
          duration: 4000,
        });
      }
      setUpdateProgress(t('updates.reloadingPage'));
      setTimeout(() => {
        window.location.reload();
      }, 800);
    },
    onError: (err: unknown) => {
      setIsUpdating(false);
      setUpdateProgress('');
      const error = err instanceof Error ? err.message : t('updates.error');
      showError(error);
    },
  });

  const handleUpdate = async () => {

    const confirmed = await confirm({
      message: t('updates.confirmUpdate'),
      variant: 'warning',
      title: t('updates.updateSystem'),
      confirmText: t('updates.updateSystem'),
      cancelText: t('actions.cancel'),
    });

    if (!confirmed) {
      return;
    }

    // Limpar logs anteriores
    setUpdateLogs([]);
    updateMutation.mutate('main');
  };

  const getTipoBadge = (tipo: string) => {
    const badges = {
      feature: { class: 'text-primary', bgClass: 'bg-primary bg-opacity-10', label: t('updates.badges.new'), icon: 'bi-star-fill' },
      bugfix: { class: 'text-danger', bgClass: 'bg-danger bg-opacity-10', label: t('updates.badges.bugfix'), icon: 'bi-bug-fill' },
      security: { class: 'text-warning', bgClass: 'bg-warning bg-opacity-10', label: t('updates.badges.security'), icon: 'bi-shield-fill' },
      melhoria: { class: 'text-info', bgClass: 'bg-info bg-opacity-10', label: t('updates.badges.improvement'), icon: 'bi-arrow-up-circle-fill' }
    };
    return badges[tipo as keyof typeof badges] || { class: 'text-secondary', bgClass: 'bg-secondary bg-opacity-10', label: t('updates.badges.other'), icon: 'bi-circle-fill' };
  };

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={t('updates.title')}
      size="md"
      modalId="atualizacoes-modal"
      headerActions={
        <div className="d-flex gap-2 modal-header-actions">
          {!isLoading && !error && atualizacoes && atualizacoes.length > 0 && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              leftIcon={<i className="bi bi-arrow-clockwise"></i>}
              onClick={handleUpdate}
              disabled={isUpdating || updateMutation.isPending}
              isLoading={isUpdating || updateMutation.isPending}
            >
              {t('updates.updateSystem')}
            </Button>
          )}
          <Button
            type="button"
            variant="primary"
            size="sm"
            leftIcon={<i className="bi bi-x-lg"></i>}
            onClick={onClose}
            disabled={isUpdating || updateMutation.isPending}
          >
            {t('buttons.close')}
          </Button>
        </div>
      }
    >
      <div style={{ padding: isMobile ? '0' : '12px' }}>
        {isLoading && (
          <div className="text-center py-4">
            <div className="spinner-border spinner-border-sm text-primary" role="status">
              <span className="visually-hidden">{t('messages.loading')}</span>
            </div>
            <p className="mt-2 mb-0 small text-muted">{t('updates.searching')}</p>
          </div>
        )}

        {error && (
          <div className="alert alert-warning py-2 px-3 mb-2" role="alert">
            <div className="d-flex align-items-center">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              <div className="flex-grow-1">
                <strong className="small">{t('updates.errorSearch')}</strong>
                <p className="mb-0 small mt-1">
                  {error instanceof Error 
                    ? error.message 
                    : t('updates.errorSearch')}
                </p>
              </div>
            </div>
          </div>
        )}

        {!isLoading && !error && atualizacoes && atualizacoes.length === 0 && (
          <div className="alert alert-info py-2 px-3 mb-0" role="alert">
            <div className="d-flex align-items-center">
              <i className="bi bi-info-circle-fill me-2"></i>
              <div>
                <strong className="small">{t('updates.noUpdates')}</strong>
                <p className="mb-0 small mt-1">{t('updates.systemUpdated')}</p>
              </div>
            </div>
          </div>
        )}

        {!isLoading && !error && atualizacoes && atualizacoes.length > 0 && (
          <div>
            <div className="d-flex justify-content-center mb-2">
              <div className="border text-center" style={{ 
                borderRadius: '0.375rem', 
                backgroundColor: 'var(--bg-tertiary)', 
                borderColor: 'var(--border-color)', 
                padding: '0.5rem 1rem',
                minWidth: '180px'
              }}>
                <span className="text-muted d-block mb-1" style={{ fontSize: '0.7rem' }}>{t('updates.currentVersion')}</span>
                <div className="fw-bold text-primary" style={{ fontSize: '0.9rem' }}>
                  <i className="bi bi-check-circle-fill text-success me-1" style={{ fontSize: '0.75rem' }}></i>
                  v{versaoAtual}
                </div>
              </div>
            </div>

            {/* Progresso da Atualização */}
            {isUpdating && updateProgress && (
              <div 
                className="mb-2" 
                role="alert"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--info-color)',
                  borderRadius: '0.375rem',
                  padding: '0.75rem',
                  color: 'var(--text-primary)'
                }}
              >
                <div className="d-flex align-items-center mb-2">
                  <div className="spinner-border spinner-border-sm text-primary me-2" role="status">
                    <span className="visually-hidden">{t('messages.loading')}</span>
                  </div>
                  <div className="flex-grow-1">
                    <strong className="small" style={{ color: 'var(--info-color)' }}>{t('updates.updating')}</strong>
                    <p className="mb-0 small mt-1" style={{ color: 'var(--text-secondary)' }}>{updateProgress}</p>
                  </div>
                </div>
                
                {/* Barra de Progresso */}
                <div className="mb-2">
                  <div 
                    className="progress" 
                    style={{ 
                      height: '20px', 
                      borderRadius: '0.25rem',
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
                      <span className="small fw-semibold" style={{ color: '#ffffff', fontSize: '0.7rem' }}>{updateProgressPercent}%</span>
                    </div>
                  </div>
                </div>

                {/* Logs da atualização */}
                {updateLogs.length > 0 && (
                  <div style={{ 
                    maxHeight: '150px', 
                    overflowY: 'auto', 
                    backgroundColor: 'var(--bg-tertiary)', 
                    color: 'var(--text-primary)',
                    padding: '0.5rem', 
                    borderRadius: '0.25rem', 
                    fontSize: '0.7rem', 
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
                    borderRadius: '0.375rem',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-tertiary)',
                    padding: '0.625rem',
                    transition: 'all 0.2s ease'
                  }}>
                    <div className="d-flex align-items-start">
                      <div className={`me-2 d-flex align-items-center justify-content-center ${badge.bgClass}`} style={{ 
                        width: '24px', 
                        height: '24px', 
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                        flexShrink: 0
                      }}>
                        <i className={`bi ${badge.icon} ${badge.class}`}></i>
                      </div>
                      <div className="flex-grow-1" style={{ fontSize: '0.875rem', minWidth: 0 }}>
                        <div className="d-flex justify-content-between align-items-start mb-1">
                          <div className="flex-grow-1">
                            <div className="fw-semibold d-inline-block me-2" style={{ fontSize: '0.875rem' }}>
                              v{atualizacao.versao}
                            </div>
                            <small className="text-muted d-inline-flex align-items-center" style={{ fontSize: '0.7rem' }}>
                              <i className="bi bi-calendar3 me-1"></i>
                              {formatDate(atualizacao.data)}
                            </small>
                          </div>
                          <span className={`badge ${badge.bgClass} ${badge.class} border-0`} style={{ fontSize: '0.65rem', padding: '0.2rem 0.4rem' }}>
                            {badge.label}
                          </span>
                        </div>
                        <p className="mb-0 text-secondary" style={{ fontSize: '0.8rem', lineHeight: '1.4' }}>
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

      {/* ConfirmModal */}
      {modalProps && <ConfirmModal {...modalProps} />}
    </DraggableModal>
  );
};

export default AtualizacoesModal;

