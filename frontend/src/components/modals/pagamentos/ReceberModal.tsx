import React, { useState, useEffect } from 'react';
import { useMarcarTituloPago } from '../../../hooks/useTitulos';
import DraggableModal from '../../common/DraggableModal';

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
    data_pagamento: new Date().toISOString().split('T')[0], // Inicializar com data atual
    valor_pago: '',
    observacoes: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const marcarPagoMutation = useMarcarTituloPago();

  useEffect(() => {
    if (isOpen && parcela) {
      // Sempre usar a data atual quando o modal abrir
      const hoje = new Date().toISOString().split('T')[0];
      setFormData({
        data_pagamento: hoje,
        valor_pago: (Number(parcela.valor_parcela) || 0).toString(),
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
      onClose();
    } catch (error) {
      console.error('Erro ao marcar como pago:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    const floatValue = parseFloat(numericValue) / 100;
    return floatValue.toFixed(2);
  };

  const handleValorChange = (value: string) => {
    const formatted = formatCurrency(value);
    handleInputChange('valor_pago', formatted);
  };

  if (!parcela) return null;

  return (
    <DraggableModal
      show={isOpen}
      onClose={onClose}
      title={`Receber - Título ${parcela.numero_titulo}`}
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        {/* Informações da parcela */}
        <div className="card mb-3">
          <div className="card-header">
            <h6 className="mb-0">Informações da Parcela</h6>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-6">
                <strong>Cliente:</strong><br />
                {parcela.cliente?.razao_social || 'N/A'}
              </div>
              <div className="col-md-6">
                <strong>Vencimento:</strong><br />
                {new Date(parcela.data_vencimento).toLocaleDateString('pt-BR')}
              </div>
            </div>
            <div className="row mt-2">
              <div className="col-md-6">
                <strong>Valor Original:</strong><br />
                R$ {(Number(parcela.valor_parcela) || 0).toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Dados do pagamento */}
        <div className="row">
          <div className="col-md-6">
            <div className="mb-3">
              <label htmlFor="data_pagamento" className="form-label">
                Data de Pagamento *
              </label>
              <input
                type="date"
                className={`form-control ${errors.data_pagamento ? 'is-invalid' : ''}`}
                id="data_pagamento"
                value={formData.data_pagamento}
                onChange={(e) => handleInputChange('data_pagamento', e.target.value)}
                disabled={marcarPagoMutation.isPending}
              />
              {errors.data_pagamento && (
                <div className="invalid-feedback">{errors.data_pagamento}</div>
              )}
            </div>
          </div>

          <div className="col-md-6">
            <div className="mb-3">
              <label htmlFor="valor_pago" className="form-label">
                Valor Pago *
              </label>
              <div className="input-group">
                <span className="input-group-text d-flex align-items-center" style={{ height: '38px' }}>R$</span>
                <input
                  type="text"
                  className={`form-control ${errors.valor_pago ? 'is-invalid' : ''}`}
                  id="valor_pago"
                  value={formData.valor_pago}
                  onChange={(e) => handleValorChange(e.target.value)}
                  placeholder="0,00"
                  disabled={marcarPagoMutation.isPending}
                />
                {errors.valor_pago && (
                  <div className="invalid-feedback">{errors.valor_pago}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-3">
          <label htmlFor="observacoes" className="form-label">
            Observações
          </label>
          <textarea
            className={`form-control ${errors.observacoes ? 'is-invalid' : ''}`}
            id="observacoes"
            rows={3}
            value={formData.observacoes}
            onChange={(e) => handleInputChange('observacoes', e.target.value)}
            placeholder="Observações sobre o pagamento (opcional)"
            disabled={marcarPagoMutation.isPending}
          />
          {errors.observacoes && (
            <div className="invalid-feedback">{errors.observacoes}</div>
          )}
          <div className="form-text">
            {formData.observacoes.length}/500 caracteres
          </div>
        </div>

        {/* Botões */}
        <div className="d-flex justify-content-end gap-2 mt-3">
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
            {marcarPagoMutation.isPending ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Processando...
              </>
            ) : (
              'Receber'
            )}
          </button>
        </div>
      </form>
    </DraggableModal>
  );
};

export default ReceberModal;
