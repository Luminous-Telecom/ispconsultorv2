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
      feature: { class: 'bg-primary', label: 'Nova Funcionalidade' },
      bugfix: { class: 'bg-danger', label: 'Correção' },
      security: { class: 'bg-warning', label: 'Segurança' },
      melhoria: { class: 'bg-info', label: 'Melhoria' }
    };
    return badges[tipo as keyof typeof badges] || { class: 'bg-secondary', label: 'Outro' };
  };

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title="Atualizações"
      size="md"
      modalId="atualizacoes-modal"
    >
      <div style={{ padding: '1rem' }}>
        {isLoading && (
          <div className="text-center p-4">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Carregando...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="alert alert-info">
            <i className="bi bi-info-circle me-2"></i>
            Nenhuma atualização disponível no momento.
          </div>
        )}

        {!isLoading && atualizacoes && atualizacoes.length > 0 && (
          <div>
            <div className="mb-3">
              <strong>Versão Atual do Sistema:</strong>
              <span className="badge bg-success ms-2">{atualizacoes[atualizacoes.length - 1].versao}</span>
            </div>

            <div className="list-group">
              {atualizacoes.map((atualizacao: Atualizacao, index: number) => {
                const badge = getTipoBadge(atualizacao.tipo);
                return (
                  <div key={atualizacao.versao} className="list-group-item">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div>
                        <h6 className="mb-1">
                          Versão {atualizacao.versao}
                        </h6>
                        <small className="text-muted">
                          <i className="bi bi-calendar me-1"></i>
                          {new Date(atualizacao.data).toLocaleDateString('pt-BR')}
                        </small>
                      </div>
                      <span className={`badge ${badge.class}`}>
                        {badge.label}
                      </span>
                    </div>
                    <p className="mb-0">{atualizacao.descricao}</p>
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

