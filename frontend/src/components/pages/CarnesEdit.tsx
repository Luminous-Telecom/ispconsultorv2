import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { CarneService } from '../../services/carneService';
import { ClienteService } from '../../services/clienteService';
import { PlanoService } from '../../services/planoService';
import { BancoService } from '../../services/bancoService';
import { useNotification } from '../../hooks/useNotification';

interface CarneForm {
  cliente_id: number;
  plano_id: number;
  banco_id: number;
  numero_carne: string;
  carnet_id?: string;
  valor_total: number;
  quantidade_parcelas: number;
  data_vencimento_primeira: string;
  status: 'ativo' | 'pago' | 'cancelado' | 'parcial' | 'pendente';
  observacoes?: string;
  codigo_barras?: string;
  linha_digitavel?: string;
}

const CarnesEdit: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const carneId = parseInt(id || '0');

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
  const { success, error } = useNotification();

  // Query para buscar carnê
  const { data: carne, isLoading: carneLoading } = useQuery({
    queryKey: ['carne', carneId],
    queryFn: () => CarneService.getById(carneId),
    enabled: !!carneId,
  });

  // Queries para buscar dados
  const { data: clientes, isLoading: clientesLoading, error: clientesError } = useQuery({
    queryKey: ['clientes-ativos'],
    queryFn: () => ClienteService.listAtivos(),
  });

  const { data: planos, isLoading: planosLoading, error: planosError } = useQuery({
    queryKey: ['planos-ativos'],
    queryFn: () => PlanoService.findAtivos(),
  });

  const { data: bancos, isLoading: bancosLoading, error: bancosError } = useQuery({
    queryKey: ['bancos-ativos'],
    queryFn: () => BancoService.findAtivos(),
  });

  // Logs para monitorar carregamento dos dados
  useEffect(() => {
    if (clientesError) {
      console.error('Erro ao carregar clientes:', clientesError);
    }
  }, [clientesError]);

  useEffect(() => {
    if (planosError) {
      console.error('Erro ao carregar planos:', planosError);
    }
  }, [planosError]);

  useEffect(() => {
    if (bancosError) {
      console.error('Erro ao carregar bancos:', bancosError);
    }
  }, [bancosError]);

  // Mutation para atualizar carnê
  const updateCarneMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CarneForm }) => CarneService.update(id, data),
    onSuccess: () => {
      success('Carnê atualizado com sucesso!');
      navigate('/carnes');
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
    if (!formData.valor_total || formData.valor_total <= 0) newErrors.valor_total = 'Valor total deve ser maior que zero';
    if (!formData.quantidade_parcelas || formData.quantidade_parcelas <= 0) newErrors.quantidade_parcelas = 'Quantidade de parcelas deve ser maior que zero';
    if (!formData.data_vencimento_primeira) newErrors.data_vencimento_primeira = 'Data do primeiro vencimento é obrigatória';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    updateCarneMutation.mutate({ id: carneId, data: formData });
  };

  const handleCancel = () => {
    navigate('/carnes');
  };

  // Filtrar planos baseado no cliente selecionado
  // Filtrar planos (todos os planos estão disponíveis para todos os clientes)
  const planosFiltrados = (planos && Array.isArray(planos)) ? planos : [];

  if (carneLoading) {
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
        <h1 className="h2">Editar Carnê</h1>
      </div>

      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="row">
              <div className="col-md-6">
                <div className="mb-3">
                  <label htmlFor="cliente_id" className="form-label">
                    Cliente <span className="text-danger">*</span>
                  </label>
                  <select
                    className={`form-select ${errors.cliente_id ? 'is-invalid' : ''}`}
                    id="cliente_id"
                    value={formData.cliente_id}
                    onChange={(e) => {
                      handleInputChange('cliente_id', parseInt(e.target.value));
                      handleInputChange('plano_id', 0);
                    }}
                  >
                    <option value={0}>Selecione um cliente</option>
                    {(clientes && Array.isArray(clientes)) ? clientes.map((cliente: any) => (
                      <option key={cliente.id} value={cliente.id}>
                        {cliente.razao_social}
                      </option>
                    )) : []}
                  </select>
                  {errors.cliente_id && <div className="invalid-feedback">{errors.cliente_id}</div>}
                </div>
              </div>
              <div className="col-md-6">
                <div className="mb-3">
                  <label htmlFor="plano_id" className="form-label">
                    Plano <span className="text-danger">*</span>
                  </label>
                  <select
                    className={`form-select ${errors.plano_id ? 'is-invalid' : ''}`}
                    id="plano_id"
                    value={formData.plano_id}
                    onChange={(e) => {
                      const planoId = parseInt(e.target.value);
                      handleInputChange('plano_id', planoId);
                      const planoSelecionado = (planos && Array.isArray(planos)) ? planos.find((p: any) => p.id === planoId) : null;
                      if (planoSelecionado) {
                        handleInputChange('valor_total', planoSelecionado.valor_mensal * formData.quantidade_parcelas);
                      }
                    }}
                    disabled={!formData.cliente_id}
                  >
                    <option value={0}>Selecione um plano</option>
                    {planosFiltrados.map((plano: any) => (
                      <option key={plano.id} value={plano.id}>
                        {plano.nome_plano} - R$ {parseFloat(plano.valor_mensal).toFixed(2)}
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
                  <label htmlFor="banco_id" className="form-label">
                    Banco <span className="text-danger">*</span>
                  </label>
                  <select
                    className={`form-select ${errors.banco_id ? 'is-invalid' : ''}`}
                    id="banco_id"
                    value={formData.banco_id}
                    onChange={(e) => handleInputChange('banco_id', parseInt(e.target.value))}
                  >
                    <option value={0}>Selecione um banco</option>
                    {(bancos && Array.isArray(bancos)) ? bancos.filter((banco: any) => banco.ativo).map((banco: any) => (
                      <option key={banco.id} value={banco.id}>
                        {banco.nome} ({banco.tipo})
                      </option>
                    )) : []}
                  </select>
                  {errors.banco_id && <div className="invalid-feedback">{errors.banco_id}</div>}
                </div>
              </div>
              <div className="col-md-6">
                <div className="mb-3">
                  <label htmlFor="numero_carne" className="form-label">Número do Carnê</label>
                  <input
                    type="text"
                    className={`form-control ${errors.numero_carne ? 'is-invalid' : ''}`}
                    id="numero_carne"
                    value={formData.numero_carne}
                    onChange={(e) => handleInputChange('numero_carne', e.target.value)}
                    placeholder="Gerado automaticamente se vazio"
                  />
                  {errors.numero_carne && <div className="invalid-feedback">{errors.numero_carne}</div>}
                </div>
              </div>
            </div>

            <div className="row">
              <div className="col-md-4">
                <div className="mb-3">
                  <label htmlFor="valor_total" className="form-label">
                    Valor Total (R$) <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    className={`form-control ${errors.valor_total ? 'is-invalid' : ''}`}
                    id="valor_total"
                    value={formData.valor_total}
                    onChange={(e) => handleInputChange('valor_total', parseFloat(e.target.value) || 0)}
                    placeholder="99.90"
                    step="0.01"
                    min="0"
                  />
                  {errors.valor_total && <div className="invalid-feedback">{errors.valor_total}</div>}
                </div>
              </div>
              <div className="col-md-4">
                <div className="mb-3">
                  <label htmlFor="quantidade_parcelas" className="form-label">
                    Quantidade de Parcelas <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    className={`form-control ${errors.quantidade_parcelas ? 'is-invalid' : ''}`}
                    id="quantidade_parcelas"
                    value={formData.quantidade_parcelas}
                    onChange={(e) => {
                      const qtd = parseInt(e.target.value);
                      handleInputChange('quantidade_parcelas', qtd || 1);
                      const planoSelecionado = (planos && Array.isArray(planos)) ? planos.find((p: any) => p.id === formData.plano_id) : null;
                      if (planoSelecionado) {
                        handleInputChange('valor_total', planoSelecionado.valor_mensal * (qtd || 1));
                      }
                    }}
                    min="1"
                  />
                  {errors.quantidade_parcelas && <div className="invalid-feedback">{errors.quantidade_parcelas}</div>}
                </div>
              </div>
              <div className="col-md-4">
                <div className="mb-3">
                  <label htmlFor="data_vencimento_primeira" className="form-label">
                    Data do Primeiro Vencimento <span className="text-danger">*</span>
                  </label>
                  <input
                    type="date"
                    className={`form-control ${errors.data_vencimento_primeira ? 'is-invalid' : ''}`}
                    id="data_vencimento_primeira"
                    value={formData.data_vencimento_primeira}
                    onChange={(e) => handleInputChange('data_vencimento_primeira', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
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
                    className={`form-select ${errors.status ? 'is-invalid' : ''}`}
                    id="status"
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value as CarneForm['status'])}
                  >
                    <option value="ativo">Ativo</option>
                    <option value="pendente">Pendente</option>
                    <option value="pago">Pago</option>
                    <option value="cancelado">Cancelado</option>
                    <option value="parcial">Parcial</option>
                  </select>
                  {errors.status && <div className="invalid-feedback">{errors.status}</div>}
                </div>
              </div>
              <div className="col-md-6">
                <div className="mb-3">
                  <label htmlFor="carnet_id" className="form-label">ID do Carnê (Gateway)</label>
                  <input
                    type="text"
                    className={`form-control ${errors.carnet_id ? 'is-invalid' : ''}`}
                    id="carnet_id"
                    value={formData.carnet_id}
                    onChange={(e) => handleInputChange('carnet_id', e.target.value)}
                    placeholder="ID gerado pelo gateway de pagamento"
                  />
                  {errors.carnet_id && <div className="invalid-feedback">{errors.carnet_id}</div>}
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
        </div>
      </div>
    </>
  );
};

export default CarnesEdit;
