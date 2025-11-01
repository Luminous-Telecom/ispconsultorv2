import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { TituloService } from '../../../services/tituloService';
import { PlanoService } from '../../../services/planoService';
import { ClienteService } from '../../../services/clienteService';
import { ContratoService } from '../../../services/ContratoService';
import { useNotificationContext } from '../../../contexts/NotificationContext';
import { CreateCarneParcela, Contrato, Plano } from '../../../types';
import { FormValue } from '../../../types/common';
import { useEntitySelectField } from '../../../hooks/useEntitySelectField';
import DraggableModal from '../../common/DraggableModal';
import FormField from '../../ui/FormField';
import EntitySelectField from '../../ui/EntitySelectField';
import PlanoListModal from '../planos/PlanoListModal';

interface TituloForm {
  plano_id: number;
  contrato_id?: number;
  data_vencimento: string;
  observacoes?: string;
  desconto_percentual?: number;
  desconto_valor?: number;
  acrescimo_percentual?: number;
  acrescimo_valor?: number;
  descricao?: string;
}

interface TituloCreateModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  clienteId?: number;
  contratoId?: number;
}

const TituloCreateModal: React.FC<TituloCreateModalProps> = ({ 
  show, 
  onClose, 
  onSuccess,
  clienteId,
  contratoId
}) => {
  const [formData, setFormData] = useState<TituloForm>({
    plano_id: 0,
    contrato_id: contratoId,
    data_vencimento: '',
    observacoes: '',
    desconto_percentual: 0,
    desconto_valor: 0,
    acrescimo_percentual: 0,
    acrescimo_valor: 0,
    descricao: '',
  });

  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const { success, error } = useNotificationContext();
  const queryClient = useQueryClient();
  
  // Hook para gerenciar seleção de plano
  const planoSelect = useEntitySelectField<{ id: number }>();
  
  // Ref para rastrear se já inicializou o formulário
  const hasInitializedRef = useRef(false);

  // Queries para buscar dados
  const { data: planos } = useQuery({
    queryKey: ['planos-ativos'],
    queryFn: () => PlanoService.list({ status: 'ativo', limit: 100 }),
    staleTime: 60 * 1000,
    refetchOnMount: false,
  });

  // Buscar cliente para obter plano ativo
  const { data: clienteData } = useQuery({
    queryKey: ['cliente', clienteId],
    queryFn: () => ClienteService.getById(clienteId!),
    enabled: !!clienteId, // Sempre habilitar quando há clienteId
  });

  // Buscar dados do contrato quando contratoId for fornecido
  const { data: contratoData } = useQuery({
    queryKey: ['contrato', contratoId],
    queryFn: () => ContratoService.getById(contratoId!),
    enabled: !!contratoId,
  });

  // Função para calcular a próxima data de vencimento
  const calcularProximaDataVencimento = (diaVencimento: number): string => {
    const hoje = new Date();
    const proximoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, diaVencimento);
    
    // Se o dia já passou neste mês, usar o próximo mês
    const vencimento = new Date(hoje.getFullYear(), hoje.getMonth(), diaVencimento);
    const dataFinal = vencimento > hoje ? vencimento : proximoMes;
    
    // Formatar para YYYY-MM-DD
    return dataFinal.toISOString().split('T')[0];
  };

  // Preencher com dados do contrato quando contratoId for fornecido
  useEffect(() => {
    if (!show) {
      hasInitializedRef.current = false;
      return;
    }
    
    if (hasInitializedRef.current) {
      return;
    }
    
    if (contratoData) {
      const contrato = contratoData;
      
      if (contrato.plano_id) {
        let dataVencimento = '';
        
        // Usar dia 15 como padrão (o dia real será calculado pelo backend)
        dataVencimento = calcularProximaDataVencimento(15);
        
        // Atualizar formulário com dados do contrato
        const novoFormData = {
          plano_id: contrato.plano_id,
          contrato_id: contrato.id,
          desconto_percentual: contrato.desconto_percentual || 0,
          desconto_valor: contrato.desconto_valor || 0,
          data_vencimento: dataVencimento,
          observacoes: '',
          acrescimo_percentual: 0,
          acrescimo_valor: 0,
          descricao: ''
        };
        setFormData(novoFormData);
        hasInitializedRef.current = true;
      }
    } else if (!contratoId && clienteData?.contratos && clienteData.contratos.length > 0) {
      const contratoAtivo = clienteData.contratos.find((contrato: Contrato) => contrato.status === 'ativo');
      
      if (contratoAtivo && contratoAtivo.plano_id) {
        let dataVencimento = '';
        
        // Usar dia 15 como padrão (o dia real será calculado pelo backend)
        dataVencimento = calcularProximaDataVencimento(15);
        
        const novoFormDataCliente = {
          plano_id: contratoAtivo.plano_id,
          contrato_id: contratoAtivo.id,
          data_vencimento: dataVencimento,
          observacoes: '',
          desconto_percentual: 0,
          desconto_valor: 0,
          acrescimo_percentual: 0,
          acrescimo_valor: 0,
          descricao: ''
        };
        setFormData(novoFormDataCliente);
        hasInitializedRef.current = true;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  // Limpar formulário quando modal fechar
  useEffect(() => {
    if (!show) {
      setErrors({});
    }
  }, [show]);

  // Mutation para criar parcela
  const createParcelaMutation = useMutation({
    mutationFn: (data: CreateCarneParcela) => TituloService.create(data),
    onSuccess: (response) => {
      const mensagem = response?.message || 'Título criado com sucesso!';
      success(mensagem);
      
      // Invalidar todas as queries relacionadas a títulos
      queryClient.invalidateQueries({ queryKey: ['carne-parcelas'] });
      queryClient.invalidateQueries({ queryKey: ['parcelas'] });
      queryClient.invalidateQueries({ queryKey: ['titulos'] });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      
      // Chamar onSuccess antes de fechar o modal
      if (onSuccess) {
        onSuccess();
      }
      
      // Não fechar o modal automaticamente
    },
    onError: (err: unknown) => {
      console.error('Erro ao criar título:', err);
      const errorMessage = (err as { response?: { data?: { message?: string; error?: string } } })?.response?.data?.message || 
                           (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 
                           'Erro ao criar título. Tente novamente.';
      error(errorMessage);
    }
  });

  const handleInputChange = <K extends keyof TituloForm>(
    field: K,
    value: TituloForm[K]
  ) => {
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
    const newErrors: Record<string, string | undefined> = {};

    if (!formData.plano_id) newErrors.plano_id = 'Plano é obrigatório';
    if (!formData.data_vencimento) newErrors.data_vencimento = 'Data de vencimento é obrigatória';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    if (!clienteId) {
      error('ID do cliente é obrigatório para criar título');
      return;
    }

    const payload: Partial<CreateCarneParcela> & { cliente_id: number; contrato_id?: number } = {
      plano_id: formData.plano_id,
      data_vencimento: formData.data_vencimento,
      observacoes: formData.observacoes || undefined,
      desconto_percentual: (formData.desconto_percentual || 0) > 0 ? formData.desconto_percentual : undefined,
      desconto_valor: (formData.desconto_valor || 0) > 0 ? formData.desconto_valor : undefined,
      acrescimo_percentual: (formData.acrescimo_percentual || 0) > 0 ? formData.acrescimo_percentual : undefined,
      acrescimo_valor: (formData.acrescimo_valor || 0) > 0 ? formData.acrescimo_valor : undefined,
      descricao: formData.descricao || undefined,
      cliente_id: clienteId
    };
    
    // Adicionar contrato_id se fornecido
    if (contratoId) {
      payload.contrato_id = contratoId;
    }

    createParcelaMutation.mutate(payload as CreateCarneParcela);
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <DraggableModal
      show={show}
      onClose={handleCancel}
      title="Título"
      headerActions={
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleCancel}
            disabled={createParcelaMutation.isPending}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="titulo-create-form"
            className="btn btn-primary btn-sm"
            disabled={createParcelaMutation.isPending}
          >
            Criar Título
          </button>
        </div>
      }
    >
      <form id="titulo-create-form" onSubmit={handleSubmit} style={{ padding: '16px' }}>
        <div className="row">
          <div className="col-md-6">
            <EntitySelectField
              value={formData.plano_id}
              onChange={(value) => handleInputChange('plano_id', value)}
              onShowModal={planoSelect.openModal}
              entities={planos?.data?.map((plano: Plano) => ({
                id: plano.id,
                nome: plano.nome_plano
              })) || []}
              label="Plano"
              error={errors.plano_id}
              required
            />
          </div>
        </div>

        <div className="row">
          <div className="col-md-6">
            <div className="mb-3">
              <FormField
                name="data_vencimento"
                type="date"
                label="Data de Vencimento"
                required={true}
                size="sm"
                value={formData.data_vencimento}
                onChange={(value: FormValue) => handleInputChange('data_vencimento', value as string)}
                error={errors.data_vencimento}
                isInvalid={!!errors.data_vencimento}
                disabled={createParcelaMutation.isPending}
              />
            </div>
          </div>
          <div className="col-md-6">
            <div className="mb-3">
              <FormField
                name="descricao"
                type="text"
                label="Descrição"
                placeholder="Descrição do título..."
                size="sm"
                value={formData.descricao}
                onChange={(value: FormValue) => handleInputChange('descricao', value as string)}
                disabled={createParcelaMutation.isPending}
              />
            </div>
          </div>
        </div>

        {/* Campos de Desconto */}
        <div className="row">
          <div className="col-md-6">
            <div className="mb-3">
              <FormField
                name="desconto_percentual"
                type="number"
                label="Desconto (%)"
                placeholder="0.00"
                size="sm"
                value={formData.desconto_percentual}
                onChange={(value: FormValue) => handleInputChange('desconto_percentual', parseFloat(String(value)) || 0)}
                disabled={createParcelaMutation.isPending}
                min={0}
                max={100}
                step={0.01}
              />
            </div>
          </div>
          <div className="col-md-6">
            <div className="mb-3">
              <FormField
                name="desconto_valor"
                type="number"
                label="Desconto (R$)"
                placeholder="0.00"
                size="sm"
                value={formData.desconto_valor}
                onChange={(value: FormValue) => handleInputChange('desconto_valor', parseFloat(String(value)) || 0)}
                disabled={createParcelaMutation.isPending}
                min={0}
                step={0.01}
              />
            </div>
          </div>
        </div>

        {/* Campos de Acréscimo */}
        <div className="row">
          <div className="col-md-6">
            <div className="mb-3">
              <FormField
                name="acrescimo_percentual"
                type="number"
                label="Acréscimo (%)"
                placeholder="0.00"
                size="sm"
                value={formData.acrescimo_percentual}
                onChange={(value: FormValue) => handleInputChange('acrescimo_percentual', parseFloat(String(value)) || 0)}
                disabled={createParcelaMutation.isPending}
                min={0}
                max={100}
                step={0.01}
              />
            </div>
          </div>
          <div className="col-md-6">
            <div className="mb-3">
              <FormField
                name="acrescimo_valor"
                type="number"
                label="Acréscimo (R$)"
                placeholder="0.00"
                size="sm"
                value={formData.acrescimo_valor}
                onChange={(value: FormValue) => handleInputChange('acrescimo_valor', parseFloat(String(value)) || 0)}
                disabled={createParcelaMutation.isPending}
                min={0}
                step={0.01}
              />
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-12">
            <div className="mb-3">
              <FormField
                name="observacoes"
                type="textarea"
                label="Observações"
                placeholder="Observações sobre a parcela..."
                size="sm"
                value={formData.observacoes}
                onChange={(value: FormValue) => handleInputChange('observacoes', value as string)}
                disabled={createParcelaMutation.isPending}
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Botões */}
      </form>
      
      {/* Modal de seleção */}
      <PlanoListModal
        show={planoSelect.showModal}
        onClose={planoSelect.closeModal}
        onSelectPlano={(plano) => {
          handleInputChange('plano_id', plano.id);
          planoSelect.handleSelect(plano);
        }}
        title="Selecionar Plano"
      />
    </DraggableModal>
  );
};

export default TituloCreateModal;
