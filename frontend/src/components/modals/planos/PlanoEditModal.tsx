import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { PlanoService } from '../../../services/planoService';
import { useNotificationContext } from '../../../contexts/NotificationContext';
import DraggableModal from '../../common/DraggableModal';
import FormField from '../../ui/FormField';

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
  ativo: boolean;
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
    ativo: true,
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
    enabled: !!planoId,
    staleTime: 60 * 1000,
    refetchOnMount: false,
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
        ativo: plano.status === 'ativo',
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
        ativo: true,
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

    // Converter campo ativo para status e limpar dados
    const dataToSubmit: any = {
      nome_plano: formData.nome_plano,
      tipo_servico: formData.tipo_servico,
      descricao: formData.descricao,
      valor_mensal: formData.valor_mensal,
      desconto_percentual: formData.desconto_percentual,
      desconto_valor: formData.desconto_valor,
      desconto_ativo: formData.desconto_ativo,
      quantidade_usuarios: formData.quantidade_usuarios,
      periodicidade: formData.periodicidade,
      servicos_inclusos: formData.servicos_inclusos,
      renovacao_automatica: formData.renovacao_automatica,
      status: formData.ativo ? 'ativo' : 'inativo',
      observacoes: formData.observacoes
    };
    
    // Adicionar datas apenas se forem válidas
    if (formData.data_inicio && formData.data_inicio !== '') {
      dataToSubmit.data_inicio = formData.data_inicio;
    }
    if (formData.data_fim && formData.data_fim !== '') {
      dataToSubmit.data_fim = formData.data_fim;
    }

    updatePlanoMutation.mutate({
      id: planoId,
      data: dataToSubmit
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
      title="Plano"
      modalId="plano-edit-modal"
      headerActions={
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleCancel}
            disabled={updatePlanoMutation.isPending}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="plano-edit-form"
            className="btn btn-primary btn-sm"
            disabled={updatePlanoMutation.isPending}
          >
            Salvar
          </button>
        </div>
      }
    >
      {planoLoading ? (
        <div className="text-center py-4">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
        </div>
      ) : (
        <form id="plano-edit-form" onSubmit={handleSubmit}>
          <div className="row">
            <div className="col-md-6">
              <div className="mb-3">
                <FormField
                  name="nome_plano"
                  type="text"
                  label="Nome do Plano"
                  placeholder="Ex: Plano Premium"
                  required={true}
                  size="md"
                  value={formData.nome_plano}
                  onChange={(e: any) => handleInputChange('nome_plano', e.value)}
                  error={errors.nome_plano}
                  isInvalid={!!errors.nome_plano}
                  disabled={updatePlanoMutation.isPending}
                />
              </div>
            </div>

            <div className="col-md-6">
              <div className="mb-3">
                <label htmlFor="tipo_servico" className="form-label small">Tipo de Serviço *</label>
                <select
                  className={`form-select ${errors.tipo_servico ? 'is-invalid' : ''}`}
                  id="tipo_servico"
                  name="tipo_servico"
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
            <FormField
              name="descricao"
              type="textarea"
              label="Descrição"
              placeholder="Descrição detalhada do plano"
              size="sm"
              value={formData.descricao}
              onChange={(e: any) => handleInputChange('descricao', e.value)}
              disabled={updatePlanoMutation.isPending}
              rows={2}
            />
          </div>

          <div className="row">
            <div className="col-md-6">
              <div className="mb-3">
                <FormField
                  name="valor_mensal"
                  type="number"
                  label="Valor Mensal"
                  placeholder="0.00"
                  required={true}
                  size="md"
                  value={formData.valor_mensal}
                  onChange={(e: any) => handleInputChange('valor_mensal', parseFloat(e.value) || 0)}
                  error={errors.valor_mensal?.toString()}
                  isInvalid={!!errors.valor_mensal}
                  disabled={updatePlanoMutation.isPending}
                  step={0.01}
                />
              </div>
            </div>

            <div className="col-md-6">
              <div className="mb-3">
                <FormField
                  name="quantidade_usuarios"
                  type="number"
                  label="Quantidade de Usuários"
                  size="sm"
                  value={formData.quantidade_usuarios}
                  onChange={(e: any) => handleInputChange('quantidade_usuarios', parseInt(e.value) || 1)}
                  disabled={updatePlanoMutation.isPending}
                  min={1}
                />
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-md-6">
              <div className="mb-3">
                <FormField
                  name="data_inicio"
                  type="date"
                  label="Data de Início"
                  required={true}
                  size="md"
                  value={formData.data_inicio}
                  onChange={(e: any) => handleInputChange('data_inicio', e.value)}
                  error={errors.data_inicio}
                  isInvalid={!!errors.data_inicio}
                  disabled={updatePlanoMutation.isPending}
                />
              </div>
            </div>

            <div className="col-md-6">
              <div className="mb-3">
                <FormField
                  name="data_fim"
                  type="date"
                  label="Data de Fim"
                  size="sm"
                  value={formData.data_fim}
                  onChange={(e: any) => handleInputChange('data_fim', e.value)}
                  disabled={updatePlanoMutation.isPending}
                />
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
                    id="ativo"
                    name="ativo"
                    checked={formData.ativo}
                    onChange={(e) => handleInputChange('ativo', e.target.checked)}
                    disabled={updatePlanoMutation.isPending}
                  />
                       <label className="form-check-label" htmlFor="ativo">
                         Ativo
                       </label>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label small">Serviços Inclusos</label>
            <div className="row">
              {servicosDisponiveis.map((servico) => (
                <div key={servico} className="col-md-4 mb-2">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={`servico_${servico}`}
                      name={`servico_${servico}`}
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
            <FormField
              name="observacoes"
              type="textarea"
              label="Observações"
              placeholder="Observações adicionais sobre o plano"
              size="sm"
              value={formData.observacoes}
              onChange={(e: any) => handleInputChange('observacoes', e.value)}
              disabled={updatePlanoMutation.isPending}
              rows={2}
            />
          </div>

        </form>
      )}
    </DraggableModal>
  );
};

export default PlanoEditModal;
