import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { TituloService } from '../../../services/tituloService';
import { PlanoService } from '../../../services/planoService';
import { ClienteService } from '../../../services/clienteService';
import { ContratoService } from '../../../services/ContratoService';
import { useNotificationContext } from '../../../contexts/NotificationContext';
import { CreateCarneParcela } from '../../../types';
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
    if (show && contratoData) {
      const contrato = contratoData;
      
      if (contrato.plano_id) {
        let dataVencimento = '';
        
        // Se tem dia de vencimento configurado no contrato, usar ele
        if (contrato.dia_vencimento) {
          dataVencimento = calcularProximaDataVencimento(contrato.dia_vencimento);
        } else {
          // Se não tem dia configurado, usar o dia 15 do próximo mês como padrão
          dataVencimento = calcularProximaDataVencimento(15);
        }
        
        // Atualizar formulário com dados do contrato
        setFormData(prev => ({
          ...prev,
          plano_id: contrato.plano_id,
          contrato_id: contrato.id,
          desconto_percentual: contrato.desconto_percentual || 0,
          desconto_valor: contrato.desconto_valor || 0,
          data_vencimento: dataVencimento
        }));
      }
    }
  }, [show, contratoData]);

  // Pré-selecionar plano ativo do cliente e data de vencimento (quando não há contratoId)
  useEffect(() => {
    if (show && !contratoId && clienteData?.contratos && clienteData.contratos.length > 0) {
      const contratoAtivo = clienteData.contratos.find((contrato: any) => contrato.status === 'ativo');
      
      if (contratoAtivo && contratoAtivo.plano_id) {
        let dataVencimento = '';
        
        // Se tem dia de vencimento configurado no contrato, usar ele
        if ((contratoAtivo as any).dia_vencimento) {
          dataVencimento = calcularProximaDataVencimento((contratoAtivo as any).dia_vencimento);
        } else {
          // Se não tem dia configurado, usar o dia 15 do próximo mês como padrão
          dataVencimento = calcularProximaDataVencimento(15);
        }
        
        // Só atualizar se os valores forem diferentes dos atuais
        setFormData(prev => {
          if (prev.plano_id === contratoAtivo.plano_id && 
              prev.contrato_id === contratoAtivo.id && 
              prev.data_vencimento === dataVencimento) {
            return prev; // Não atualizar se os valores já estão corretos
          }
          
          return {
            ...prev,
            plano_id: contratoAtivo.plano_id,
            contrato_id: contratoAtivo.id,
            data_vencimento: dataVencimento
          };
        });
      }
    }
  }, [show, clienteData, contratoId]);

  // Limpar formulário quando modal fechar (usar ref para evitar conflitos)
  const prevShowRef = useRef(show);
  useEffect(() => {
    // Só limpar quando o modal estava aberto e agora está fechando
    if (prevShowRef.current && !show) {
      setFormData({
        plano_id: 0,
        contrato_id: undefined,
        data_vencimento: '',
        observacoes: '',
        desconto_percentual: 0,
        desconto_valor: 0,
        acrescimo_percentual: 0,
        acrescimo_valor: 0,
        descricao: '',
      });
      setErrors({});
    }
    prevShowRef.current = show;
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
    onError: (err: any) => {
      console.error('Erro ao criar título:', err);
      const errorMessage = err?.response?.data?.message || err?.response?.data?.error || 'Erro ao criar título. Tente novamente.';
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

    const payload: any = {
      plano_id: formData.plano_id,
      data_vencimento: formData.data_vencimento,
      observacoes: formData.observacoes || '',
      desconto_percentual: formData.desconto_percentual > 0 ? formData.desconto_percentual : null,
      desconto_valor: formData.desconto_valor > 0 ? formData.desconto_valor : null,
      acrescimo_percentual: formData.acrescimo_percentual > 0 ? formData.acrescimo_percentual : null,
      acrescimo_valor: formData.acrescimo_valor > 0 ? formData.acrescimo_valor : null,
      descricao: formData.descricao || '',
      cliente_id: clienteId
    };
    
    // Adicionar contrato_id se fornecido
    if (contratoId) {
      payload.contrato_id = contratoId;
    }

    createParcelaMutation.mutate(payload as any);
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
              entities={planos?.data?.map((plano: any) => ({
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
                onChange={(e: any) => handleInputChange('data_vencimento', e.value)}
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
                onChange={(e: any) => handleInputChange('descricao', e.value)}
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
                onChange={(e: any) => handleInputChange('desconto_percentual', parseFloat(e.value) || 0)}
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
                onChange={(e: any) => handleInputChange('desconto_valor', parseFloat(e.value) || 0)}
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
                onChange={(e: any) => handleInputChange('acrescimo_percentual', parseFloat(e.value) || 0)}
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
                onChange={(e: any) => handleInputChange('acrescimo_valor', parseFloat(e.value) || 0)}
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
                onChange={(e: any) => handleInputChange('observacoes', e.value)}
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
