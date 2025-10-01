import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { TituloService } from '../../../services/tituloService';
import { PlanoService } from '../../../services/planoService';
import { useNotificationContext } from '../../../contexts/NotificationContext';
import { CreateCarneParcela } from '../../../types';
import DraggableModal from '../../common/DraggableModal';

interface TituloForm {
  plano_id: number;
  data_vencimento: string;
  observacoes?: string;
}

interface TituloCreateModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  clienteId?: number;
}

const TituloCreateModal: React.FC<TituloCreateModalProps> = ({ 
  show, 
  onClose, 
  onSuccess,
  clienteId
}) => {
  const [formData, setFormData] = useState<TituloForm>({
    plano_id: 0,
    data_vencimento: '',
    observacoes: '',
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

  // Limpar formulário quando modal fechar
  useEffect(() => {
    if (!show) {
      setFormData({
        plano_id: 0,
        data_vencimento: '',
        observacoes: '',
      });
      setErrors({});
    }
  }, [show]);

  // Mutation para criar parcela
  const createParcelaMutation = useMutation({
    mutationFn: (data: CreateCarneParcela) => TituloService.create(data),
    onSuccess: () => {
      success('Parcela criada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['carne-parcelas'] });
      queryClient.invalidateQueries({ queryKey: ['parcelas'] }); // Para ClienteEditModal
      queryClient.invalidateQueries({ queryKey: ['titulos'] }); // Para outras páginas
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      // Chamar onSuccess antes de fechar o modal
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      console.error('Erro ao criar parcela:', err);
      error('Erro ao criar parcela. Tente novamente.');
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

    const payload = {
      plano_id: formData.plano_id,
      data_vencimento: formData.data_vencimento,
      observacoes: formData.observacoes || '',
      cliente_id: clienteId
    };

    createParcelaMutation.mutate(payload as any);
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <DraggableModal
      show={show}
      onClose={handleCancel}
      title="Novo Título"
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
                disabled={createParcelaMutation.isPending}
              />
              {errors.data_vencimento && <div className="invalid-feedback">{errors.data_vencimento}</div>}
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
            {createParcelaMutation.isPending ? 'Criando...' : 'Criar Título'}
          </button>
        </div>
      </form>
    </DraggableModal>
  );
};

export default TituloCreateModal;
