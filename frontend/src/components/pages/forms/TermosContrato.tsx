import React, { useState } from 'react';
import { useTermosContrato, useCreateTermoContrato, useMarcarTermoComoAceito, useDeactivateTermoContrato } from '../../../hooks/useTermosContrato';
import { TermoContrato, CreateTermoContratoData } from '../../../services/TermoContratoService';

interface TermosContratoProps {
  contratoId: number;
}

const TermosContrato: React.FC<TermosContratoProps> = ({ contratoId }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [selectedTermo, setSelectedTermo] = useState<TermoContrato | null>(null);
  const [aceitoPor, setAceitoPor] = useState('');
  const [formData, setFormData] = useState<CreateTermoContratoData>({
    modelo_termo_id: null,
    assinado: 'NAO'
  });

  const { data: termos, isLoading } = useTermosContrato(contratoId);
  const createMutation = useCreateTermoContrato();
  const acceptMutation = useMarcarTermoComoAceito();
  const deactivateMutation = useDeactivateTermoContrato();

  // Garantir que termos seja sempre um array
  const termosArray = Array.isArray(termos) ? termos : [];

  const handleCreate = async () => {
    try {
      await createMutation.mutateAsync({ contratoId, data: formData });
      setShowCreateModal(false);
      setFormData({ modelo_termo_id: null, assinado: 'NAO' });
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const handleAccept = async () => {
    if (!selectedTermo || !aceitoPor.trim()) return;
    
    try {
      await acceptMutation.mutateAsync({ id: selectedTermo.id, aceitoPor });
      setShowAcceptModal(false);
      setAceitoPor('');
      setSelectedTermo(null);
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const handleDeactivate = async (termo: TermoContrato) => {
    if (window.confirm('Tem certeza que deseja desativar este termo?')) {
      try {
        await deactivateMutation.mutateAsync(termo.id);
      } catch (error) {
        // Error handling is done in the mutation
      }
    }
  };

  if (isLoading) {
    return <div>Carregando termos...</div>;
  }

  return (
    <div>
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h6 className="mb-0">Termos do Contrato</h6>
          <button 
            className="btn btn-primary btn-sm"
            onClick={() => setShowCreateModal(true)}
          >
            Adicionar Termo
          </button>
        </div>
        <div className="card-body">
          {termosArray.length === 0 ? (
            <div className="alert alert-info">
              Nenhum termo cadastrado para este contrato.
            </div>
          ) : (
            <div className="row">
              {termosArray.map((termo: TermoContrato) => (
                <div key={termo.id} className="col-md-6 mb-3">
                  <div className="card h-100">
                    <div className="card-header d-flex justify-content-between align-items-center">
                      <div>
                        <span className={`badge ${termo.assinado === 'SIM' ? 'bg-success' : 'bg-secondary'}`}>
                          {termo.assinado}
                        </span>
                        {termo.ativo && (
                          <span className="badge bg-success ms-2">Ativo</span>
                        )}
                        {!termo.ativo && (
                          <span className="badge bg-secondary ms-2">Inativo</span>
                        )}
                      </div>
                      <div>
                        {termo.ativo && !termo.data_aceite && (
                          <button
                            className="btn btn-outline-success btn-sm me-1"
                            onClick={() => {
                              setSelectedTermo(termo);
                              setShowAcceptModal(true);
                            }}
                          >
                            Aceitar
                          </button>
                        )}
                        {termo.ativo && (
                          <button
                            className="btn btn-outline-warning btn-sm"
                            onClick={() => handleDeactivate(termo)}
                          >
                            Desativar
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="card-body">
                      <div className="mb-2">
                        <strong>Conteúdo:</strong>
                        <div 
                          className="border rounded p-2 mt-1" 
                          style={{ 
                            maxHeight: '150px', 
                            overflowY: 'auto',
                            fontSize: '0.9em',
                            backgroundColor: '#f8f9fa'
                          }}
                        >
                          {termo.modelo_termo_id ? 'Conteúdo vinculado ao modelo de termo' : 'Sem conteúdo'}
                        </div>
                      </div>

                      {termo.data_aceite && (
                        <div className="mb-2">
                          <strong>Aceito em:</strong>
                          <p className="mb-0 text-success">
                            {new Date(termo.data_aceite).toLocaleDateString('pt-BR')} por {termo.aceito_por}
                          </p>
                        </div>
                      )}

                      <small className="text-muted">
                        Criado em: {new Date(termo.created_at).toLocaleDateString('pt-BR')}
                      </small>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal para criar termo */}
      {showCreateModal && (
        <div className="modal show d-block" tabIndex={-1}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Adicionar Termo</h5>
                <button type="button" className="btn-close" onClick={() => setShowCreateModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Assinado</label>
                      <div className="d-flex gap-3 mt-2">
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="radio"
                            name="assinado"
                            id="assinadoSim"
                            value="SIM"
                            checked={formData.assinado === 'SIM'}
                            onChange={() => setFormData({ ...formData, assinado: 'SIM' })}
                          />
                          <label className="form-check-label" htmlFor="assinadoSim">
                            Sim
                          </label>
                        </div>
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="radio"
                            name="assinado"
                            id="assinadoNao"
                            value="NAO"
                            checked={formData.assinado === 'NAO'}
                            onChange={() => setFormData({ ...formData, assinado: 'NAO' })}
                          />
                          <label className="form-check-label" htmlFor="assinadoNao">
                            Não
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mb-3">
                  <label className="form-label">Modelo de Termo</label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.modelo_termo_id || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, modelo_termo_id: parseInt(e.target.value) || null })}
                    placeholder="ID do modelo de termo..."
                    required
                  />
                  <div className="form-text">
                    Digite o ID do modelo de termo cadastrado no sistema
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancelar
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handleCreate}
                  disabled={!formData.modelo_termo_id || createMutation.isPending}
                >
                  {createMutation.isPending ? 'Criando...' : 'Criar Termo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para aceitar termo */}
      {showAcceptModal && (
        <div className="modal show d-block" tabIndex={-1}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Aceitar Termo</h5>
                <button type="button" className="btn-close" onClick={() => setShowAcceptModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Nome de quem está aceitando</label>
                  <input
                    type="text"
                    className="form-control"
                    value={aceitoPor}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAceitoPor(e.target.value)}
                    placeholder="Digite seu nome..."
                  />
                </div>
                
                {selectedTermo && (
                  <div className="alert alert-info">
                    <strong>Termo:</strong> {selectedTermo.assinado === 'SIM' ? 'Assinado' : 'Não Assinado'}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAcceptModal(false)}>
                  Cancelar
                </button>
                <button 
                  type="button" 
                  className="btn btn-success" 
                  onClick={handleAccept}
                  disabled={!aceitoPor.trim() || acceptMutation.isPending}
                >
                  {acceptMutation.isPending ? 'Aceitando...' : 'Aceitar Termo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TermosContrato;
