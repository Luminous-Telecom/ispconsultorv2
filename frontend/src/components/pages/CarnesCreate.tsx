import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

const CarnesCreate: React.FC = () => {
  const navigate = useNavigate();
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
    if (clientes) {
      console.log('✅ Clientes carregados:', clientes);
    }
    if (clientesError) {
      console.error('❌ Erro ao carregar clientes:', clientesError);
    }
  }, [clientes, clientesError]);

  useEffect(() => {
    if (planos) {
      console.log('✅ Planos carregados:', planos);
    }
    if (planosError) {
      console.error('❌ Erro ao carregar planos:', planosError);
    }
  }, [planos, planosError]);

  useEffect(() => {
    if (bancos) {
      console.log('✅ Bancos carregados:', bancos);
    }
    if (bancosError) {
      console.error('❌ Erro ao carregar bancos:', bancosError);
    }
  }, [bancos, bancosError]);

  // Mutation para criar carnê
  const createCarneMutation = useMutation({
    mutationFn: CarneService.create,
    onSuccess: () => {
      success('Carnê criado com sucesso!');
      navigate('/carnes');
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Erro ao criar carnê');
    }
  });

  const handleInputChange = (field: keyof CarneForm, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Limpar erro do campo quando o usuário começar a digitar
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

    createCarneMutation.mutate(formData);
  };

  const handleCancel = () => {
    navigate('/carnes');
  };

  // Filtrar planos baseado no cliente selecionado
  const planosFiltrados = (planos && Array.isArray(planos)) ? planos.filter((plano: any) => plano.cliente_id === formData.cliente_id) : [];

  // Calcular valor total
  const valorTotal = formData.valor_total;

  return (
    <>
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <h1 className="h2">Gerar Carnê</h1>
        <div className="btn-group" role="group">
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={handleCancel}
          >
            <i className="bi bi-arrow-left"></i> Voltar
          </button>
        </div>
      </div>

      <div className="row">
        <div className="col-lg-8">
          <div className="card shadow">
            <div className="card-header py-3" style={{ backgroundColor: '#f8f9fa', borderBottom: '1px solid #e3e6f0' }}>
              <h6 className="m-0 font-weight-bold text-primary" style={{ fontWeight: 'bold', color: '#007bff' }}>
                Dados do Carnê
              </h6>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                {/* Seleção de Cliente e Plano */}
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
                          const clienteId = parseInt(e.target.value);
                          handleInputChange('cliente_id', clienteId);
                          // Limpar plano selecionado quando cliente muda
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
                          // Definir valor total baseado no plano selecionado
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
                      {!formData.cliente_id && (
                        <div className="form-text">Selecione primeiro um cliente</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Seleção de Banco */}
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
                      <label htmlFor="status" className="form-label">Status</label>
                      <select
                        className="form-select"
                        id="status"
                        value={formData.status}
                        onChange={(e) => handleInputChange('status', e.target.value as CarneForm['status'])}
                      >
                        <option value="ativo">Ativo</option>
                        <option value="cancelado">Cancelado</option>
                        <option value="suspenso">Suspenso</option>
                      </select>
                    </div>
                  </div>
                </div>

                <hr className="my-4" />
                <h5 className="mb-3">Configurações Financeiras</h5>

                <div className="row">
                  <div className="col-md-4">
                    <div className="mb-3">
                      <label htmlFor="valor_parcela" className="form-label">
                        Valor da Parcela (R$) <span className="text-danger">*</span>
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
                        onChange={(e) => handleInputChange('quantidade_parcelas', parseInt(e.target.value) || 0)}
                        placeholder="12"
                        min="1"
                        max="120"
                      />
                      {errors.quantidade_parcelas && <div className="invalid-feedback">{errors.quantidade_parcelas}</div>}
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="mb-3">
                      <label className="form-label">Valor Total</label>
                      <div className="form-control-plaintext">
                        <strong>R$ {parseFloat(valorTotal.toString()).toFixed(2).replace('.', ',')}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="data_primeiro_vencimento" className="form-label">
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
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label htmlFor="observacoes" className="form-label">Observações</label>
                      <textarea
                        className="form-control"
                        id="observacoes"
                        rows={3}
                        value={formData.observacoes}
                        onChange={(e) => handleInputChange('observacoes', e.target.value)}
                        placeholder="Observações adicionais sobre o carnê"
                      />
                    </div>
                  </div>
                </div>

                <div className="d-flex justify-content-end gap-2 mt-4">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={handleCancel}
                    disabled={createCarneMutation.isPending}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={createCarneMutation.isPending}
                  >
                    {createCarneMutation.isPending ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Gerando...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-receipt"></i> Gerar Carnê
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
            <div className="card-header py-3" style={{ backgroundColor: '#f8f9fa', borderBottom: '1px solid #e3e6f0' }}>
              <h6 className="m-0 font-weight-bold text-primary" style={{ fontWeight: 'bold', color: '#007bff' }}>
                Resumo do Carnê
              </h6>
            </div>
            <div className="card-body">
              {formData.cliente_id && formData.plano_id && formData.banco_id ? (
                <div>
                  <div className="mb-3">
                    <strong>Cliente:</strong><br />
                    <span className="text-muted">
                      {(clientes && Array.isArray(clientes)) ? clientes.find((c: any) => c.id === formData.cliente_id)?.razao_social : 'N/A'}
                    </span>
                  </div>
                  
                  <div className="mb-3">
                    <strong>Plano:</strong><br />
                    <span className="text-muted">
                      {(planos && Array.isArray(planos)) ? planos.find((p: any) => p.id === formData.plano_id)?.nome_plano : 'N/A'}
                    </span>
                  </div>
                  
                  <div className="mb-3">
                    <strong>Banco:</strong><br />
                    <span className="text-muted">
                      {(bancos && Array.isArray(bancos)) ? bancos.find((b: any) => b.id === formData.banco_id)?.nome : 'N/A'}
                    </span>
                  </div>
                  
                  <div className="mb-3">
                    <strong>Valor por Parcela:</strong><br />
                    <span className="text-muted">R$ {parseFloat(formData.valor_total.toString()).toFixed(2).replace('.', ',')}</span>
                  </div>
                  
                  <div className="mb-3">
                    <strong>Quantidade de Parcelas:</strong><br />
                    <span className="text-muted">{formData.quantidade_parcelas}</span>
                  </div>
                  
                  <div className="mb-3">
                    <strong>Valor Total:</strong><br />
                    <span className="text-primary fs-5">R$ {parseFloat(valorTotal.toString()).toFixed(2).replace('.', ',')}</span>
                  </div>
                  
                  {formData.data_vencimento_primeira && (
                    <div className="mb-3">
                      <strong>Primeiro Vencimento:</strong><br />
                      <span className="text-muted">
                        {new Date(formData.data_vencimento_primeira).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-muted">
                  <i className="bi bi-info-circle fs-1"></i>
                  <p className="mt-2">Preencha os dados básicos para ver o resumo</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CarnesCreate;
