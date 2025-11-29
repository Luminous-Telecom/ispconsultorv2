import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { formatDate } from '@/utils/formatters';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { apiService } from '@/services/api';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';
import DraggableModal from '@/components/common/DraggableModal';
import { ApiResponse } from '@/types/api';

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

interface ApiResponseWithVersao extends ApiResponse<Atualizacao[]> {
  versao_atual?: string;
}

interface UpdateResponse {
  success: boolean;
  message: string;
  steps: {
    gitPull: { success: boolean; stdout?: string; stderr?: string; error?: string };
    npmInstall: { success: boolean; stdout?: string; stderr?: string; error?: string };
    build: { success: boolean; stdout?: string; stderr?: string; error?: string };
    migrate: { success: boolean; stdout?: string; stderr?: string; error?: string };
    pm2Reload?: { success: boolean; stdout?: string; stderr?: string; error?: string };
  };
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
  const [versaoAtual, setVersaoAtual] = useState<string>('N/A');
  const [updateLogs, setUpdateLogs] = useState<string[]>([]);

  // Query para buscar atualizações
  const { data: atualizacoes, isLoading, error } = useQuery<Atualizacao[]>({
    queryKey: ['atualizacoes'],
    queryFn: async (): Promise<Atualizacao[]> => {
      try {
        // Buscar da API usando apiService
        // Backend retorna: { success: true, data: Atualizacao[], versao_atual: string }
        // ApiClient retorna: ApiResponse<BackendAtualizacoesResponse>
        // Então: response = { success: true, data: { success: true, data: [...], versao_atual: '...' } }
        const response = await apiService.get<Atualizacao[]>('/atualizacoes') as ApiResponseWithVersao;
        
        if (response.success) {
          let atualizacoesArray: Atualizacao[] = [];
          let versao: string = 'N/A';
          
          // Backend retorna: { success: true, data: [...], versao_atual: '...' }
          // ResponseTransformer.normalize pode colocar apenas o array em response.data
          // Mas versao_atual pode estar em response diretamente (não normalizado)
          
          // Caso 1: versao_atual está diretamente em response (não foi normalizado)
          if (response.versao_atual) {
            versao = response.versao_atual;
          }
          
          // Caso 2: response.data é o array diretamente (ResponseTransformer normalizou)
          if (Array.isArray(response.data)) {
            atualizacoesArray = response.data;
          }
          // Caso 3: response.data é o objeto completo com data e versao_atual
          else if (response.data && typeof response.data === 'object' && 'data' in response.data) {
            const backendResponse = response.data as BackendAtualizacoesResponse;
            if (backendResponse.versao_atual) {
              versao = backendResponse.versao_atual;
            }
            if (Array.isArray(backendResponse.data)) {
              atualizacoesArray = backendResponse.data;
            }
          }
          
          // Salvar versão atual do sistema
          setVersaoAtual(versao);
          
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
      setUpdateLogs(['Iniciando processo de atualização...']);
      
      try {
        // Timeout aumentado para 10 minutos (600000ms) pois o processo de atualização
        // pode levar vários minutos: git pull, npm install, build, migrations, pm2 reload
        const response = await apiService.post<UpdateResponse>(
          '/atualizacoes/update', 
          { branch },
          { timeout: 600000 } // 10 minutos
        );
        
        if (!response.success || !response.data) {
          throw new Error(response.message || response.data?.message || 'Erro ao executar atualização');
        }
        
        // Se response.data já é UpdateResponse, retornar diretamente
        // Se response.data tem a estrutura { success, message, steps }, usar response.data
        return response.data;
      } catch (error) {
        // Se for erro de conexão, pode ser que o backend tenha reiniciado com sucesso
        // mas a resposta não chegou. Vamos tratar isso no onError
        throw error;
      }
    },
    onSuccess: (data) => {
      // Adicionar logs dos steps executados
      const logs: string[] = [...updateLogs];
      logs.push('✓ Atualização concluída com sucesso!');
      
      if (data.steps) {
        if (data.steps.gitPull?.success) {
          logs.push('✓ Git Pull: concluído');
          if (data.steps.gitPull.stdout) {
            const lines = data.steps.gitPull.stdout.split('\n').filter(l => l.trim()).slice(-3);
            lines.forEach(line => logs.push(`  → ${line.substring(0, 100)}`));
          }
        }
        if (data.steps.npmInstall?.success) {
          logs.push('✓ NPM Install: concluído');
          if (data.steps.npmInstall.stdout) {
            const lines = data.steps.npmInstall.stdout.split('\n').filter(l => l.trim()).slice(-3);
            lines.forEach(line => logs.push(`  → ${line.substring(0, 100)}`));
          }
        }
        if (data.steps.build?.success) {
          logs.push('✓ Build: concluído');
          if (data.steps.build.stdout) {
            const lines = data.steps.build.stdout.split('\n').filter(l => l.trim()).slice(-3);
            lines.forEach(line => logs.push(`  → ${line.substring(0, 100)}`));
          }
        }
        if (data.steps.migrate?.success) {
          logs.push('✓ Migrations: concluído');
          if (data.steps.migrate.stdout) {
            const lines = data.steps.migrate.stdout.split('\n').filter(l => l.trim()).slice(-3);
            lines.forEach(line => logs.push(`  → ${line.substring(0, 100)}`));
          }
        }
        if (data.steps.pm2Reload?.success) {
          logs.push('✓ PM2 Reload: concluído');
          if (data.steps.pm2Reload.stdout) {
            const lines = data.steps.pm2Reload.stdout.split('\n').filter(l => l.trim()).slice(-3);
            lines.forEach(line => logs.push(`  → ${line.substring(0, 100)}`));
          }
        } else if (data.steps.pm2Reload && !data.steps.pm2Reload.success) {
          logs.push('⚠ PM2 Reload: concluído com avisos');
          if (data.steps.pm2Reload.stderr) {
            const lines = data.steps.pm2Reload.stderr.split('\n').filter(l => l.trim()).slice(-3);
            lines.forEach(line => logs.push(`  → ${line.substring(0, 100)}`));
          }
        }
      }
      
      setUpdateLogs(logs);
      setUpdateProgress('Atualização concluída! Backend reiniciado com sucesso.');
      
      // Mostrar sucesso ANTES de fechar o modal (verde)
      // Usar ID único e duração maior para garantir que apareça corretamente
      success(data.message || 'Atualização concluída com sucesso! A aplicação será reiniciada em breve.', {
        id: `update-success-${Date.now()}`,
        duration: 5000, // 5 segundos para garantir que seja vista
        type: 'success' // Forçar explicitamente
      });
      
      // Fechar modal após um pequeno delay para o usuário ver a mensagem de sucesso
      setTimeout(() => {
        setIsUpdating(false);
        onClose();
      }, 1500); // Aumentar delay para garantir que a notificação seja vista
      
      // Recarregar a página após um delay para garantir que o backend já reiniciou
      setTimeout(() => {
        window.location.reload();
      }, 3000); // Aguardar 3 segundos para o backend reiniciar antes de recarregar o frontend
    },
    onError: (err: unknown) => {
      setIsUpdating(false);
      setUpdateProgress('');
      
      // Verificar se é erro de conexão (backend reiniciando)
      const axiosError = err as AxiosError<{ message?: string; steps?: Record<string, { error?: string }> }>;
      
      // Se for erro de conexão após iniciar atualização, pode ser que o backend tenha reiniciado
      // mas isso não deveria acontecer mais, pois agora aguardamos o PM2 reload completar
      // Se acontecer, tratar como erro real
      if (axiosError.code === 'ECONNREFUSED' || axiosError.code === 'ETIMEDOUT' || axiosError.code === 'ERR_NETWORK' || 
          axiosError.code === 'ECONNABORTED' ||
          (axiosError.message && (axiosError.message.includes('Network Error') || axiosError.message.includes('timeout') || axiosError.message.includes('aborted')))) {
        // Se estava atualizando e deu erro de conexão, pode ser timeout ou erro real
        // Adicionar log de erro aos logs
        const logs: string[] = [...updateLogs];
        logs.push('✗ Erro de conexão durante atualização');
        logs.push('⚠ A atualização pode ter sido concluída, mas a conexão foi perdida');
        setUpdateLogs(logs);
        
        // Mostrar como aviso, não como erro definitivo
        showError('Erro de conexão durante atualização. Verifique se o backend reiniciou corretamente.');
        return;
      }
      
      // Se chegou aqui, é um erro real na atualização
      
      // Se chegou aqui, é um erro real na atualização
      // Verificar se há mensagem de erro específica nos steps
      const errorData = axiosError.response?.data;
      let errorMessage = 'Erro ao executar atualização';
      
      if (errorData?.message) {
        errorMessage = errorData.message;
      } else if (errorData?.steps) {
        // Tentar extrair mensagem de erro dos steps
        const steps = errorData.steps;
        const failedSteps = Object.entries(steps)
          .filter(([_, step]: [string, { error?: string; stderr?: string }]) => step?.error || step?.stderr)
          .map(([stepName, step]: [string, { error?: string; stderr?: string }]) => `${stepName}: ${step.error || step.stderr}`);
        
        if (failedSteps.length > 0) {
          errorMessage = `Falha na atualização: ${failedSteps.join('; ')}`;
        }
      } else if (axiosError.message) {
        errorMessage = axiosError.message;
      }
      
      // Mostrar erro real (vermelho)
      showError(errorMessage);
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
              <div className="alert alert-info mb-3" role="alert">
                <div className="d-flex align-items-center mb-2">
                  <div className="spinner-border spinner-border-sm text-primary me-2" role="status">
                    <span className="visually-hidden">Carregando...</span>
                  </div>
                  <div className="flex-grow-1">
                    <strong>Atualizando sistema...</strong>
                    <p className="mb-0 small mt-1">{updateProgress}</p>
                  </div>
                </div>
                {/* Logs da atualização */}
                {updateLogs.length > 0 && (
                  <div className="mt-2" style={{ maxHeight: '200px', overflowY: 'auto', backgroundColor: '#f8f9fa', padding: '0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                    {updateLogs.map((log, index) => (
                      <div key={index} className={log.startsWith('✗') ? 'text-danger' : log.startsWith('✓') ? 'text-success' : 'text-muted'}>
                        {log}
                      </div>
                    ))}
                  </div>
                )}
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

