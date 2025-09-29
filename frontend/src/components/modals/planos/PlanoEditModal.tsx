import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { PlanoService } from '../../../services/planoService';
import { useNotificationContext } from '../../../contexts/NotificationContext';
import DraggableModal from '../../common/DraggableModal';

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

interface PlanoEditModalProps {
  show: boolean;
  onClose: () => void;
  planoId: number | null;
  onSuccess?: () => void;
}

const PlanoEditModal: React.FC<PlanoEditModalProps> = ({ 
  show, 
  onClose, 
  planoId, 
  onSuccess 
}) => {
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
  const { success, error } = useNotificationContext();
  const queryClient = useQueryClient();

  // Query para buscar plano
  const { data: plano, isLoading: planoLoading } = useQuery({
    queryKey: ['plano', planoId],
    queryFn: () => PlanoService.getById(planoId!),
    enabled: !!planoId && show,
  });

  // Mutation para atualizar plano
  const updatePlanoMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: PlanoForm }) => PlanoService.update(id, data),
    onSuccess: () => {
      success('Plano atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['planos'] });
      queryClient.invalidateQueries({ queryKey: ['plano', planoId] });
      onClose();
      onSuccess?.();
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
        tipo_servico: (plano.tipo_servico as PlanoForm['tipo_servico']) || 'internet',
        descricao: plano.descricao || '',
        valor_mensal: plano.valor_mensal || 0,
        desconto_percentual: plano.desconto_percentual || 0,
        desconto_valor: plano.desconto_valor || 0,
        desconto_ativo: plano.desconto_ativo || false,
        quantidade_usuarios: plano.quantidade_usuarios || 1,
        periodicidade: (plano.periodicidade as PlanoForm['periodicidade']) || 'mensal',
        servicos_inclusos: Array.isArray(plano.servicos_inclusos) 
          ? plano.servicos_inclusos 
          : typeof plano.servicos_inclusos === 'string' 
            ? JSON.parse(plano.servicos_inclusos) 
            : [],
        renovacao_automatica: plano.renovacao_automatica || false,
        status: (plano.status as PlanoForm['status']) || 'ativo',
        data_inicio: plano.data_inicio || new Date().toISOString().split('T')[0],
        data_fim: plano.data_fim || '',
        observacoes: plano.observacoes || ''
      });
    }
  }, [plano]);

  // Limpar formulário quando modal fechar
  useEffect(() => {
    if (!show) {
      setFormData({
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
      setErrors({});
    }
  }, [show]);

  const handleInputChange = (field: keyof PlanoForm, value: string | number | boolean | string[]) => {
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
    
    if (!validateForm() || !planoId) return;

    updatePlanoMutation.mutate({
      id: planoId,
      data: formData
    });
  };

  const handleCancel = () => {
    onClose();
  };

  const servicosDisponiveis = [
    'Internet',
    'Telefone',
    'TV por Assinatura',
    'Suporte Técnico',
    'Backup em Nuvem',
    'Antivírus',
    'Firewall'
  ];

  return (
    <DraggableModal
      show={show}
      onClose={handleCancel}
      title="Editar Plano"
      size="lg"
    >
      {planoLoading ? (
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
                <label htmlFor="nome_plano" className="form-label">Nome do Plano *</label>
                <input
                  type="text"
                  className={`form-control ${errors.nome_plano ? 'is-invalid' : ''}`}
                  id="nome_plano"
                  value={formData.nome_plano}
                  onChange={(e) => handleInputChange('nome_plano', e.target.value)}
                  disabled={updatePlanoMutation.isPending}
                  placeholder="Ex: Plano Premium"
                />
                {errors.nome_plano && <div className="invalid-feedback">{errors.nome_plano}</div>}
              </div>
            </div>

            <div className="col-md-6">
              <div className="mb-3">
                <label htmlFor="tipo_servico" className="form-label">Tipo de Serviço *</label>
                <select
                  className={`form-select ${errors.tipo_servico ? 'is-invalid' : ''}`}
                  id="tipo_servico"
                  value={formData.tipo_servico}
                  onChange={(e) => handleInputChange('tipo_servico', e.target.value as PlanoForm['tipo_servico'])}
                  disabled={updatePlanoMutation.isPending}
                >
                  <option value="internet">Internet</option>
                  <option value="telefonia">Telefonia</option>
                  <option value="tv">TV por Assinatura</option>
                  <option value="suporte">Suporte</option>
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
              className="form-control"
              id="descricao"
              rows={3}
              value={formData.descricao}
              onChange={(e) => handleInputChange('descricao', e.target.value)}
              disabled={updatePlanoMutation.isPending}
              placeholder="Descrição detalhada do plano"
            ></textarea>
          </div>

          <div className="row">
            <div className="col-md-6">
              <div className="mb-3">
                <label htmlFor="valor_mensal" className="form-label">Valor Mensal *</label>
                <input
                  type="number"
                  step="0.01"
                  className={`form-control ${errors.valor_mensal ? 'is-invalid' : ''}`}
                  id="valor_mensal"
                  value={formData.valor_mensal}
                  onChange={(e) => handleInputChange('valor_mensal', parseFloat(e.target.value) || 0)}
                  disabled={updatePlanoMutation.isPending}
                  placeholder="0.00"
                />
                {errors.valor_mensal && <div className="invalid-feedback">{errors.valor_mensal}</div>}
              </div>
            </div>

            <div className="col-md-6">
              <div className="mb-3">
                <label htmlFor="quantidade_usuarios" className="form-label">Quantidade de Usuários</label>
                <input
                  type="number"
                  min="1"
                  className="form-control"
                  id="quantidade_usuarios"
                  value={formData.quantidade_usuarios}
                  onChange={(e) => handleInputChange('quantidade_usuarios', parseInt(e.target.value) || 1)}
                  disabled={updatePlanoMutation.isPending}
                />
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-md-6">
              <div className="mb-3">
                <label htmlFor="data_inicio" className="form-label">Data de Início *</label>
                <input
                  type="date"
                  className={`form-control ${errors.data_inicio ? 'is-invalid' : ''}`}
                  id="data_inicio"
                  value={formData.data_inicio}
                  onChange={(e) => handleInputChange('data_inicio', e.target.value)}
                  disabled={updatePlanoMutation.isPending}
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
                  disabled={updatePlanoMutation.isPending}
                />
              </div>
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label">Serviços Inclusos</label>
            <div className="row">
              {servicosDisponiveis.map((servico) => (
                <div key={servico} className="col-md-4 mb-2">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={`servico_${servico}`}
                      checked={formData.servicos_inclusos.includes(servico)}
                      onChange={() => handleServiceToggle(servico)}
                      disabled={updatePlanoMutation.isPending}
                    />
                    <label className="form-check-label" htmlFor={`servico_${servico}`}>
                      {servico}
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-3">
            <label htmlFor="observacoes" className="form-label">Observações</label>
            <textarea
              className="form-control"
              id="observacoes"
              rows={2}
              value={formData.observacoes}
              onChange={(e) => handleInputChange('observacoes', e.target.value)}
              disabled={updatePlanoMutation.isPending}
              placeholder="Observações adicionais sobre o plano"
            ></textarea>
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
      )}
    </DraggableModal>
  );
};

export default PlanoEditModal;
