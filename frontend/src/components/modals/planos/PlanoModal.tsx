import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { PlanoService } from '../../../services/planoService';
import { useNotificationContext } from '../../../contexts/NotificationContext';
import DraggableModal from '../../common/DraggableModal';
import { useFormReset } from '../../../hooks/useFormReset';
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
  status: 'ativo' | 'inativo' | 'cancelado';
  data_inicio: string;
  data_fim: string;
  observacoes: string;
}

interface PlanoModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  planoId?: number | null; // Se passar planoId, é edição; se não, é criação
}

const PlanoModal: React.FC<PlanoModalProps> = ({ 
  show, 
  onClose, 
  onSuccess,
  planoId 
}) => {
  const isEditing = !!planoId;
  // Dados iniciais do formulário
  const initialFormData: PlanoForm = {
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
  };

  const [formData, setFormData] = useState<PlanoForm>(initialFormData);
  const [errors, setErrors] = useState<Partial<PlanoForm>>({});
  const { success, error } = useNotificationContext();
  const queryClient = useQueryClient();

  // Buscar dados do plano se estiver editando
  const { data: planoData, isLoading } = useQuery({
    queryKey: ['plano', planoId],
    queryFn: () => PlanoService.getById(planoId!),
    enabled: isEditing && !!planoId,
  });

  // Carregar dados do plano quando modal abrir em modo edição
  useEffect(() => {
    if (isEditing && planoData && show) {
      setFormData({
        nome_plano: planoData.nome_plano || '',
        tipo_servico: planoData.tipo_servico || 'internet',
        descricao: planoData.descricao || '',
        valor_mensal: Number(planoData.valor_mensal) || 0,
        desconto_percentual: Number(planoData.desconto_percentual) || 0,
        desconto_valor: Number(planoData.desconto_valor) || 0,
        desconto_ativo: planoData.desconto_ativo || false,
        quantidade_usuarios: planoData.quantidade_usuarios || 1,
        periodicidade: planoData.periodicidade || 'mensal',
        servicos_inclusos: planoData.servicos_inclusos || [],
        renovacao_automatica: planoData.renovacao_automatica || false,
        status: planoData.status || 'ativo',
        data_inicio: planoData.data_inicio || new Date().toISOString().split('T')[0],
        data_fim: planoData.data_fim || '',
        observacoes: planoData.observacoes || ''
      });
    }
  }, [isEditing, planoData, show]);

  // Usar hook personalizado para reset do formulário
  useFormReset({
    show: show && !isEditing, // Apenas resetar quando não estiver editando
    initialData: initialFormData,
    setFormData,
    setErrors
  });

  // Mutation para criar plano
  const createPlanoMutation = useMutation({
    mutationFn: (data: PlanoForm) => PlanoService.create(data),
    onSuccess: () => {
      success('Plano criado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['planos'] });
      onSuccess?.();
      // Não fechar o modal automaticamente
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Erro ao criar plano');
    }
  });

  // Mutation para atualizar plano
  const updatePlanoMutation = useMutation({
    mutationFn: (data: PlanoForm) => PlanoService.update(planoId!, data),
    onSuccess: () => {
      success('Plano atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['planos', planoId] });
      queryClient.invalidateQueries({ queryKey: ['plano', planoId] });
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Erro ao atualizar plano');
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

    if (isEditing) {
      updatePlanoMutation.mutate(formData);
    } else {
      createPlanoMutation.mutate(formData);
    }
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
      title={isEditing ? 'Editar Plano' : 'Novo Plano'}
      modalId={isEditing ? 'plano-edit-modal' : 'plano-create-modal'}
      headerActions={
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleCancel}
            disabled={isEditing ? updatePlanoMutation.isPending : createPlanoMutation.isPending}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form={isEditing ? 'plano-edit-form' : 'plano-create-form'}
            className="btn btn-primary btn-sm"
            disabled={isEditing ? updatePlanoMutation.isPending : createPlanoMutation.isPending}
          >
            Salvar
          </button>
        </div>
      }
    >
        {isLoading ? (
          <div className="text-center p-3">
            <div className="spinner-border spinner-border-sm" role="status">
              <span className="visually-hidden">Carregando...</span>
            </div>
          </div>
        ) : (
          <form id={isEditing ? 'plano-edit-form' : 'plano-create-form'} onSubmit={handleSubmit} style={{ padding: '1rem' }}>
          <div className="row g-2">
            <div className="col-md-6">
              <div className="mb-2">
                <FormField
                  name="nome_plano"
                  type="text"
                  label="Nome do Plano"
                  placeholder="Ex: Plano Premium"
                  required={true}
                  size="sm"
                  value={formData.nome_plano}
                  onChange={(e) => {
                    const value = typeof e === 'object' && e !== null && 'value' in e ? e.value : e;
                    handleInputChange('nome_plano', value);
                  }}
                  error={errors.nome_plano}
                  isInvalid={!!errors.nome_plano}
                  disabled={isEditing ? updatePlanoMutation.isPending : createPlanoMutation.isPending}
                />
              </div>
          </div>

          <div className="col-md-6">
              <div className="mb-2">
                <FormField
                  name="tipo_servico"
                  type="select"
                  label="Tipo de Serviço"
                  required={true}
                  size="sm"
                  value={formData.tipo_servico}
                  onChange={(e: any) => handleInputChange('tipo_servico', e.value)}
                  error={errors.tipo_servico}
                  isInvalid={!!errors.tipo_servico}
                  disabled={isEditing ? updatePlanoMutation.isPending : createPlanoMutation.isPending}
                  options={[
                    { value: 'internet', label: 'Internet' },
                    { value: 'telefonia', label: 'Telefonia' },
                    { value: 'tv', label: 'TV por Assinatura' },
                    { value: 'suporte', label: 'Suporte' },
                    { value: 'infraestrutura', label: 'Infraestrutura' },
                    { value: 'consultoria', label: 'Consultoria' },
                    { value: 'outros', label: 'Outros' }
                  ]}
                />
              </div>
            </div>
        </div>

              <div className="mb-2">
                <FormField
                  name="descricao"
                  type="textarea"
                  label="Descrição"
                  placeholder="Descrição detalhada do plano"
                  size="sm"
                  value={formData.descricao}
                  onChange={(e: any) => handleInputChange('descricao', e.value)}
                  disabled={isEditing ? updatePlanoMutation.isPending : createPlanoMutation.isPending}
                  rows={2}
                />
              </div>

        <div className="row">
          <div className="col-md-6">
              <div className="mb-2">
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
                  disabled={isEditing ? updatePlanoMutation.isPending : createPlanoMutation.isPending}
                  step={0.01}
                />
              </div>
          </div>

          <div className="col-md-6">
              <div className="mb-2">
                <FormField
                  name="quantidade_usuarios"
                  type="number"
                  label="Quantidade de Usuários"
                  size="sm"
                  value={formData.quantidade_usuarios}
                  onChange={(e: any) => handleInputChange('quantidade_usuarios', parseInt(e.value) || 1)}
                  disabled={isEditing ? updatePlanoMutation.isPending : createPlanoMutation.isPending}
                  min={1}
                />
              </div>
          </div>
        </div>

        <div className="row">
          <div className="col-md-6">
              <div className="mb-2">
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
                  disabled={isEditing ? updatePlanoMutation.isPending : createPlanoMutation.isPending}
                />
              </div>
          </div>

          <div className="col-md-6">
              <div className="mb-2">
                <FormField
                  name="data_fim"
                  type="date"
                  label="Data de Fim"
                  size="sm"
                  value={formData.data_fim}
                  onChange={(e: any) => handleInputChange('data_fim', e.value)}
                  disabled={isEditing ? updatePlanoMutation.isPending : createPlanoMutation.isPending}
                />
              </div>
          </div>
        </div>

              <div className="mb-2">
          <label className="form-label small">Serviços Inclusos</label>
          <div className="row">
            {servicosDisponiveis.map((servico) => (
              <div key={servico} className="col-md-4 mb-2">
                <FormField
                  name={`servico_${servico}`}
                  type="checkbox"
                  label={servico}
                  value={formData.servicos_inclusos.includes(servico)}
                  onChange={() => handleServiceToggle(servico)}
                  disabled={isEditing ? updatePlanoMutation.isPending : createPlanoMutation.isPending}
                />
              </div>
            ))}
          </div>
        </div>

              <div className="mb-2">
                <FormField
                  name="observacoes"
                  type="textarea"
                  label="Observações"
                  placeholder="Observações adicionais sobre o plano"
                  size="sm"
                  value={formData.observacoes}
                  onChange={(e: any) => handleInputChange('observacoes', e.value)}
                  disabled={isEditing ? updatePlanoMutation.isPending : createPlanoMutation.isPending}
                  rows={2}
                />
              </div>

      </form>
        )}
    </DraggableModal>
  );
};

export default PlanoModal;
