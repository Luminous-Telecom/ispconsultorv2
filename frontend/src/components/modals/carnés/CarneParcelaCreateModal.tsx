import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { CarneParcelaService } from '../../../services/carneParcelaService';
import { CarneService } from '../../../services/carneService';
import { useNotificationContext } from '../../../contexts/NotificationContext';
import { CreateCarneParcela } from '../../../types';
import DraggableModal from '../../common/DraggableModal';

interface CarneParcelaForm {
  carne_id: number;
  numero_parcela: number;
  valor_parcela: number;
  data_vencimento: string;
  pago: boolean;
  status: 'pendente' | 'pago' | 'cancelado' | 'atrasado';
  observacoes?: string;
}

interface CarneParcelaCreateModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  clienteId?: number;
}

const CarneParcelaCreateModal: React.FC<CarneParcelaCreateModalProps> = ({ 
  show, 
  onClose, 
  onSuccess,
  clienteId
}) => {
  const [formData, setFormData] = useState<CarneParcelaForm>({
    carne_id: 0,
    numero_parcela: 1,
    valor_parcela: 0,
    data_vencimento: '',
    pago: false,
    status: 'pendente',
    observacoes: '',
  });

  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const { success, error } = useNotificationContext();
  const queryClient = useQueryClient();

  // Queries para buscar dados
  const { data: carnes } = useQuery({
    queryKey: ['carnes-ativos'],
    queryFn: () => CarneService.findAtivos(),
    enabled: show,
  });

  // Definir carne_id quando clienteId for fornecido (buscar carnê do cliente)
  useEffect(() => {
    if (show && clienteId && carnes) {
      const carneDoCliente = carnes.find((carne: any) => carne.cliente_id === clienteId);
      if (carneDoCliente) {
        setFormData(prev => ({
          ...prev,
          carne_id: carneDoCliente.id
        }));
      }
    }
  }, [show, clienteId, carnes]);

  // Mutation para criar parcela
  const createParcelaMutation = useMutation({
    mutationFn: (data: CreateCarneParcela) => CarneParcelaService.create(data),
    onSuccess: () => {
      success('Parcela criada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['carne-parcelas'] });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      console.error('Erro ao criar parcela:', err);
      error('Erro ao criar parcela. Tente novamente.');
    }
  });

  const handleInputChange = <K extends keyof CarneParcelaForm>(
    field: K,
    value: CarneParcelaForm[K]
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

    if (!formData.carne_id) newErrors.carne_id = 'Carnê é obrigatório';
    if (!formData.valor_parcela || formData.valor_parcela <= 0) newErrors.valor_parcela = 'Valor da parcela deve ser maior que zero';
    if (!formData.data_vencimento) newErrors.data_vencimento = 'Data de vencimento é obrigatória';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    createParcelaMutation.mutate(formData as unknown as CreateCarneParcela);
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
              <label htmlFor="carne_id" className="form-label small">Carnê *</label>
              <select
                className={`form-select ${errors.carne_id ? 'is-invalid' : ''}`}
                id="carne_id"
                value={formData.carne_id}
                onChange={(e) => handleInputChange('carne_id', parseInt(e.target.value))}
                disabled={createParcelaMutation.isPending}
              >
                <option value={0}>Selecione um carnê</option>
                {carnes?.map((carne: any) => (
                  <option key={carne.id} value={carne.id}>
                    {carne.numero_carne} - {carne.cliente?.razao_social || carne.cliente?.nome_fantasia}
                  </option>
                ))}
              </select>
              {errors.carne_id && <div className="invalid-feedback">{errors.carne_id}</div>}
            </div>
          </div>

          <div className="col-md-6">
            <div className="mb-3">
              <label htmlFor="numero_parcela" className="form-label small">Número da Parcela</label>
              <input
                type="number"
                min="1"
                className="form-control"
                id="numero_parcela"
                value={formData.numero_parcela}
                onChange={(e) => handleInputChange('numero_parcela', parseInt(e.target.value) || 1)}
                disabled={createParcelaMutation.isPending}
              />
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-md-6">
            <div className="mb-3">
              <label htmlFor="valor_parcela" className="form-label small">Valor da Parcela *</label>
              <input
                type="number"
                step="0.01"
                className={`form-control ${errors.valor_parcela ? 'is-invalid' : ''}`}
                id="valor_parcela"
                value={formData.valor_parcela}
                onChange={(e) => handleInputChange('valor_parcela', parseFloat(e.target.value) || 0)}
                disabled={createParcelaMutation.isPending}
                placeholder="0.00"
              />
              {errors.valor_parcela && <div className="invalid-feedback">{errors.valor_parcela}</div>}
            </div>
          </div>

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
          <div className="col-md-6">
            <div className="mb-3">
              <label htmlFor="status" className="form-label small">Status</label>
              <select
                className="form-select"
                id="status"
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value as any)}
                disabled={createParcelaMutation.isPending}
              >
                <option value="pendente">Pendente</option>
                <option value="pago">Pago</option>
                <option value="cancelado">Cancelado</option>
                <option value="atrasado">Atrasado</option>
              </select>
            </div>
          </div>

          <div className="col-md-6">
            <div className="mb-3">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="pago"
                  checked={formData.pago}
                  onChange={(e) => handleInputChange('pago', e.target.checked)}
                  disabled={createParcelaMutation.isPending}
                />
                <label className="form-check-label" htmlFor="pago">
                  Marcar como pago
                </label>
              </div>
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

export default CarneParcelaCreateModal;
