import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { TituloService } from '../../../services/tituloService';
import { PlanoService } from '../../../services/planoService';
import { ClienteService } from '../../../services/clienteService';
import { useNotificationContext } from '../../../contexts/NotificationContext';
import { CreateCarneParcela } from '../../../types';
import DraggableModal from '../../common/DraggableModal';

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

  // Queries para buscar dados
  const { data: planos } = useQuery({
    queryKey: ['planos-ativos'],
    queryFn: () => PlanoService.list({ status: 'ativo', limit: 100 }),
    enabled: show,
  });

  // Buscar cliente para obter plano ativo
  const { data: clienteData } = useQuery({
    queryKey: ['cliente', clienteId],
    queryFn: () => ClienteService.getById(clienteId!),
    enabled: !!clienteId, // Sempre habilitar quando há clienteId
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

  // Pré-selecionar plano ativo do cliente e data de vencimento
  useEffect(() => {
    if (show && clienteData?.contratos && clienteData.contratos.length > 0) {
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
  }, [show, clienteData]);

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
      
      onClose();
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
      desconto_percentual: formData.desconto_percentual || 0,
      desconto_valor: formData.desconto_valor || 0,
      acrescimo_percentual: formData.acrescimo_percentual || 0,
      acrescimo_valor: formData.acrescimo_valor || 0,
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
    >
      <form onSubmit={handleSubmit}>
        <div className="row">
          <div className="col-md-6">
            <div className="mb-3">
              <label htmlFor="plano_id" className="form-label small">Plano *</label>
              <select
                className={`form-select ${errors.plano_id ? 'is-invalid' : ''}`}
                id="plano_id"
                value={formData.plano_id}
                onChange={(e) => handleInputChange('plano_id', parseInt(e.target.value))}
                disabled={createParcelaMutation.isPending}
              >
                <option value={0}>Selecione um plano</option>
                {planos?.data?.map((plano: any) => (
                  <option key={plano.id} value={plano.id}>
                    {plano.nome_plano}
                  </option>
                ))}
              </select>
              {errors.plano_id && <div className="invalid-feedback">{errors.plano_id}</div>}
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-md-6">
            <div className="mb-3">
              <label htmlFor="data_vencimento" className="form-label small">Data de Vencimento *</label>
              <input
                type="date"
                className={`form-control ${errors.data_vencimento ? 'is-invalid' : ''}`}
                id="data_vencimento"
                value={formData.data_vencimento}
                onChange={(e) => handleInputChange('data_vencimento', e.target.value)}
                disabled={createParcelaMutation.isPending}
              />
              {errors.data_vencimento && <div className="invalid-feedback">{errors.data_vencimento}</div>}
            </div>
          </div>
          <div className="col-md-6">
            <div className="mb-3">
              <label htmlFor="descricao" className="form-label small">Descrição</label>
              <input
                type="text"
                className="form-control"
                id="descricao"
                value={formData.descricao}
                onChange={(e) => handleInputChange('descricao', e.target.value)}
                disabled={createParcelaMutation.isPending}
                placeholder="Descrição do título..."
              />
            </div>
          </div>
        </div>

        {/* Campos de Desconto */}
        <div className="row">
          <div className="col-md-6">
            <div className="mb-3">
              <label htmlFor="desconto_percentual" className="form-label small">Desconto (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                className="form-control"
                id="desconto_percentual"
                value={formData.desconto_percentual}
                onChange={(e) => handleInputChange('desconto_percentual', parseFloat(e.target.value) || 0)}
                disabled={createParcelaMutation.isPending}
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="col-md-6">
            <div className="mb-3">
              <label htmlFor="desconto_valor" className="form-label small">Desconto (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-control"
                id="desconto_valor"
                value={formData.desconto_valor}
                onChange={(e) => handleInputChange('desconto_valor', parseFloat(e.target.value) || 0)}
                disabled={createParcelaMutation.isPending}
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        {/* Campos de Acréscimo */}
        <div className="row">
          <div className="col-md-6">
            <div className="mb-3">
              <label htmlFor="acrescimo_percentual" className="form-label small">Acréscimo (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                className="form-control"
                id="acrescimo_percentual"
                value={formData.acrescimo_percentual}
                onChange={(e) => handleInputChange('acrescimo_percentual', parseFloat(e.target.value) || 0)}
                disabled={createParcelaMutation.isPending}
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="col-md-6">
            <div className="mb-3">
              <label htmlFor="acrescimo_valor" className="form-label small">Acréscimo (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-control"
                id="acrescimo_valor"
                value={formData.acrescimo_valor}
                onChange={(e) => handleInputChange('acrescimo_valor', parseFloat(e.target.value) || 0)}
                disabled={createParcelaMutation.isPending}
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-12">
            <div className="mb-3">
              <label htmlFor="observacoes" className="form-label small">Observações</label>
              <textarea
                className="form-control"
                id="observacoes"
                rows={3}
                value={formData.observacoes}
                onChange={(e) => handleInputChange('observacoes', e.target.value)}
                disabled={createParcelaMutation.isPending}
                placeholder="Observações sobre a parcela..."
              />
            </div>
          </div>
        </div>

        {/* Botões */}
        <div className="d-flex justify-content-end gap-2 mt-4">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleCancel}
            disabled={createParcelaMutation.isPending}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={createParcelaMutation.isPending}
          >
            Criar Título
          </button>
        </div>
      </form>
    </DraggableModal>
  );
};

export default TituloCreateModal;
