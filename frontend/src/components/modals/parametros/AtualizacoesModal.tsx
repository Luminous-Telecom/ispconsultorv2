import React from 'react';
import { useQuery } from '@tanstack/react-query';
import DraggableModal from '../../common/DraggableModal';
import { useNotificationContext } from '../../../contexts/NotificationContext';
import { apiService } from '../../../services/api';

interface Atualizacao {
  versao: string;
  data: string;
  descricao: string;
  tipo: 'feature' | 'bugfix' | 'security' | 'melhoria';
}

interface AtualizacoesModalProps {
  show: boolean;
  onClose: () => void;
}

const AtualizacoesModal: React.FC<AtualizacoesModalProps> = ({ show, onClose }) => {
  const { addNotification } = useNotificationContext();

  // Query para buscar atualizações
  const { data: atualizacoes, isLoading, error } = useQuery({
    queryKey: ['atualizacoes'],
    queryFn: async () => {
      // Buscar da API usando apiService
      const response = await apiService.get<{ success: boolean; data: Atualizacao[] }>('/atualizacoes');
      // Retornar data.data pois a API retorna { success: true, data: [...] }
      return response.success ? response.data : [];
    },
    enabled: show,
    refetchOnWindowFocus: false,
    retry: false, // Não tentar novamente se falhar
  });

  const getTipoBadge = (tipo: string) => {
    const badges = {
      feature: { class: 'bg-primary', label: 'Nova Funcionalidade', icon: 'bi-star-fill' },
      bugfix: { class: 'bg-danger', label: 'Correção', icon: 'bi-bug-fill' },
      security: { class: 'bg-warning text-dark', label: 'Segurança', icon: 'bi-shield-fill' },
      melhoria: { class: 'bg-info', label: 'Melhoria', icon: 'bi-arrow-up-circle-fill' }
    };
    return badges[tipo as keyof typeof badges] || { class: 'bg-secondary', label: 'Outro', icon: 'bi-circle-fill' };
  };

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title="Atualizações do Sistema"
      size="md"
      modalId="atualizacoes-modal"
    >
      <div style={{ padding: '1rem' }}>
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
            <div>
              <strong>Erro ao buscar atualizações</strong>
              <p className="mb-0 small mt-1">Verifique a conexão ou configure o GitHub corretamente.</p>
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
            <div className="card mb-3 border" style={{ borderRadius: '0.5rem', backgroundColor: 'var(--bs-body-bg)', borderColor: 'var(--bs-border-color) !important' }}>
              <div className="card-body py-3">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <span className="text-muted small d-block mb-1">Versão Atual do Sistema</span>
                    <h5 className="mb-0 fw-bold text-primary">v{atualizacoes[atualizacoes.length - 1].versao}</h5>
                  </div>
                  <i className="bi bi-check-circle-fill text-success fs-2"></i>
                </div>
              </div>
            </div>

            <div className="list-group gap-2">
              {atualizacoes.map((atualizacao: Atualizacao, index: number) => {
                const badge = getTipoBadge(atualizacao.tipo);
                return (
                  <div key={atualizacao.versao} className="list-group-item list-group-item-action" style={{ 
                    borderRadius: '0.5rem',
                    border: '1px solid var(--bs-border-color)',
                    transition: 'all 0.2s ease'
                  }}>
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div className="d-flex align-items-start">
                        <i className={`bi ${badge.icon} ${badge.class} me-2`} style={{ fontSize: '1.25rem' }}></i>
                        <div>
                          <h6 className="mb-1 fw-semibold">
                            v{atualizacao.versao}
                          </h6>
                          <small className="text-muted d-flex align-items-center">
                            <i className="bi bi-calendar3 me-1"></i>
                            {new Date(atualizacao.data).toLocaleDateString('pt-BR', { 
                              day: '2-digit', 
                              month: 'long', 
                              year: 'numeric' 
                            })}
                          </small>
                        </div>
                      </div>
                      <span className={`badge ${badge.class} px-3 py-2`}>
                        {badge.label}
                      </span>
                    </div>
                    <p className="mb-0 text-secondary" style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>
                      {atualizacao.descricao}
                    </p>
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

