import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { PlanoService } from '../../../services/planoService';
import { useNotificationContext } from '../../../contexts/NotificationContext';
import DraggableModal from '../../common/DraggableModal';
import { useFormReset } from '../../../hooks/useFormReset';
import { InformacoesBasicasTab, DescontosConfiguracoesTab, ServicosObservacoesTab } from './plano';

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
  const [activeTab, setActiveTab] = useState('informacoes-basicas');
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
    if (isEditing && planoData) {
      let dataInicio = '';
      if (planoData.data_inicio) {
        const d = new Date(planoData.data_inicio);
        dataInicio = !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : '';
      }
      
      let dataFim = '';
      if (planoData.data_fim) {
        const d = new Date(planoData.data_fim);
        dataFim = !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : '';
      }
      
      setFormData({
        nome_plano: planoData.nome_plano || '',
        tipo_servico: planoData.tipo_servico || 'internet',
        descricao: planoData.descricao || '',
        valor_mensal: Number(planoData.valor_mensal) || 0,
        desconto_percentual: Number(planoData.desconto_percentual) || 0,
        desconto_valor: Number(planoData.desconto_valor) || 0,
        desconto_ativo: planoData.desconto_ativo || false,
        quantidade_usuarios: Number(planoData.quantidade_usuarios) || 1,
        periodicidade: planoData.periodicidade || 'mensal',
        servicos_inclusos: Array.isArray(planoData.servicos_inclusos) ? planoData.servicos_inclusos : [],
        renovacao_automatica: planoData.renovacao_automatica ?? true,
        status: planoData.status || 'ativo',
        data_inicio: dataInicio || new Date().toISOString().split('T')[0],
        data_fim: dataFim,
        observacoes: planoData.observacoes || ''
      });
      setErrors({});
    }
  }, [planoData, isEditing]);

  // Usar hook personalizado para reset do formulário apenas quando não estiver editando
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
    onError: (err: unknown) => {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erro ao criar plano';
      error(errorMessage);
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
      // Não fechar o modal automaticamente
    },
    onError: (err: unknown) => {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erro ao atualizar plano';
      error(errorMessage);
    }
  });


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
    const newErrors: Record<string, string> = {};

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
          <form id={isEditing ? 'plano-edit-form' : 'plano-create-form'} onSubmit={handleSubmit}>
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              {/* Navegação por Abas */}
              <ul className="nav nav-tabs" role="tablist" style={{ flexShrink: 0, marginBottom: 0, marginTop: '1rem', marginLeft: '1rem', marginRight: '1rem' }}>
                <li className="nav-item" role="presentation">
                  <button
                    className={`nav-link ${activeTab === 'informacoes-basicas' ? 'active' : ''}`}
                    type="button"
                    onClick={() => setActiveTab('informacoes-basicas')}
                  >
                    Informações Básicas
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button
                    className={`nav-link ${activeTab === 'descontos-configuracoes' ? 'active' : ''}`}
                    type="button"
                    onClick={() => setActiveTab('descontos-configuracoes')}
                  >
                    Descontos e Configurações
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button
                    className={`nav-link ${activeTab === 'servicos-observacoes' ? 'active' : ''}`}
                    type="button"
                    onClick={() => setActiveTab('servicos-observacoes')}
                  >
                    Serviços e Observações
                  </button>
                </li>
              </ul>

              {/* Conteúdo das Abas */}
              <div 
                className="tab-content" 
                style={{ 
                  flex: 1, 
                  overflow: 'auto', 
                  padding: '16px',
                  minHeight: 0
                }}
              >
                {/* Aba Informações Básicas */}
                {activeTab === 'informacoes-basicas' && (
                  <InformacoesBasicasTab
                    formData={formData}
                    errors={errors}
                    handleInputChange={handleInputChange}
                    handleServiceToggle={handleServiceToggle}
                    servicosDisponiveis={servicosDisponiveis}
                    isSubmitting={isEditing ? updatePlanoMutation.isPending : createPlanoMutation.isPending}
                  />
                )}

                {/* Aba Descontos e Configurações */}
                {activeTab === 'descontos-configuracoes' && (
                  <DescontosConfiguracoesTab
                    formData={formData}
                    errors={errors}
                    handleInputChange={handleInputChange}
                    handleServiceToggle={handleServiceToggle}
                    servicosDisponiveis={servicosDisponiveis}
                    isSubmitting={isEditing ? updatePlanoMutation.isPending : createPlanoMutation.isPending}
                  />
                )}

                {/* Aba Serviços e Observações */}
                {activeTab === 'servicos-observacoes' && (
                  <ServicosObservacoesTab
                    formData={formData}
                    errors={errors}
                    handleInputChange={handleInputChange}
                    handleServiceToggle={handleServiceToggle}
                    servicosDisponiveis={servicosDisponiveis}
                    isSubmitting={isEditing ? updatePlanoMutation.isPending : createPlanoMutation.isPending}
                  />
                )}
              </div>
            </div>
          </form>
        )}
    </DraggableModal>
  );
};

export default PlanoModal;
