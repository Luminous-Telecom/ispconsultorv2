import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
  status: 'ativo' | 'inativo' | 'cancelado';
  data_inicio: string;
  data_fim: string;
  observacoes: string;
}

interface PlanoCreateModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const PlanoCreateModal: React.FC<PlanoCreateModalProps> = ({ 
  show, 
  onClose, 
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

  // Mutation para criar plano
  const createPlanoMutation = useMutation({
    mutationFn: (data: PlanoForm) => PlanoService.create(data),
    onSuccess: () => {
      success('Plano criado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['planos'] });
      onClose();
      onSuccess?.();
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Erro ao criar plano');
    }
  });

  // Limpar formulário quando modal fechar
  React.useEffect(() => {
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
    
    if (!validateForm()) return;

    createPlanoMutation.mutate(formData);
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
      title="Plano"
      headerActions={
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleCancel}
            disabled={createPlanoMutation.isPending}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="plano-create-form"
            className="btn btn-primary btn-sm"
            disabled={createPlanoMutation.isPending}
          >
            Criar Plano
          </button>
        </div>
      }
    >
        <form id="plano-create-form" onSubmit={handleSubmit}>
          <div className="row g-2">
            <div className="col-md-6">
              <div className="mb-2">
                <label htmlFor="nome_plano" className="form-label small">Nome do Plano *</label>
              <input
                type="text"
                className={`form-control form-control-sm ${errors.nome_plano ? 'is-invalid' : ''}`}
                id="nome_plano"
                value={formData.nome_plano}
                onChange={(e) => handleInputChange('nome_plano', e.target.value)}
                disabled={createPlanoMutation.isPending}
                placeholder="Ex: Plano Premium"
              />
              {errors.nome_plano && <div className="invalid-feedback">{errors.nome_plano}</div>}
            </div>
          </div>

          <div className="col-md-6">
              <div className="mb-2">
                <label htmlFor="tipo_servico" className="form-label small">Tipo de Serviço *</label>
                <select
                  className={`form-select form-select-sm ${errors.tipo_servico ? 'is-invalid' : ''}`}
                id="tipo_servico"
                value={formData.tipo_servico}
                onChange={(e) => handleInputChange('tipo_servico', e.target.value)}
                disabled={createPlanoMutation.isPending}
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

              <div className="mb-2">
          <label htmlFor="descricao" className="form-label small">Descrição</label>
          <textarea
            className="form-control form-control-sm"
            id="descricao"
            rows={2}
            value={formData.descricao}
            onChange={(e) => handleInputChange('descricao', e.target.value)}
            disabled={createPlanoMutation.isPending}
            placeholder="Descrição detalhada do plano"
          ></textarea>
        </div>

        <div className="row">
          <div className="col-md-6">
              <div className="mb-2">
              <label htmlFor="valor_mensal" className="form-label small">Valor Mensal *</label>
              <input
                type="number"
                step="0.01"
                className={`form-control ${errors.valor_mensal ? 'is-invalid' : ''}`}
                id="valor_mensal"
                value={formData.valor_mensal}
                onChange={(e) => handleInputChange('valor_mensal', parseFloat(e.target.value) || 0)}
                disabled={createPlanoMutation.isPending}
                placeholder="0.00"
              />
              {errors.valor_mensal && <div className="invalid-feedback">{errors.valor_mensal}</div>}
            </div>
          </div>

          <div className="col-md-6">
              <div className="mb-2">
              <label htmlFor="quantidade_usuarios" className="form-label small">Quantidade de Usuários</label>
              <input
                type="number"
                min="1"
                className="form-control form-control-sm"
                id="quantidade_usuarios"
                value={formData.quantidade_usuarios}
                onChange={(e) => handleInputChange('quantidade_usuarios', parseInt(e.target.value) || 1)}
                disabled={createPlanoMutation.isPending}
              />
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-md-6">
              <div className="mb-2">
              <label htmlFor="data_inicio" className="form-label small">Data de Início *</label>
              <input
                type="date"
                className={`form-control ${errors.data_inicio ? 'is-invalid' : ''}`}
                id="data_inicio"
                value={formData.data_inicio}
                onChange={(e) => handleInputChange('data_inicio', e.target.value)}
                disabled={createPlanoMutation.isPending}
              />
              {errors.data_inicio && <div className="invalid-feedback">{errors.data_inicio}</div>}
            </div>
          </div>

          <div className="col-md-6">
              <div className="mb-2">
              <label htmlFor="data_fim" className="form-label small">Data de Fim</label>
              <input
                type="date"
                className="form-control form-control-sm"
                id="data_fim"
                value={formData.data_fim}
                onChange={(e) => handleInputChange('data_fim', e.target.value)}
                disabled={createPlanoMutation.isPending}
              />
            </div>
          </div>
        </div>

              <div className="mb-2">
          <label className="form-label small">Serviços Inclusos</label>
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
                    disabled={createPlanoMutation.isPending}
                  />
                  <label className="form-check-label" htmlFor={`servico_${servico}`}>
                    {servico}
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

              <div className="mb-2">
          <label htmlFor="observacoes" className="form-label small">Observações</label>
          <textarea
            className="form-control form-control-sm"
            id="observacoes"
            rows={2}
            value={formData.observacoes}
            onChange={(e) => handleInputChange('observacoes', e.target.value)}
            disabled={createPlanoMutation.isPending}
            placeholder="Observações adicionais sobre o plano"
          ></textarea>
        </div>

      </form>
    </DraggableModal>
  );
};

export default PlanoCreateModal;
