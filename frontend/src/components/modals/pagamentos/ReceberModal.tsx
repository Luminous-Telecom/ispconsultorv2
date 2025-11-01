import React, { useState, useEffect } from 'react';
import { useMarcarTituloPago } from '../../../hooks/useTitulos';
import DraggableModal from '../../common/DraggableModal';
import FormField from '../../ui/FormField';

interface ReceberModalProps {
  isOpen: boolean;
  onClose: () => void;
  parcela: {
    id: number;
    numero_titulo: string;
    valor_parcela: number;
    data_vencimento: string;
    cliente?: {
      razao_social: string;
    };
  } | null;
  onSuccess?: () => void;
}

const ReceberModal: React.FC<ReceberModalProps> = ({
  isOpen,
  onClose,
  parcela,
  onSuccess
}) => {
  const [formData, setFormData] = useState({
    data_pagamento: new Date().toISOString().split('T')[0],
    valor_pago: '',
    observacoes: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const marcarPagoMutation = useMarcarTituloPago();

  useEffect(() => {
    if (isOpen && parcela) {
      setFormData({
        data_pagamento: new Date().toISOString().split('T')[0],
        valor_pago: (parcela.valor_parcela || 0).toString(),
        observacoes: ''
      });
      setErrors({});
    }
  }, [isOpen, parcela]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.data_pagamento) {
      newErrors.data_pagamento = 'Data de pagamento é obrigatória';
    } else {
      const dataPagamento = new Date(formData.data_pagamento);
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      if (dataPagamento > hoje) {
        newErrors.data_pagamento = 'Data de pagamento não pode ser futura';
      }
    }

    if (!formData.valor_pago) {
      newErrors.valor_pago = 'Valor pago é obrigatório';
    } else {
      const valor = parseFloat(formData.valor_pago);
      if (isNaN(valor) || valor <= 0) {
        newErrors.valor_pago = 'Valor deve ser maior que zero';
      }
    }

    if (formData.observacoes && formData.observacoes.length > 500) {
      newErrors.observacoes = 'Observações devem ter no máximo 500 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !parcela) return;

    try {
      await marcarPagoMutation.mutateAsync({
        id: parcela.id,
        dataPagamento: formData.data_pagamento,
        valorPago: parseFloat(formData.valor_pago),
        observacoes: formData.observacoes
      });

      onSuccess?.();
    } catch (error) {
      console.error('Erro ao marcar como pago:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    const normalizedValue = value ?? '';
    setFormData(prev => ({ ...prev, [field]: normalizedValue }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleValorChange = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    const floatValue = parseFloat(numericValue) / 100;
    handleInputChange('valor_pago', floatValue.toFixed(2));
  };

  if (!parcela) return null;

  return (
    <DraggableModal
      show={isOpen}
      onClose={onClose}
      title={`Receber - Título ${parcela.numero_titulo}`}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="p-3">
        <div className="card mb-3">
          <div className="card-header py-2">
            <h6 className="mb-0">Informações da Parcela</h6>
          </div>
          <div className="card-body py-2">
            <div className="row g-2">
              <div className="col-md-6">
                <small className="text-muted">Cliente:</small><br />
                <span className="text-secondary">{parcela.cliente?.razao_social || 'N/A'}</span>
              </div>
              <div className="col-md-6">
                <small className="text-muted">Vencimento:</small><br />
                <span className="text-secondary">{new Date(parcela.data_vencimento).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
            <div className="row g-2 mt-2">
              <div className="col-md-6">
                <small className="text-muted">Valor Original:</small><br />
                <span className="text-secondary">R$ {(Number(parcela.valor_parcela) || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-md-6">
            <div className="mb-3">
              <FormField
                name="data_pagamento"
                type="date"
                label="Data de Pagamento"
                required={true}
                size="md"
                value={formData.data_pagamento || ''}
                onChange={(value) => handleInputChange('data_pagamento', String(value ?? ''))}
                error={errors.data_pagamento}
                isInvalid={!!errors.data_pagamento}
                disabled={marcarPagoMutation.isPending}
              />
            </div>
          </div>

          <div className="col-md-6">
            <div className="mb-3">
              <label htmlFor="valor_pago" className="form-label">
                Valor Pago *
              </label>
              <div className="input-group has-validation">
                <span className="input-group-text" style={{ padding: '0 0.75rem' }}>R$</span>
                <input
                  id="valor_pago"
                  name="valor_pago"
                  type="text"
                  className={`form-control ${errors.valor_pago ? 'is-invalid' : ''}`}
                  placeholder="0,00"
                  required={true}
                  value={formData.valor_pago}
                  onChange={(e) => handleValorChange(e.target.value)}
                  disabled={marcarPagoMutation.isPending}
                />
                {errors.valor_pago && (
                  <div className="invalid-feedback">
                    {errors.valor_pago}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <FormField
            name="observacoes"
            type="textarea"
            label="Observações"
            placeholder="Observações sobre o pagamento (opcional)"
            size="md"
            value={formData.observacoes || ''}
            onChange={(value) => handleInputChange('observacoes', String(value ?? ''))}
            error={errors.observacoes}
            isInvalid={!!errors.observacoes}
            disabled={marcarPagoMutation.isPending}
            rows={3}
          />
          <div className="text-secondary mt-2">
            {(formData.observacoes || '').length}/500 caracteres
          </div>
        </div>

        <div className="d-flex justify-content-end gap-2 mt-4">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={marcarPagoMutation.isPending}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn btn-success"
            disabled={marcarPagoMutation.isPending}
          >
            Receber
          </button>
        </div>
      </form>
    </DraggableModal>
  );
};

export default ReceberModal;
