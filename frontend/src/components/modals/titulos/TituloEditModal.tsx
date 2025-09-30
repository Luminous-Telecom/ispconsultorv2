import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { TituloService } from '../../../services/tituloService';
import { PlanoService } from '../../../services/planoService';
import { ClienteService } from '../../../services/clienteService';
import { useNotificationContext } from '../../../contexts/NotificationContext';
import DraggableModal from '../../common/DraggableModal';

interface TituloForm {
  cliente_id: number;
  plano_id: number;
  data_vencimento: string;
  observacoes?: string;
}

interface TituloEditModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  parcelaId: number;
}

const TituloEditModal: React.FC<TituloEditModalProps> = ({ 
  show, 
  onClose, 
  onSuccess,
  parcelaId
}) => {
  const [formData, setFormData] = useState<TituloForm>({
    cliente_id: 0,
    plano_id: 0,
    data_vencimento: '',
    observacoes: '',
  });

  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const { success, error } = useNotificationContext();
  const queryClient = useQueryClient();

  // Query para buscar dados da parcela
  const { data: parcela, isLoading: isLoadingParcela } = useQuery({
    queryKey: ['carne-parcela', parcelaId],
    queryFn: () => TituloService.getById(parcelaId),
    enabled: show && !!parcelaId,
  });

  // Query para buscar planos ativos
  const { data: planos } = useQuery({
    queryKey: ['planos-ativos'],
    queryFn: () => PlanoService.list({ status: 'ativo', limit: 100 }),
    enabled: show,
  });

  // Query para buscar clientes ativos
  const { data: clientes } = useQuery({
    queryKey: ['clientes-ativos'],
    queryFn: () => ClienteService.list({ ativo: true, limit: 100 }),
    enabled: show,
  });

  // Carregar dados da parcela quando disponível
  useEffect(() => {
    if (parcela) {
      console.log('Dados da parcela recebidos:', parcela);
      
      // Formatar data de vencimento para o input date
      const dataVencimento = parcela.data_vencimento 
        ? new Date(parcela.data_vencimento).toISOString().split('T')[0]
        : '';

      const formDataToSet = {
        cliente_id: parcela.cliente_id || parcela.carne?.cliente_id || 0,
        plano_id: parcela.plano_id || 0,
        data_vencimento: dataVencimento,
        observacoes: parcela.observacoes || '',
      };

      console.log('Dados do formulário a serem definidos:', formDataToSet);
      setFormData(formDataToSet);
    }
  }, [parcela]);

  // Mutation para atualizar parcela
  const updateParcelaMutation = useMutation({
    mutationFn: (data: TituloForm) => TituloService.update(parcelaId, data as any),
    onSuccess: () => {
      success('Parcela atualizada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['carne-parcelas'] });
      queryClient.invalidateQueries({ queryKey: ['carne-parcela', parcelaId] });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      onClose();
      onSuccess?.();
    },
    onError: (err: any) => {
      console.error('Erro ao atualizar parcela:', err);
      error('Erro ao atualizar parcela. Tente novamente.');
    }
  });

  // Limpar formulário quando modal fechar
  useEffect(() => {
    if (!show) {
      setFormData({
        cliente_id: 0,
        plano_id: 0,
        data_vencimento: '',
        observacoes: '',
      });
      setErrors({});
    }
  }, [show]);

  const handleInputChange = (field: keyof TituloForm, value: string | number | boolean) => {
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
    const newErrors: Record<string, string> = {};

    if (!formData.cliente_id) newErrors.cliente_id = 'Cliente é obrigatório';
    if (!formData.plano_id) newErrors.plano_id = 'Plano é obrigatório';
    if (!formData.data_vencimento) newErrors.data_vencimento = 'Data de vencimento é obrigatória';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    updateParcelaMutation.mutate(formData);
  };

  const handleCancel = () => {
    onClose();
  };

  if (isLoadingParcela) {
    return (
      <DraggableModal show={show} onClose={handleCancel} title="Editando Parcela">
        <div className="d-flex justify-content-center p-4">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
        </div>
      </DraggableModal>
    );
  }

  return (
    <DraggableModal
      show={show}
      onClose={handleCancel}
      title="Editar Parcela"
    >
      <form onSubmit={handleSubmit}>
        <div className="row">
          <div className="col-md-6">
            <div className="mb-3">
              <label htmlFor="cliente_id" className="form-label small">Cliente *</label>
              <select
                className={`form-select ${errors.cliente_id ? 'is-invalid' : ''}`}
                id="cliente_id"
                value={formData.cliente_id}
                onChange={(e) => handleInputChange('cliente_id', parseInt(e.target.value))}
                disabled={updateParcelaMutation.isPending}
              >
                <option value={0}>Selecione um cliente</option>
                {clientes?.data?.map((cliente: any) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nome} - {cliente.cpf_cnpj}
                  </option>
                ))}
              </select>
              {errors.cliente_id && <div className="invalid-feedback">{errors.cliente_id}</div>}
            </div>
          </div>
          <div className="col-md-6">
            <div className="mb-3">
              <label htmlFor="plano_id" className="form-label small">Plano *</label>
              <select
                className={`form-select ${errors.plano_id ? 'is-invalid' : ''}`}
                id="plano_id"
                value={formData.plano_id}
                onChange={(e) => handleInputChange('plano_id', parseInt(e.target.value))}
                disabled={updateParcelaMutation.isPending}
              >
                <option value={0}>Selecione um plano</option>
                {planos?.data?.map((plano: any) => (
                  <option key={plano.id} value={plano.id}>
                    {plano.nome_plano} - R$ {plano.valor_mensal}
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
                disabled={updateParcelaMutation.isPending}
              />
              {errors.data_vencimento && <div className="invalid-feedback">{errors.data_vencimento}</div>}
            </div>
          </div>
        </div>


        <div className="mb-3">
          <label htmlFor="observacoes" className="form-label small">Observações</label>
          <textarea
            className={`form-control ${errors.observacoes ? 'is-invalid' : ''}`}
            id="observacoes"
            rows={3}
            value={formData.observacoes}
            onChange={(e) => handleInputChange('observacoes', e.target.value)}
            disabled={updateParcelaMutation.isPending}
            placeholder="Observações sobre a parcela"
          ></textarea>
          {errors.observacoes && <div className="invalid-feedback">{errors.observacoes}</div>}
        </div>

        <div className="d-flex justify-content-end gap-2 mt-2">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleCancel}
            disabled={updateParcelaMutation.isPending}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={updateParcelaMutation.isPending}
          >
            {updateParcelaMutation.isPending ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Salvando...
              </>
            ) : (
              <>
                Salvar Alterações
              </>
            )}
          </button>
        </div>
      </form>
    </DraggableModal>
  );
};

export default TituloEditModal;
