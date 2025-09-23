import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PlanoService } from '../../services/planoService';
import { useNotification } from '../../hooks/useNotification';

interface PlanoForm {
  nome_plano: string;
  descricao?: string;
  valor_mensal: number;
  tipo_servico: 'internet' | 'telefone' | 'tv' | 'combo';
  servicos_inclusos?: string[];
  quantidade_usuarios?: number;
  desconto_percentual?: number;
  desconto_valor?: number;
  desconto_ativo: boolean;
  periodicidade?: string;
  renovacao_automatica: boolean;
  status: 'ativo' | 'inativo' | 'suspenso';
  data_inicio?: string;
  data_fim?: string;
  observacoes?: string;
}

const PlanosEdit: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const planoId = parseInt(id || '0');

  const [formData, setFormData] = useState<PlanoForm>({
    nome_plano: '',
    descricao: '',
    valor_mensal: 0,
    tipo_servico: 'internet',
    servicos_inclusos: [],
    quantidade_usuarios: 0,
    desconto_percentual: 0,
    desconto_valor: 0,
    desconto_ativo: false,
    periodicidade: '',
    renovacao_automatica: false,
    status: 'ativo',
    data_inicio: new Date().toISOString().split('T')[0],
    data_fim: '',
    observacoes: '',
  });

  const [errors, setErrors] = useState<Partial<PlanoForm>>({});
  const { success, error } = useNotification();

  // Query para buscar plano
  const { data: plano, isLoading: planoLoading } = useQuery({
    queryKey: ['plano', planoId],
    queryFn: () => PlanoService.getById(planoId),
    enabled: !!planoId,
  });


  // Mutation para atualizar plano
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

  // Carregar dados do plano quando disponível
  useEffect(() => {
    if (plano) {
      setFormData({
        nome_plano: plano.nome_plano || '',
        descricao: plano.descricao || '',
        valor_mensal: plano.valor_mensal || 0,
        tipo_servico: (plano.tipo_servico as PlanoForm['tipo_servico']) || 'internet',
        servicos_inclusos: plano.servicos_inclusos || [],
        quantidade_usuarios: plano.quantidade_usuarios || 0,
        desconto_percentual: plano.desconto_percentual || 0,
        desconto_valor: plano.desconto_valor || 0,
        desconto_ativo: plano.desconto_ativo || false,
        periodicidade: plano.periodicidade || '',
        renovacao_automatica: plano.renovacao_automatica || false,
        status: plano.status || 'ativo',
        data_inicio: plano.data_inicio || new Date().toISOString().split('T')[0],
        data_fim: plano.data_fim || '',
        observacoes: plano.observacoes || '',
      });
    }
  }, [plano]);

  const handleInputChange = (field: keyof PlanoForm, value: string | number | boolean) => {
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

    updatePlanoMutation.mutate({ id: planoId, data: formData });
  };

  const handleCancel = () => {
    navigate('/planos');
  };

  if (planoLoading) {
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
        <h1 className="h2">Editar Plano</h1>
      </div>

      <div className="card">
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
                    placeholder="Ex: Plano Fibra 300 Mega"
                  />
                  {errors.nome_plano && <div className="invalid-feedback">{errors.nome_plano}</div>}
                </div>
              </div>
              <div className="col-md-6">
                <div className="mb-3">
                  <label htmlFor="tipo_servico" className="form-label">Tipo de Serviço</label>
                  <select
                    className={`form-select ${errors.tipo_servico ? 'is-invalid' : ''}`}
                    id="tipo_servico"
                    value={formData.tipo_servico}
                    onChange={(e) => handleInputChange('tipo_servico', e.target.value as PlanoForm['tipo_servico'])}
                  >
                    <option value="internet">Internet</option>
                    <option value="telefone">Telefone</option>
                    <option value="tv">TV</option>
                    <option value="combo">Combo</option>
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
                placeholder="Detalhes sobre o plano e seus benefícios"
              ></textarea>
              {errors.descricao && <div className="invalid-feedback">{errors.descricao}</div>}
            </div>

            <div className="row">
              <div className="col-md-4">
                <div className="mb-3">
                  <label htmlFor="valor_mensal" className="form-label">
                    Valor Mensal (R$) <span className="text-danger">*</span>
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
                  <label htmlFor="quantidade_usuarios" className="form-label">Quantidade de Usuários</label>
                  <input
                    type="number"
                    className={`form-control ${errors.quantidade_usuarios ? 'is-invalid' : ''}`}
                    id="quantidade_usuarios"
                    value={formData.quantidade_usuarios}
                    onChange={(e) => handleInputChange('quantidade_usuarios', parseInt(e.target.value) || 0)}
                    placeholder="1"
                    min="0"
                  />
                  {errors.quantidade_usuarios && <div className="invalid-feedback">{errors.quantidade_usuarios}</div>}
                </div>
              </div>
              <div className="col-md-4">
                <div className="mb-3">
                  <label htmlFor="status" className="form-label">Status</label>
                  <select
                    className={`form-select ${errors.status ? 'is-invalid' : ''}`}
                    id="status"
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value as PlanoForm['status'])}
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                    <option value="suspenso">Suspenso</option>
                  </select>
                  {errors.status && <div className="invalid-feedback">{errors.status}</div>}
                </div>
              </div>
            </div>

            <div className="row">
              <div className="col-md-4">
                <div className="mb-3">
                  <label htmlFor="desconto_percentual" className="form-label">Desconto Percentual (%)</label>
                  <input
                    type="number"
                    className={`form-control ${errors.desconto_percentual ? 'is-invalid' : ''}`}
                    id="desconto_percentual"
                    value={formData.desconto_percentual}
                    onChange={(e) => handleInputChange('desconto_percentual', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    step="0.01"
                    min="0"
                    max="100"
                  />
                  {errors.desconto_percentual && <div className="invalid-feedback">{errors.desconto_percentual}</div>}
                </div>
              </div>
              <div className="col-md-4">
                <div className="mb-3">
                  <label htmlFor="desconto_valor" className="form-label">Desconto Valor (R$)</label>
                  <input
                    type="number"
                    className={`form-control ${errors.desconto_valor ? 'is-invalid' : ''}`}
                    id="desconto_valor"
                    value={formData.desconto_valor}
                    onChange={(e) => handleInputChange('desconto_valor', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                  {errors.desconto_valor && <div className="invalid-feedback">{errors.desconto_valor}</div>}
                </div>
              </div>
              <div className="col-md-4">
                <div className="mb-3">
                  <label htmlFor="periodicidade" className="form-label">Periodicidade</label>
                  <input
                    type="text"
                    className={`form-control ${errors.periodicidade ? 'is-invalid' : ''}`}
                    id="periodicidade"
                    value={formData.periodicidade}
                    onChange={(e) => handleInputChange('periodicidade', e.target.value)}
                    placeholder="Ex: Mensal"
                  />
                  {errors.periodicidade && <div className="invalid-feedback">{errors.periodicidade}</div>}
                </div>
              </div>
            </div>

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
                    className={`form-control ${errors.data_fim ? 'is-invalid' : ''}`}
                    id="data_fim"
                    value={formData.data_fim}
                    onChange={(e) => handleInputChange('data_fim', e.target.value)}
                  />
                  {errors.data_fim && <div className="invalid-feedback">{errors.data_fim}</div>}
                </div>
              </div>
            </div>

            <div className="row">
              <div className="col-md-6">
                <div className="mb-3 form-check form-switch">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="desconto_ativo"
                    checked={formData.desconto_ativo}
                    onChange={(e) => handleInputChange('desconto_ativo', e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="desconto_ativo">Desconto Ativo</label>
                </div>
              </div>
              <div className="col-md-6">
                <div className="mb-3 form-check form-switch">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="renovacao_automatica"
                    checked={formData.renovacao_automatica}
                    onChange={(e) => handleInputChange('renovacao_automatica', e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="renovacao_automatica">Renovação Automática</label>
                </div>
              </div>
            </div>

            <div className="d-flex justify-content-end gap-2 mt-4">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCancel}
                disabled={updatePlanoMutation.isPending}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={updatePlanoMutation.isPending}
              >
                {updatePlanoMutation.isPending ? (
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

export default PlanosEdit;
