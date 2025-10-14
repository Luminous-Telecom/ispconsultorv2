import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNotificationContext } from '../../../contexts/NotificationContext';
import DraggableModal from '../../common/DraggableModal';
import { useCreateContrato, CreateContratoData } from '../../../hooks/useContratos';
import { useClientes } from '../../../hooks/useClientes';
import { usePlanos } from '../../../hooks/usePlanos';
import { useBancos } from '../../../hooks/useBancos';

interface ContratoForm {
  cliente_id: number;
  plano_id: number;
  desconto_percentual?: number;
  desconto_valor?: number;
  data_inicio?: string;
  data_fim?: string;
  status: 'ativo' | 'inativo' | 'suspenso';
  observacoes?: string;
  isento_mensalidade: boolean;
  dia_vencimento?: number;
  conta_boleto?: number;
  data_validade_desconto?: string;
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
    plano_id: 0,
    desconto_percentual: 0,
    desconto_valor: 0,
    data_inicio: new Date().toISOString().split('T')[0],
    data_fim: '',
    status: 'ativo',
    observacoes: '',
    isento_mensalidade: false,
    dia_vencimento: 10,
    conta_boleto: 0,
    data_validade_desconto: ''
  });

  const [errors, setErrors] = useState<Partial<ContratoForm>>({});
  const { success, error } = useNotificationContext();
  
  // Hooks para buscar dados
  const { data: clientesData } = useClientes();
  const { data: planosData } = usePlanos();
  const { data: bancosData } = useBancos();
  
  const clientes = Array.isArray(clientesData) ? clientesData : (clientesData?.data || []);
  const planos = Array.isArray(planosData) ? planosData : (planosData?.data || []);
  const bancos = Array.isArray(bancosData) ? bancosData : (bancosData?.data || []);
  
  // Mutation para criar contrato
  const createContratoMutation = useCreateContrato();

  // Limpar formulário quando modal fechar
  React.useEffect(() => {
    if (!show) {
      setFormData({
        cliente_id: clienteId || 0,
        plano_id: 0,
        desconto_percentual: 0,
        desconto_valor: 0,
        data_inicio: new Date().toISOString().split('T')[0],
        data_fim: '',
        status: 'ativo',
        observacoes: '',
        isento_mensalidade: false,
        dia_vencimento: 10,
        conta_boleto: 0,
        data_validade_desconto: ''
      });
      setErrors({});
    }
  }, [show, clienteId]);

  const handleInputChange = (field: keyof ContratoForm, value: string | number | boolean) => {
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
    if (!formData.plano_id) newErrors.plano_id = 'Plano é obrigatório';
    if (!formData.data_inicio) newErrors.data_inicio = 'Data de início é obrigatória';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const contratoData: CreateContratoData = {
      cliente_id: formData.cliente_id,
      plano_id: formData.plano_id,
      desconto_percentual: formData.desconto_percentual || undefined,
      desconto_valor: formData.desconto_valor || undefined,
      data_inicio: formData.data_inicio || undefined,
      data_fim: formData.data_fim || undefined,
      status: formData.status,
      observacoes: formData.observacoes || undefined,
      isento_mensalidade: formData.isento_mensalidade,
      dia_vencimento: formData.dia_vencimento || undefined,
      conta_boleto: formData.conta_boleto || undefined,
      data_validade_desconto: formData.data_validade_desconto || undefined
    };

    createContratoMutation.mutate(contratoData, {
      onSuccess: () => {
        success('Contrato criado com sucesso!');
        onSuccess?.();
        onClose();
      },
      onError: () => {
        error('Erro ao criar contrato');
      }
    });
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <DraggableModal
      show={show}
      onClose={handleCancel}
      title="Contrato"
      size="lg"
      headerActions={
        <div className="d-flex gap-2">
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
            form="contrato-create-form"
            className="btn btn-primary btn-sm"
            disabled={createContratoMutation.isPending}
          >
            Criar Contrato
          </button>
        </div>
      }
    >
      <form id="contrato-create-form" onSubmit={handleSubmit}>
        <div className="row">
          <div className="col-md-6">
            <div className="mb-3">
              <label htmlFor="cliente_id" className="form-label small">Cliente *</label>
              <select
                className={`form-select ${errors.cliente_id ? 'is-invalid' : ''}`}
                id="cliente_id"
                value={formData.cliente_id}
                onChange={(e) => handleInputChange('cliente_id', parseInt(e.target.value))}
                disabled={createContratoMutation.isPending}
              >
                <option value={0}>Selecione um cliente</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.razao_social}
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
                disabled={createContratoMutation.isPending}
              >
                <option value={0}>Selecione um plano</option>
                {planos.map((plano) => (
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
              <label htmlFor="status" className="form-label small">Status</label>
              <select
                className="form-select"
                id="status"
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value as 'ativo' | 'inativo' | 'suspenso')}
                disabled={createContratoMutation.isPending}
              >
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
                <option value="suspenso">Suspenso</option>
              </select>
            </div>
          </div>

          <div className="col-md-6">
            <div className="mb-3">
              <label htmlFor="data_inicio" className="form-label small">Data de Início *</label>
              <input
                type="date"
                className={`form-control ${errors.data_inicio ? 'is-invalid' : ''}`}
                id="data_inicio"
                value={formData.data_inicio}
                onChange={(e) => handleInputChange('data_inicio', e.target.value)}
                disabled={createContratoMutation.isPending}
              />
              {errors.data_inicio && <div className="invalid-feedback">{errors.data_inicio}</div>}
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-md-6">
            <div className="mb-3">
              <label htmlFor="data_fim" className="form-label small">Data de Fim</label>
              <input
                type="date"
                className="form-control"
                id="data_fim"
                value={formData.data_fim}
                onChange={(e) => handleInputChange('data_fim', e.target.value)}
                disabled={createContratoMutation.isPending}
              />
            </div>
          </div>

          <div className="col-md-6">
            <div className="mb-3">
              <label htmlFor="desconto_percentual" className="form-label small">Desconto %</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                className="form-control"
                id="desconto_percentual"
                value={formData.desconto_percentual || ''}
                onChange={(e) => handleInputChange('desconto_percentual', parseFloat(e.target.value) || 0)}
                disabled={createContratoMutation.isPending}
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-md-6">
            <div className="mb-3">
              <label htmlFor="desconto_valor" className="form-label small">Desconto R$</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-control"
                id="desconto_valor"
                value={formData.desconto_valor || ''}
                onChange={(e) => handleInputChange('desconto_valor', parseFloat(e.target.value) || 0)}
                disabled={createContratoMutation.isPending}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="col-md-6">
            <div className="mb-3">
              <label htmlFor="dia_vencimento" className="form-label small">Dia de Vencimento</label>
              <input
                type="number"
                min="1"
                max="31"
                className="form-control"
                id="dia_vencimento"
                value={formData.dia_vencimento || ''}
                onChange={(e) => handleInputChange('dia_vencimento', parseInt(e.target.value) || 0)}
                disabled={createContratoMutation.isPending}
                placeholder="10"
              />
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-md-6">
            <div className="mb-3">
              <label htmlFor="conta_boleto" className="form-label small">Banco para Boleto</label>
              <select
                className="form-select"
                id="conta_boleto"
                value={formData.conta_boleto || 0}
                onChange={(e) => handleInputChange('conta_boleto', parseInt(e.target.value))}
                disabled={createContratoMutation.isPending}
              >
                <option value={0}>Selecione um banco</option>
                {bancos.map((banco) => (
                  <option key={banco.id} value={banco.id}>
                    {banco.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="col-md-6">
            <div className="mb-3">
              <label htmlFor="data_validade_desconto" className="form-label small">Validade do Desconto</label>
              <input
                type="date"
                className="form-control"
                id="data_validade_desconto"
                value={formData.data_validade_desconto}
                onChange={(e) => handleInputChange('data_validade_desconto', e.target.value)}
                disabled={createContratoMutation.isPending}
              />
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-12">
            <div className="mb-3 form-check">
              <input
                type="checkbox"
                className="form-check-input"
                id="isento_mensalidade"
                checked={formData.isento_mensalidade}
                onChange={(e) => handleInputChange('isento_mensalidade', e.target.checked)}
                disabled={createContratoMutation.isPending}
              />
              <label className="form-check-label" htmlFor="isento_mensalidade">
                Cliente isento de mensalidade
              </label>
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

      </form>
    </DraggableModal>
  );
};

export default ContratoCreateModal;
