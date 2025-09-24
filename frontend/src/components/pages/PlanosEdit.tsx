import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { PlanoService } from '../../services/planoService';
import { useNotification } from '../../hooks/useNotification';

interface PlanoForm {
  nome_plano: string;
  tipo_servico: 'internet' | 'telefonia' | 'tv' | 'suporte' | 'infraestrutura' | 'consultoria' | 'outros';
  descricao: string;
  valor_mensal: number;
  desconto_percentual: number;
  desconto_valor: number;
  desconto_ativo: boolean;
  quantidade_usuarios: number;
  periodicidade: 'mensal' | 'trimestral' | 'semestral' | 'anual' | 'bimestral' | 'quinzenal' | 'semanal';
  servicos_inclusos: string[];
  renovacao_automatica: boolean;
  status: 'ativo' | 'suspenso' | 'cancelado';
  data_inicio: string;
  data_fim: string;
  observacoes: string;
}

const PlanosEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error } = useNotification();

  const [formData, setFormData] = useState<PlanoForm>({
    nome_plano: '',
    tipo_servico: 'internet',
    descricao: '',
    valor_mensal: 0,
    desconto_percentual: 0,
    desconto_valor: 0,
    desconto_ativo: false,
    quantidade_usuarios: 1,
    periodicidade: 'mensal',
    servicos_inclusos: [],
    renovacao_automatica: true,
    status: 'ativo',
    data_inicio: new Date().toISOString().split('T')[0],
    data_fim: '',
    observacoes: ''
  });

  const [errors, setErrors] = useState<Partial<PlanoForm>>({});

  const { data: plano, isLoading } = useQuery({
    queryKey: ['plano', id],
    queryFn: () => PlanoService.getById(Number(id)),
    enabled: !!id
  });

  const updatePlanoMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: PlanoForm }) => PlanoService.update(id, data),
    onSuccess: () => {
      success('Plano atualizado com sucesso!');
      navigate('/planos');
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Erro ao atualizar plano');
    }
  });

  useEffect(() => {
    if (plano) {
      setFormData({
        nome_plano: plano.nome_plano || '',
        tipo_servico: (plano.tipo_servico as PlanoForm['tipo_servico']) || 'internet',
        descricao: plano.descricao || '',
        valor_mensal: plano.valor_mensal || 0,
        desconto_percentual: plano.desconto_percentual || 0,
        desconto_valor: plano.desconto_valor || 0,
        desconto_ativo: plano.desconto_ativo || false,
        quantidade_usuarios: plano.quantidade_usuarios || 1,
        periodicidade: (plano.periodicidade as PlanoForm['periodicidade']) || 'mensal',
        servicos_inclusos: Array.isArray(plano.servicos_inclusos) ? plano.servicos_inclusos : [],
        renovacao_automatica: plano.renovacao_automatica || false,
        status: (plano.status as PlanoForm['status']) || 'ativo',
        data_inicio: plano.data_inicio || new Date().toISOString().split('T')[0],
        data_fim: plano.data_fim || '',
        observacoes: plano.observacoes || ''
      });
    }
  }, [plano]);

  const handleInputChange = (field: keyof PlanoForm, value: string | number | boolean | string[]) => {
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

  const handleServiceToggle = (service: string) => {
    setFormData(prev => ({
      ...prev,
      servicos_inclusos: prev.servicos_inclusos.includes(service)
        ? prev.servicos_inclusos.filter(s => s !== service)
        : [...prev.servicos_inclusos, service]
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: any = {};

    if (!formData.nome_plano.trim()) newErrors.nome_plano = 'Nome do plano é obrigatório';
    if (!formData.tipo_servico) newErrors.tipo_servico = 'Tipo de serviço é obrigatório';
    if (!formData.valor_mensal || formData.valor_mensal <= 0) newErrors.valor_mensal = 'Valor mensal deve ser maior que zero';
    if (!formData.data_inicio) newErrors.data_inicio = 'Data de início é obrigatória';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    // Filtrar campos vazios antes de enviar
    const dataToSend = Object.fromEntries(
      Object.entries(formData).filter(([_, value]) => {
        if (value === null || value === undefined) return false;
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === 'string') return value.trim() !== '';
        return true;
      })
    );

    updatePlanoMutation.mutate({ id: Number(id), data: dataToSend as PlanoForm });
  };

  const handleCancel = () => {
    navigate('/planos');
  };

  if (isLoading) {
    return (
      <div className="container-fluid">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="card">
              <div className="card-body text-center">
                <div className="spinner-border" role="status">
                  <span className="visually-hidden">Carregando...</span>
                </div>
                <p className="mt-2">Carregando dados do plano...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!plano) {
    return (
      <div className="container-fluid">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="card">
              <div className="card-body text-center">
                <p>Plano não encontrado.</p>
                <button className="btn btn-secondary" onClick={() => navigate('/planos')}>
                  Voltar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Dados do Plano</h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="row">
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
                        required
                      />
                      {errors.nome_plano && <div className="invalid-feedback">{errors.nome_plano}</div>}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="tipo_servico" className="form-label">
                        Tipo de Serviço <span className="text-danger">*</span>
                      </label>
                      <select
                        className={`form-select ${errors.tipo_servico ? 'is-invalid' : ''}`}
                        id="tipo_servico"
                        value={formData.tipo_servico}
                        onChange={(e) => handleInputChange('tipo_servico', e.target.value as PlanoForm['tipo_servico'])}
                        required
                      >
                        <option value="">Selecione o tipo</option>
                        <option value="internet">Internet</option>
                        <option value="telefonia">Telefonia</option>
                        <option value="tv">TV</option>
                        <option value="suporte">Suporte Técnico</option>
                        <option value="infraestrutura">Infraestrutura</option>
                        <option value="consultoria">Consultoria</option>
                        <option value="outros">Outros</option>
                      </select>
                      {errors.tipo_servico && <div className="invalid-feedback">{errors.tipo_servico}</div>}
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <label htmlFor="descricao" className="form-label">Descrição</label>
                  <textarea
                    className={`form-control ${errors.descricao ? 'is-invalid' : ''}`}
                    id="descricao"
                    rows={3}
                    value={formData.descricao}
                    onChange={(e) => handleInputChange('descricao', e.target.value)}
                  />
                  {errors.descricao && <div className="invalid-feedback">{errors.descricao}</div>}
                </div>

                <h6 className="mt-4 mb-3">Valores e Descontos</h6>
                
                <div className="row">
                  <div className="col-md-4">
                    <div className="mb-3">
                      <label htmlFor="valor_mensal" className="form-label">
                        Valor Mensal <span className="text-danger">*</span>
                      </label>
                      <div className="input-group">
                        <span className="input-group-text">R$</span>
                        <input
                          type="number"
                          className={`form-control ${errors.valor_mensal ? 'is-invalid' : ''}`}
                          id="valor_mensal"
                          value={formData.valor_mensal}
                          onChange={(e) => handleInputChange('valor_mensal', parseFloat(e.target.value) || 0)}
                          step="0.01"
                          min="0"
                          required
                        />
                      </div>
                      {errors.valor_mensal && <div className="invalid-feedback">{errors.valor_mensal}</div>}
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="mb-3">
                      <label htmlFor="desconto_percentual" className="form-label">Desconto Percentual (%)</label>
                      <div className="input-group">
                        <input
                          type="number"
                          className={`form-control ${errors.desconto_percentual ? 'is-invalid' : ''}`}
                          id="desconto_percentual"
                          value={formData.desconto_percentual}
                          onChange={(e) => handleInputChange('desconto_percentual', parseFloat(e.target.value) || 0)}
                          step="0.01"
                          min="0"
                          max="100"
                        />
                        <span className="input-group-text">%</span>
                      </div>
                      {errors.desconto_percentual && <div className="invalid-feedback">{errors.desconto_percentual}</div>}
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="mb-3">
                      <label htmlFor="desconto_valor" className="form-label">Desconto em Valor (R$)</label>
                      <div className="input-group">
                        <span className="input-group-text">R$</span>
                        <input
                          type="number"
                          className={`form-control ${errors.desconto_valor ? 'is-invalid' : ''}`}
                          id="desconto_valor"
                          value={formData.desconto_valor}
                          onChange={(e) => handleInputChange('desconto_valor', parseFloat(e.target.value) || 0)}
                          step="0.01"
                          min="0"
                        />
                      </div>
                      {errors.desconto_valor && <div className="invalid-feedback">{errors.desconto_valor}</div>}
                    </div>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="desconto_ativo"
                          checked={formData.desconto_ativo}
                          onChange={(e) => handleInputChange('desconto_ativo', e.target.checked)}
                        />
                        <label className="form-check-label" htmlFor="desconto_ativo">
                          Desconto Ativo
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="status" className="form-label">Status</label>
                      <select
                        className={`form-select ${errors.status ? 'is-invalid' : ''}`}
                        id="status"
                        value={formData.status}
                        onChange={(e) => handleInputChange('status', e.target.value as PlanoForm['status'])}
                      >
                        <option value="ativo">Ativo</option>
                        <option value="suspenso">Suspenso</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                      {errors.status && <div className="invalid-feedback">{errors.status}</div>}
                    </div>
                  </div>
                </div>

                <h6 className="mt-4 mb-3">Configurações do Serviço</h6>
                
                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="quantidade_usuarios" className="form-label">Quantidade de Usuários</label>
                      <input
                        type="number"
                        className={`form-control ${errors.quantidade_usuarios ? 'is-invalid' : ''}`}
                        id="quantidade_usuarios"
                        value={formData.quantidade_usuarios}
                        onChange={(e) => handleInputChange('quantidade_usuarios', parseInt(e.target.value) || 1)}
                        min="1"
                      />
                      <div className="form-text">Número de usuários que podem utilizar o serviço</div>
                      {errors.quantidade_usuarios && <div className="invalid-feedback">{errors.quantidade_usuarios}</div>}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="periodicidade" className="form-label">Periodicidade</label>
                      <select
                        className={`form-select ${errors.periodicidade ? 'is-invalid' : ''}`}
                        id="periodicidade"
                        value={formData.periodicidade}
                        onChange={(e) => handleInputChange('periodicidade', e.target.value as PlanoForm['periodicidade'])}
                      >
                        <option value="mensal">Mensal</option>
                        <option value="trimestral">Trimestral</option>
                        <option value="semestral">Semestral</option>
                        <option value="anual">Anual</option>
                        <option value="bimestral">Bimestral</option>
                        <option value="quinzenal">Quinzenal</option>
                        <option value="semanal">Semanal</option>
                      </select>
                      {errors.periodicidade && <div className="invalid-feedback">{errors.periodicidade}</div>}
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">Serviços Inclusos</label>
                  <div className="row">
                    <div className="col-md-3">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="servico_instalacao"
                          checked={formData.servicos_inclusos.includes('instalacao')}
                          onChange={() => handleServiceToggle('instalacao')}
                        />
                        <label className="form-check-label" htmlFor="servico_instalacao">
                          Instalação
                        </label>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="servico_suporte"
                          checked={formData.servicos_inclusos.includes('suporte')}
                          onChange={() => handleServiceToggle('suporte')}
                        />
                        <label className="form-check-label" htmlFor="servico_suporte">
                          Suporte 24h
                        </label>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="servico_backup"
                          checked={formData.servicos_inclusos.includes('backup')}
                          onChange={() => handleServiceToggle('backup')}
                        />
                        <label className="form-check-label" htmlFor="servico_backup">
                          Backup
                        </label>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="servico_monitoramento"
                          checked={formData.servicos_inclusos.includes('monitoramento')}
                          onChange={() => handleServiceToggle('monitoramento')}
                        />
                        <label className="form-check-label" htmlFor="servico_monitoramento">
                          Monitoramento
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="row mt-2">
                    <div className="col-md-3">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="servico_manutencao"
                          checked={formData.servicos_inclusos.includes('manutencao')}
                          onChange={() => handleServiceToggle('manutencao')}
                        />
                        <label className="form-check-label" htmlFor="servico_manutencao">
                          Manutenção
                        </label>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="servico_atualizacao"
                          checked={formData.servicos_inclusos.includes('atualizacao')}
                          onChange={() => handleServiceToggle('atualizacao')}
                        />
                        <label className="form-check-label" htmlFor="servico_atualizacao">
                          Atualizações
                        </label>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="servico_relatorios"
                          checked={formData.servicos_inclusos.includes('relatorios')}
                          onChange={() => handleServiceToggle('relatorios')}
                        />
                        <label className="form-check-label" htmlFor="servico_relatorios">
                          Relatórios
                        </label>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="servico_treinamento"
                          checked={formData.servicos_inclusos.includes('treinamento')}
                          onChange={() => handleServiceToggle('treinamento')}
                        />
                        <label className="form-check-label" htmlFor="servico_treinamento">
                          Treinamento
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="renovacao_automatica"
                          checked={formData.renovacao_automatica}
                          onChange={(e) => handleInputChange('renovacao_automatica', e.target.checked)}
                        />
                        <label className="form-check-label" htmlFor="renovacao_automatica">
                          Renovação Automática
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <h6 className="mt-4 mb-3">Período de Vigência</h6>
                
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
                        required
                      />
                      {errors.data_inicio && <div className="invalid-feedback">{errors.data_inicio}</div>}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="data_fim" className="form-label">Data de Fim</label>
                      <input
                        type="date"
                        className={`form-control ${errors.data_fim ? 'is-invalid' : ''}`}
                        id="data_fim"
                        value={formData.data_fim}
                        onChange={(e) => handleInputChange('data_fim', e.target.value)}
                      />
                      {errors.data_fim && <div className="invalid-feedback">{errors.data_fim}</div>}
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
                  />
                  {errors.observacoes && <div className="invalid-feedback">{errors.observacoes}</div>}
                </div>

                <div className="d-flex justify-content-end gap-2">
                  <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={updatePlanoMutation.isPending}>
                    {updatePlanoMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanosEdit;