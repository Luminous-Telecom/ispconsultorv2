import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNotificationContext } from '../../../contexts/NotificationContext';
import DraggableModal from '../../common/DraggableModal';

interface ContratoForm {
  cliente_id: number;
  filial: string;
  status_contrato: string;
  status_acesso: string;
  plano_id: number;
  data_ativacao: string;
  data_vencimento: string;
  valor: number;
  observacoes: string;
}

interface ContratoCreateModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  clienteId?: number;
}

const ContratoCreateModal: React.FC<ContratoCreateModalProps> = ({ 
  show, 
  onClose, 
  onSuccess,
  clienteId 
}) => {
  const [formData, setFormData] = useState<ContratoForm>({
    cliente_id: clienteId || 0,
    filial: 'Matriz',
    status_contrato: 'Ativo',
    status_acesso: 'Liberado',
    plano_id: 0,
    data_ativacao: new Date().toISOString().split('T')[0],
    data_vencimento: '',
    valor: 0,
    observacoes: ''
  });

  const [errors, setErrors] = useState<Partial<ContratoForm>>({});
  const { success, error } = useNotificationContext();
  const queryClient = useQueryClient();

  // Mock mutation para criar contrato
  const createContratoMutation = useMutation({
    mutationFn: async (data: ContratoForm) => {
      // Simular criação de contrato
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true, data: { id: Date.now(), ...data } };
    },
    onSuccess: () => {
      success('Contrato criado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      onClose();
      onSuccess?.();
    },
    onError: (err: any) => {
      error('Erro ao criar contrato');
    }
  });

  // Limpar formulário quando modal fechar
  React.useEffect(() => {
    if (!show) {
      setFormData({
        cliente_id: clienteId || 0,
        filial: 'Matriz',
        status_contrato: 'Ativo',
        status_acesso: 'Liberado',
        plano_id: 0,
        data_ativacao: new Date().toISOString().split('T')[0],
        data_vencimento: '',
        valor: 0,
        observacoes: ''
      });
      setErrors({});
    }
  }, [show, clienteId]);

  const handleInputChange = (field: keyof ContratoForm, value: string | number) => {
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
    const newErrors: any = {};

    if (!formData.cliente_id) newErrors.cliente_id = 'Cliente é obrigatório';
    if (!formData.filial.trim()) newErrors.filial = 'Filial é obrigatória';
    if (!formData.plano_id) newErrors.plano_id = 'Plano é obrigatório';
    if (!formData.data_ativacao) newErrors.data_ativacao = 'Data de ativação é obrigatória';
    if (!formData.valor || formData.valor <= 0) newErrors.valor = 'Valor deve ser maior que zero';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    createContratoMutation.mutate(formData);
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <DraggableModal
      show={show}
      onClose={handleCancel}
      title="Novo Contrato"
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        <div className="row">
          <div className="col-md-6">
            <div className="mb-3">
              <label htmlFor="filial" className="form-label small">Filial *</label>
              <input
                type="text"
                className={`form-control ${errors.filial ? 'is-invalid' : ''}`}
                id="filial"
                value={formData.filial}
                onChange={(e) => handleInputChange('filial', e.target.value)}
                disabled={createContratoMutation.isPending}
                placeholder="Ex: Matriz, Filial 1"
              />
              {errors.filial && <div className="invalid-feedback">{errors.filial}</div>}
            </div>
          </div>

          <div className="col-md-6">
            <div className="mb-3">
              <label htmlFor="status_contrato" className="form-label small">Status do Contrato</label>
              <select
                className="form-select form-select-sm"
                id="status_contrato"
                value={formData.status_contrato}
                onChange={(e) => handleInputChange('status_contrato', e.target.value)}
                disabled={createContratoMutation.isPending}
              >
                <option value="Ativo">Ativo</option>
                <option value="Suspenso">Suspenso</option>
                <option value="Cancelado">Cancelado</option>
                <option value="Pendente">Pendente</option>
              </select>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-md-6">
            <div className="mb-3">
              <label htmlFor="status_acesso" className="form-label small">Status de Acesso</label>
              <select
                className="form-select form-select-sm"
                id="status_acesso"
                value={formData.status_acesso}
                onChange={(e) => handleInputChange('status_acesso', e.target.value)}
                disabled={createContratoMutation.isPending}
              >
                <option value="Liberado">Liberado</option>
                <option value="Bloqueado">Bloqueado</option>
                <option value="Pendente">Pendente</option>
              </select>
            </div>
          </div>

          <div className="col-md-6">
            <div className="mb-3">
              <label htmlFor="plano_id" className="form-label small">Plano de Vendas *</label>
              <select
                className={`form-select ${errors.plano_id ? 'is-invalid' : ''}`}
                id="plano_id"
                value={formData.plano_id}
                onChange={(e) => handleInputChange('plano_id', parseInt(e.target.value))}
                disabled={createContratoMutation.isPending}
              >
                <option value={0}>Selecione um plano</option>
                <option value={1}>Plano Básico</option>
                <option value={2}>Plano Premium</option>
                <option value={3}>Plano Empresarial</option>
              </select>
              {errors.plano_id && <div className="invalid-feedback">{errors.plano_id}</div>}
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-md-6">
            <div className="mb-3">
              <label htmlFor="data_ativacao" className="form-label small">Data de Ativação *</label>
              <input
                type="date"
                className={`form-control ${errors.data_ativacao ? 'is-invalid' : ''}`}
                id="data_ativacao"
                value={formData.data_ativacao}
                onChange={(e) => handleInputChange('data_ativacao', e.target.value)}
                disabled={createContratoMutation.isPending}
              />
              {errors.data_ativacao && <div className="invalid-feedback">{errors.data_ativacao}</div>}
            </div>
          </div>

          <div className="col-md-6">
            <div className="mb-3">
              <label htmlFor="data_vencimento" className="form-label small">Data de Vencimento</label>
              <input
                type="date"
                className="form-control form-control-sm"
                id="data_vencimento"
                value={formData.data_vencimento}
                onChange={(e) => handleInputChange('data_vencimento', e.target.value)}
                disabled={createContratoMutation.isPending}
              />
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-md-6">
            <div className="mb-3">
              <label htmlFor="valor" className="form-label small">Valor *</label>
              <input
                type="number"
                step="0.01"
                className={`form-control ${errors.valor ? 'is-invalid' : ''}`}
                id="valor"
                value={formData.valor}
                onChange={(e) => handleInputChange('valor', parseFloat(e.target.value) || 0)}
                disabled={createContratoMutation.isPending}
                placeholder="0.00"
              />
              {errors.valor && <div className="invalid-feedback">{errors.valor}</div>}
            </div>
          </div>
        </div>

        <div className="mb-3">
          <label htmlFor="observacoes" className="form-label small">Observações</label>
          <textarea
            className="form-control form-control-sm"
            id="observacoes"
            rows={3}
            value={formData.observacoes}
            onChange={(e) => handleInputChange('observacoes', e.target.value)}
            disabled={createContratoMutation.isPending}
            placeholder="Observações adicionais sobre o contrato"
          ></textarea>
        </div>

          <div className="d-flex justify-content-end gap-2 mt-2">
          <button
            type="button"
              className="btn btn-secondary btn-sm"
            onClick={handleCancel}
            disabled={createContratoMutation.isPending}
          >
            Cancelar
          </button>
          <button
            type="submit"
              className="btn btn-primary btn-sm"
            disabled={createContratoMutation.isPending}
          >
            {createContratoMutation.isPending ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Criando...
              </>
            ) : (
              <>
                <i className="bi bi-check"></i> Criar Contrato
              </>
            )}
          </button>
        </div>
      </form>
    </DraggableModal>
  );
};

export default ContratoCreateModal;
