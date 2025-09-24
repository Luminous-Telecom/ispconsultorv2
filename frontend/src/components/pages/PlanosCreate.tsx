import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PlanoService } from '../../services/planoService';
import { ClienteService } from '../../services/clienteService';
import { useNotification } from '../../hooks/useNotification';

interface PlanoForm {
  cliente_id: number;
  nome_plano: string;
  descricao?: string;
  valor_mensal: number;
  tipo_servico: 'internet' | 'telefonia' | 'tv' | 'suporte' | 'infraestrutura' | 'consultoria' | 'outros';
  velocidade_download?: number;
  velocidade_upload?: number;
  franquia_gb?: number;
  desconto_ativo: boolean;
  desconto_tipo?: string;
  desconto_valor?: number;
  periodicidade?: 'mensal' | 'trimestral' | 'semestral' | 'anual' | 'bimestral' | 'quinzenal' | 'semanal';
  renovacao_automatica: boolean;
  status: 'ativo' | 'inativo' | 'suspenso';
  data_inicio?: string;
  data_fim?: string;
  observacoes?: string;
}

const PlanosCreate: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<PlanoForm>({
    cliente_id: 0,
    nome_plano: '',
    descricao: '',
    valor_mensal: 0,
    tipo_servico: 'internet',
    velocidade_download: 0,
    velocidade_upload: 0,
    franquia_gb: 0,
    desconto_ativo: false,
    desconto_tipo: '',
    desconto_valor: 0,
    periodicidade: undefined,
    renovacao_automatica: false,
    status: 'ativo',
    data_inicio: new Date().toISOString().split('T')[0],
    data_fim: '',
    observacoes: '',
  });

  const [errors, setErrors] = useState<Partial<PlanoForm>>({});
  const { success, error } = useNotification();

  // Query para buscar clientes
  const { data: clientes, isLoading: clientesLoading } = useQuery({
    queryKey: ['clientes-ativos'],
    queryFn: () => ClienteService.listAtivos(),
  });

  // Mutation para criar plano
  const createPlanoMutation = useMutation({
    mutationFn: PlanoService.create,
    onSuccess: () => {
      success('Plano criado com sucesso!');
      navigate('/planos');
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Erro ao criar plano');
    }
  });

  const handleInputChange = (field: keyof PlanoForm, value: string | number) => {
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
    if (!formData.nome_plano) newErrors.nome_plano = 'Nome do plano é obrigatório';
    if (!formData.valor_mensal || formData.valor_mensal <= 0) newErrors.valor_mensal = 'Valor mensal deve ser maior que zero';
    if (!formData.data_inicio) newErrors.data_inicio = 'Data de início é obrigatória';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    createPlanoMutation.mutate(formData);
  };

  const handleCancel = () => {
    navigate('/planos');
  };

  return (
    <>
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <h1 className="h2">Novo Plano</h1>
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
                Dados do Plano
              </h6>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                {/* Dados Básicos */}
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
                        onChange={(e) => handleInputChange('cliente_id', parseInt(e.target.value))}
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
                      <label htmlFor="nome_plano" className="form-label">
                        Nome do Plano <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className={`form-control ${errors.nome_plano ? 'is-invalid' : ''}`}
                        id="nome_plano"
                        value={formData.nome_plano}
                        onChange={(e) => handleInputChange('nome_plano', e.target.value)}
                        placeholder="Ex: Plano Premium 100MB"
                      />
                      {errors.nome_plano && <div className="invalid-feedback">{errors.nome_plano}</div>}
                    </div>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label htmlFor="descricao" className="form-label">Descrição</label>
                      <textarea
                        className="form-control"
                        id="descricao"
                        rows={3}
                        value={formData.descricao}
                        onChange={(e) => handleInputChange('descricao', e.target.value)}
                        placeholder="Descrição detalhada do plano"
                      />
                    </div>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-4">
                    <div className="mb-3">
                      <label htmlFor="valor_mensal" className="form-label">
                        Valor (R$) <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        className={`form-control ${errors.valor_mensal ? 'is-invalid' : ''}`}
                        id="valor_mensal"
                        value={formData.valor_mensal}
                        onChange={(e) => handleInputChange('valor_mensal', parseFloat(e.target.value) || 0)}
                        placeholder="99.90"
                        step="0.01"
                        min="0"
                      />
                      {errors.valor_mensal && <div className="invalid-feedback">{errors.valor_mensal}</div>}
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="mb-3">
                      <label htmlFor="tipo_servico" className="form-label">Tipo de Serviço</label>
                      <select
                        className="form-select"
                        id="tipo_servico"
                        value={formData.tipo_servico}
                        onChange={(e) => handleInputChange('tipo_servico', e.target.value as PlanoForm['tipo_servico'])}
                      >
                        <option value="internet">Internet</option>
                        <option value="telefonia">Telefonia</option>
                        <option value="tv">TV</option>
                        <option value="suporte">Suporte Técnico</option>
                        <option value="infraestrutura">Infraestrutura</option>
                        <option value="consultoria">Consultoria</option>
                        <option value="outros">Outros</option>
                      </select>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="mb-3">
                      <label htmlFor="status" className="form-label">Status</label>
                      <select
                        className="form-select"
                        id="status"
                        value={formData.status}
                        onChange={(e) => handleInputChange('status', e.target.value as PlanoForm['status'])}
                      >
                        <option value="ativo">Ativo</option>
                        <option value="inativo">Inativo</option>
                        <option value="suspenso">Suspenso</option>
                      </select>
                    </div>
                  </div>
                </div>

                <hr className="my-4" />
                <h5 className="mb-3">Configurações Técnicas</h5>

                <div className="row">
                  <div className="col-md-4">
                    <div className="mb-3">
                      <label htmlFor="velocidade_download" className="form-label">Velocidade Download (Mbps)</label>
                      <input
                        type="number"
                        className="form-control"
                        id="velocidade_download"
                        value={formData.velocidade_download}
                        onChange={(e) => handleInputChange('velocidade_download', parseInt(e.target.value) || 0)}
                        placeholder="100"
                        min="0"
                      />
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="mb-3">
                      <label htmlFor="velocidade_upload" className="form-label">Velocidade Upload (Mbps)</label>
                      <input
                        type="number"
                        className="form-control"
                        id="velocidade_upload"
                        value={formData.velocidade_upload}
                        onChange={(e) => handleInputChange('velocidade_upload', parseInt(e.target.value) || 0)}
                        placeholder="50"
                        min="0"
                      />
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="mb-3">
                      <label htmlFor="franquia_gb" className="form-label">Franquia (GB)</label>
                      <input
                        type="number"
                        className="form-control"
                        id="franquia_gb"
                        value={formData.franquia_gb}
                        onChange={(e) => handleInputChange('franquia_gb', parseInt(e.target.value) || 0)}
                        placeholder="1000"
                        min="0"
                      />
                    </div>
                  </div>
                </div>

                <hr className="my-4" />
                <h5 className="mb-3">Período de Vigência</h5>

                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="data_inicio" className="form-label">
                        Data de Início <span className="text-danger">*</span>
                      </label>
                      <input
                        type="date"
                        className={`form-control ${errors.data_inicio ? 'is-invalid' : ''}`}
                        id="data_inicio"
                        value={formData.data_inicio}
                        onChange={(e) => handleInputChange('data_inicio', e.target.value)}
                      />
                      {errors.data_inicio && <div className="invalid-feedback">{errors.data_inicio}</div>}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="data_fim" className="form-label">Data de Fim</label>
                      <input
                        type="date"
                        className="form-control"
                        id="data_fim"
                        value={formData.data_fim}
                        onChange={(e) => handleInputChange('data_fim', e.target.value)}
                      />
                      <div className="form-text">Deixe em branco para vigência indefinida</div>
                    </div>
                  </div>
                </div>

                <div className="d-flex justify-content-end gap-2 mt-4">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={handleCancel}
                    disabled={createPlanoMutation.isPending}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={createPlanoMutation.isPending}
                  >
                    {createPlanoMutation.isPending ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Salvando...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check"></i> Salvar Plano
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
                Informações
              </h6>
            </div>
            <div className="card-body">
              <div className="alert alert-info">
                <i className="bi bi-info-circle me-2"></i>
                <strong>Dicas:</strong>
                <ul className="mb-0 mt-2">
                  <li>Selecione o cliente que receberá o plano</li>
                  <li>Configure as velocidades conforme o contrato</li>
                  <li>Franquia em GB para controle de uso</li>
                  <li>Data de fim é opcional</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PlanosCreate;
