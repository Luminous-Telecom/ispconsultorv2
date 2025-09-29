import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CarneService } from '../../services/carneService';
import { ClienteService } from '../../services/clienteService';
import { PlanoService } from '../../services/planoService';
import { BancoService } from '../../services/bancoService';
import { useNotificationContext } from '../../contexts/NotificationContext';

interface CarneForm {
  cliente_id: number;
  plano_id: number;
  banco_id: number;
  numero_carne: string;
  carnet_id?: string;
  valor_total: number;
  quantidade_parcelas: number;
  data_vencimento_primeira: string;
  status: 'ativo' | 'pago' | 'cancelado' | 'parcial' | 'pendente' | 'registrado';
  observacoes?: string;
  codigo_barras?: string;
  linha_digitavel?: string;
}

interface CarneEditModalProps {
  show: boolean;
  onClose: () => void;
  carneId: number | null;
  onSuccess?: () => void;
}

const CarneEditModal: React.FC<CarneEditModalProps> = ({ 
  show, 
  onClose, 
  carneId, 
  onSuccess 
}) => {
  const [formData, setFormData] = useState<CarneForm>({
    cliente_id: 0,
    plano_id: 0,
    banco_id: 0,
    numero_carne: '',
    carnet_id: '',
    valor_total: 0,
    quantidade_parcelas: 1,
    data_vencimento_primeira: '',
    status: 'ativo',
    observacoes: '',
    codigo_barras: '',
    linha_digitavel: '',
  });

  const [errors, setErrors] = useState<Partial<CarneForm>>({});
  const { success, error } = useNotificationContext();
  const queryClient = useQueryClient();

  // Query para buscar carnê
  const { data: carne, isLoading: carneLoading } = useQuery({
    queryKey: ['carne', carneId],
    queryFn: () => CarneService.getById(carneId!),
    enabled: !!carneId && show,
  });

  // Queries para buscar dados
  const { data: clientes } = useQuery({
    queryKey: ['clientes-ativos'],
    queryFn: () => ClienteService.listAtivos(),
    enabled: show,
  });

  const { data: planos } = useQuery({
    queryKey: ['planos-ativos'],
    queryFn: () => PlanoService.findAtivos(),
    enabled: show,
  });

  const { data: bancos } = useQuery({
    queryKey: ['bancos-ativos'],
    queryFn: () => BancoService.findAtivos(),
    enabled: show,
  });

  // Mutation para atualizar carnê
  const updateCarneMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CarneForm }) => CarneService.update(id, data),
    onSuccess: () => {
      success('Carnê atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['carnes'] });
      queryClient.invalidateQueries({ queryKey: ['carne', carneId] });
      onClose();
      onSuccess?.();
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Erro ao atualizar carnê');
    }
  });

  // Carregar dados do carnê quando disponível
  useEffect(() => {
    if (carne) {
      setFormData({
        cliente_id: carne.cliente_id || 0,
        plano_id: carne.plano_id || 0,
        banco_id: carne.banco_id || 0,
        numero_carne: carne.numero_carne || '',
        carnet_id: carne.carnet_id || '',
        valor_total: carne.valor_total || 0,
        quantidade_parcelas: carne.quantidade_parcelas || 1,
        data_vencimento_primeira: carne.data_vencimento_primeira || '',
        status: carne.status || 'ativo',
        observacoes: carne.observacoes || '',
        codigo_barras: carne.codigo_barras || '',
        linha_digitavel: carne.linha_digitavel || '',
      });
    }
  }, [carne]);

  // Limpar formulário quando modal fechar
  useEffect(() => {
    if (!show) {
      setFormData({
        cliente_id: 0,
        plano_id: 0,
        banco_id: 0,
        numero_carne: '',
        carnet_id: '',
        valor_total: 0,
        quantidade_parcelas: 1,
        data_vencimento_primeira: '',
        status: 'ativo',
        observacoes: '',
        codigo_barras: '',
        linha_digitavel: '',
      });
      setErrors({});
    }
  }, [show]);

  const handleInputChange = (field: keyof CarneForm, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: any = {};

    if (!formData.cliente_id) newErrors.cliente_id = 'Cliente é obrigatório';
    if (!formData.plano_id) newErrors.plano_id = 'Plano é obrigatório';
    if (!formData.banco_id) newErrors.banco_id = 'Banco é obrigatório';
    if (!formData.numero_carne) newErrors.numero_carne = 'Número do carnê é obrigatório';
    if (!formData.valor_total || formData.valor_total <= 0) newErrors.valor_total = 'Valor total deve ser maior que zero';
    if (!formData.quantidade_parcelas || formData.quantidade_parcelas <= 0) newErrors.quantidade_parcelas = 'Quantidade de parcelas deve ser maior que zero';
    if (!formData.data_vencimento_primeira) newErrors.data_vencimento_primeira = 'Data de vencimento é obrigatória';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !carneId) return;

    updateCarneMutation.mutate({
      id: carneId,
      data: formData
    });
  };

  const handleCancel = () => {
    onClose();
  };

  if (!show) return null;

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Editar Carnê</h5>
            <button
              type="button"
              className="btn-close"
              onClick={handleCancel}
              disabled={updateCarneMutation.isPending}
            ></button>
          </div>
          
          <div className="modal-body">
            {carneLoading ? (
              <div className="text-center py-4">
                <div className="spinner-border" role="status">
                  <span className="visually-hidden">Carregando...</span>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="cliente_id" className="form-label">Cliente *</label>
                      <select
                        className={`form-select ${errors.cliente_id ? 'is-invalid' : ''}`}
                        id="cliente_id"
                        value={formData.cliente_id}
                        onChange={(e) => handleInputChange('cliente_id', parseInt(e.target.value))}
                        disabled={updateCarneMutation.isPending}
                      >
                        <option value={0}>Selecione um cliente</option>
                        {clientes?.map((cliente: any) => (
                          <option key={cliente.id} value={cliente.id}>
                            {cliente.razao_social || cliente.nome_fantasia}
                          </option>
                        ))}
                      </select>
                      {errors.cliente_id && <div className="invalid-feedback">{errors.cliente_id}</div>}
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="plano_id" className="form-label">Plano *</label>
                      <select
                        className={`form-select ${errors.plano_id ? 'is-invalid' : ''}`}
                        id="plano_id"
                        value={formData.plano_id}
                        onChange={(e) => handleInputChange('plano_id', parseInt(e.target.value))}
                        disabled={updateCarneMutation.isPending}
                      >
                        <option value={0}>Selecione um plano</option>
                        {planos?.map((plano: any) => (
                          <option key={plano.id} value={plano.id}>
                            {plano.nome_plano} - R$ {plano.valor_mensal}
                          </option>
                        ))}
                      </select>
                      {errors.plano_id && <div className="invalid-feedback">{errors.plano_id}</div>}
                    </div>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="banco_id" className="form-label">Banco *</label>
                      <select
                        className={`form-select ${errors.banco_id ? 'is-invalid' : ''}`}
                        id="banco_id"
                        value={formData.banco_id}
                        onChange={(e) => handleInputChange('banco_id', parseInt(e.target.value))}
                        disabled={updateCarneMutation.isPending}
                      >
                        <option value={0}>Selecione um banco</option>
                        {bancos?.map((banco: any) => (
                          <option key={banco.id} value={banco.id}>
                            {banco.nome}
                          </option>
                        ))}
                      </select>
                      {errors.banco_id && <div className="invalid-feedback">{errors.banco_id}</div>}
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="numero_carne" className="form-label">Número do Carnê *</label>
                      <input
                        type="text"
                        className={`form-control ${errors.numero_carne ? 'is-invalid' : ''}`}
                        id="numero_carne"
                        value={formData.numero_carne}
                        onChange={(e) => handleInputChange('numero_carne', e.target.value)}
                        disabled={updateCarneMutation.isPending}
                        placeholder="Ex: CAR2024001"
                      />
                      {errors.numero_carne && <div className="invalid-feedback">{errors.numero_carne}</div>}
                    </div>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-4">
                    <div className="mb-3">
                      <label htmlFor="valor_total" className="form-label">Valor Total *</label>
                      <input
                        type="number"
                        step="0.01"
                        className={`form-control ${errors.valor_total ? 'is-invalid' : ''}`}
                        id="valor_total"
                        value={formData.valor_total}
                        onChange={(e) => handleInputChange('valor_total', parseFloat(e.target.value) || 0)}
                        disabled={updateCarneMutation.isPending}
                        placeholder="0.00"
                      />
                      {errors.valor_total && <div className="invalid-feedback">{errors.valor_total}</div>}
                    </div>
                  </div>

                  <div className="col-md-4">
                    <div className="mb-3">
                      <label htmlFor="quantidade_parcelas" className="form-label">Quantidade de Parcelas *</label>
                      <input
                        type="number"
                        min="1"
                        max="60"
                        className={`form-control ${errors.quantidade_parcelas ? 'is-invalid' : ''}`}
                        id="quantidade_parcelas"
                        value={formData.quantidade_parcelas}
                        onChange={(e) => handleInputChange('quantidade_parcelas', parseInt(e.target.value) || 1)}
                        disabled={updateCarneMutation.isPending}
                      />
                      {errors.quantidade_parcelas && <div className="invalid-feedback">{errors.quantidade_parcelas}</div>}
                    </div>
                  </div>

                  <div className="col-md-4">
                    <div className="mb-3">
                      <label htmlFor="data_vencimento_primeira" className="form-label">Data de Vencimento *</label>
                      <input
                        type="date"
                        className={`form-control ${errors.data_vencimento_primeira ? 'is-invalid' : ''}`}
                        id="data_vencimento_primeira"
                        value={formData.data_vencimento_primeira}
                        onChange={(e) => handleInputChange('data_vencimento_primeira', e.target.value)}
                        disabled={updateCarneMutation.isPending}
                      />
                      {errors.data_vencimento_primeira && <div className="invalid-feedback">{errors.data_vencimento_primeira}</div>}
                    </div>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="status" className="form-label">Status</label>
                      <select
                        className="form-select"
                        id="status"
                        value={formData.status}
                        onChange={(e) => handleInputChange('status', e.target.value)}
                        disabled={updateCarneMutation.isPending}
                      >
                        <option value="ativo">Ativo</option>
                        <option value="pago">Pago</option>
                        <option value="cancelado">Cancelado</option>
                        <option value="parcial">Parcial</option>
                        <option value="pendente">Pendente</option>
                        <option value="registrado">Registrado</option>
                      </select>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="carnet_id" className="form-label">ID do Carnet (Banco)</label>
                      <input
                        type="text"
                        className="form-control"
                        id="carnet_id"
                        value={formData.carnet_id}
                        onChange={(e) => handleInputChange('carnet_id', e.target.value)}
                        disabled={updateCarneMutation.isPending}
                        placeholder="ID fornecido pelo banco"
                      />
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <label htmlFor="observacoes" className="form-label">Observações</label>
                  <textarea
                    className={`form-control ${errors.observacoes ? 'is-invalid' : ''}`}
                    id="observacoes"
                    rows={3}
                    value={formData.observacoes}
                    onChange={(e) => handleInputChange('observacoes', e.target.value)}
                    disabled={updateCarneMutation.isPending}
                    placeholder="Observações adicionais sobre o carnê"
                  ></textarea>
                  {errors.observacoes && <div className="invalid-feedback">{errors.observacoes}</div>}
                </div>

                <div className="d-flex justify-content-end gap-2 mt-4">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCancel}
                    disabled={updateCarneMutation.isPending}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={updateCarneMutation.isPending}
                  >
                    {updateCarneMutation.isPending ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Salvando...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check"></i> Salvar Alterações
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CarneEditModal;
