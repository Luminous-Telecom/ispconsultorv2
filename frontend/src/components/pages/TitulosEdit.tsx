import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TituloService } from '../../services/tituloService';
import { useNotificationContext } from '../../contexts/NotificationContext';
import MarcarPagoModal from '../modals/MarcarPagoModal';
import { getApiUrl } from '../../config/api';

const CarneParcelasEdit: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();
  
  const [formData, setFormData] = useState({
    valor_parcela: '',
    data_vencimento: '',
    status: 'pendente' as 'pendente' | 'pago' | 'vencido' | 'cancelado',
    data_pagamento: '',
    valor_pago: ''
  });

  const [showMarcarPagoModal, setShowMarcarPagoModal] = useState(false);

  // Buscar parcela
  const { data: parcela, isLoading } = useQuery({
    queryKey: ['carne-parcela', id],
    queryFn: () => TituloService.getById(Number(id)),
    enabled: !!id,
    placeholderData: (prev) => prev
  });

  // Mutação para atualizar parcela
  const updateMutation = useMutation({
    mutationFn: (data: any) => TituloService.update(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carne-parcela'] });
      queryClient.invalidateQueries({ queryKey: ['carne-parcelas'] });
      success('Parcela atualizada com sucesso!');
      navigate('/carne-parcelas');
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Erro ao atualizar parcela');
    }
  });

  useEffect(() => {
    if (parcela) {
      setFormData({
        valor_parcela: parcela.valor_parcela?.toString() || '',
        data_vencimento: parcela.data_vencimento ? new Date(parcela.data_vencimento).toISOString().split('T')[0] : '',
        status: parcela.status || 'pendente',
        data_pagamento: parcela.data_pagamento ? new Date(parcela.data_pagamento).toISOString().split('T')[0] : '',
        valor_pago: parcela.valor_pago?.toString() || ''
      });
    }
  }, [parcela]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = {
      valor_parcela: parseFloat(formData.valor_parcela),
      data_vencimento: formData.data_vencimento,
      status: formData.status,
      data_pagamento: formData.data_pagamento || null,
      valor_pago: formData.valor_pago ? parseFloat(formData.valor_pago) : null
    };

    updateMutation.mutate(submitData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Carregando...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <h1 className="h2">Editar Parcela #{parcela?.numero_parcela}</h1>
        <div className="btn-group" role="group">
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={() => navigate('/carne-parcelas')}
          >
            <i className="bi bi-arrow-left"></i> Voltar
          </button>
        </div>
      </div>

      <div className="row">
        <div className="col-lg-8">
          <div className="card shadow">
            <div className="card-header py-3">
              <h6 className="m-0 font-weight-bold text-primary">Dados da Parcela</h6>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="valor_parcela" className="form-label">Valor da Parcela *</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control"
                        id="valor_parcela"
                        name="valor_parcela"
                        value={formData.valor_parcela}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="data_vencimento" className="form-label">Data de Vencimento *</label>
                      <input
                        type="date"
                        className="form-control"
                        id="data_vencimento"
                        name="data_vencimento"
                        value={formData.data_vencimento}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="status" className="form-label">Status *</label>
                      <select
                        className="form-select"
                        id="status"
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="pendente">Pendente</option>
                        <option value="pago">Pago</option>
                        <option value="vencido">Vencido</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="data_pagamento" className="form-label">Data de Pagamento</label>
                      <input
                        type="date"
                        className="form-control"
                        id="data_pagamento"
                        name="data_pagamento"
                        value={formData.data_pagamento}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="valor_pago" className="form-label">Valor Pago</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control"
                        id="valor_pago"
                        name="valor_pago"
                        value={formData.valor_pago}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>

                <div className="d-flex justify-content-end">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Salvando...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check"></i> Salvar
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card shadow">
            <div className="card-header py-3">
              <h6 className="m-0 font-weight-bold text-primary">Informações do Carnê</h6>
            </div>
            <div className="card-body">
              <div><strong>Carnê:</strong> {(parcela as any)?.carne?.numero_carne || 'N/A'}</div>
              <div><strong>Cliente:</strong> {(parcela as any)?.carne?.cliente?.razao_social || 'N/A'}</div>
              <div><strong>Plano:</strong> {(parcela as any)?.carne?.plano?.nome_plano || 'N/A'}</div>
              <div><strong>Banco:</strong> {(parcela as any)?.carne?.banco?.nome || 'N/A'}</div>
            </div>
          </div>

          <div className="card shadow mt-3">
            <div className="card-header py-3">
              <h6 className="m-0 font-weight-bold text-primary">Ações Rápidas</h6>
            </div>
            <div className="card-body">
              <div className="d-grid gap-2">
                {formData.status === 'pendente' && (
                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={() => setShowMarcarPagoModal(true)}
                  >
                    Marcar como Pago
                  </button>
                )}
                {formData.status === 'pago' && (
                  <button
                    type="button"
                    className="btn btn-warning"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        status: 'pendente',
                        data_pagamento: '',
                        valor_pago: ''
                      }));
                    }}
                  >
                    <i className="bi bi-x"></i> Desmarcar Pagamento
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => window.open(getApiUrl(`/boleto/web/${id}`), '_blank')}
                >
                  <i className="bi bi-printer"></i> Imprimir Boleto
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal para marcar como pago */}
      <MarcarPagoModal
        isOpen={showMarcarPagoModal}
        onClose={() => setShowMarcarPagoModal(false)}
        parcela={parcela ? {
          id: parcela.id,
          numero_titulo: parcela.numero_titulo,
          valor_parcela: parseFloat(parcela.valor_parcela),
          data_vencimento: parcela.data_vencimento,
          cliente: parcela.cliente
        } : null}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['carne-parcela', id] });
          if (parcela) {
            setFormData(prev => ({
              ...prev,
              status: 'pago',
              data_pagamento: new Date().toISOString().split('T')[0],
              valor_pago: parcela.valor_parcela
            }));
          }
        }}
      />
    </>
  );
};

export default CarneParcelasEdit;
