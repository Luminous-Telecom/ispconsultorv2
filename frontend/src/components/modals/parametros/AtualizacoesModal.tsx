import React from 'react';
import { useQuery } from '@tanstack/react-query';
import DraggableModal from '../../common/DraggableModal';
import { formatDate } from '../../../utils/formatters';
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

  // Query para buscar atualizações
  const { data: atualizacoes, isLoading, error } = useQuery<Atualizacao[]>({
    queryKey: ['atualizacoes'],
    queryFn: async (): Promise<Atualizacao[]> => {
      // Buscar da API usando apiService
      const response = await apiService.get<Atualizacao[]>('/atualizacoes');
      // Retornar data.data pois a API retorna { success: true, data: [...] }
      return response.success ? (response.data ?? []) : [];
    },
    enabled: show,
    refetchOnWindowFocus: false,
    retry: false, // Não tentar novamente se falhar
  });

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
            <div className="d-flex justify-content-center mb-3">
              <div className="border text-center" style={{ 
                borderRadius: '0.5rem', 
                backgroundColor: 'var(--bg-tertiary)', 
                borderColor: 'var(--border-color)', 
                padding: '0.5rem 1.5rem',
                minWidth: '200px'
              }}>
                <span className="text-muted small d-block mb-1" style={{ fontSize: '0.7rem' }}>Versão Atual</span>
                <h6 className="mb-0 fw-bold text-primary" style={{ fontSize: '1rem' }}>
                  <i className="bi bi-check-circle-fill text-success me-1" style={{ fontSize: '0.875rem' }}></i>
                  v{atualizacoes[atualizacoes.length - 1].versao}
                </h6>
              </div>
            </div>

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

