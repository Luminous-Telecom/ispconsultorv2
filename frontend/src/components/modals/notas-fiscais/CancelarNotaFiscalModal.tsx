import React, { useState, useEffect, useMemo, useCallback } from 'react';
import DraggableModal from '@/components/common/DraggableModal';
import { Button } from '@/components/ui';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { NotaFiscal } from '@/types';
import { NotaFiscalService } from '@/services/notaFiscalService';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';

interface CancelarNotaFiscalModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  notaFiscal: NotaFiscal | null;
}

const CancelarNotaFiscalModal: React.FC<CancelarNotaFiscalModalProps> = ({
  show,
  onClose,
  onSuccess,
  notaFiscal
}) => {
  const isMobile = useIsMobile();
  const { error, success } = useNotificationContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justificativa, setJustificativa] = useState('');
  const [justificativaError, setJustificativaError] = useState('');

  // Validação da justificativa
  const validateJustificativa = (value: string): string => {
    if (!value.trim()) {
      return 'Justificativa é obrigatória';
    }
    if (value.trim().length < 15) {
      return 'Justificativa deve ter pelo menos 15 caracteres';
    }
    if (value.length > 500) {
      return 'Justificativa deve ter no máximo 500 caracteres';
    }
    return '';
  };

  // Verificar se o formulário é válido
  const isFormValid = useMemo(() => {
    return justificativa.trim().length >= 15 && justificativa.trim().length <= 500;
  }, [justificativa]);

  // Limpar formulário quando modal fechar ou nota fiscal mudar
  useEffect(() => {
    if (!show || !notaFiscal) {
      setJustificativa('');
      setJustificativaError('');
    }
  }, [show, notaFiscal]);

  const handleClose = useCallback(() => {
    if (isSubmitting) return;
    setJustificativa('');
    setJustificativaError('');
    onClose();
  }, [isSubmitting, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!notaFiscal) return;

    const validationError = validateJustificativa(justificativa);
    if (validationError) {
      setJustificativaError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await NotaFiscalService.cancelar(notaFiscal.id, justificativa.trim());

      if (response.success) {
        success('Nota fiscal cancelada com sucesso!');
        onSuccess?.();
        onClose();
      } else {
        error(response.message || 'Erro ao cancelar nota fiscal');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao cancelar nota fiscal';
      error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJustificativaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setJustificativa(value);

    // Limpar erro quando usuário começar a digitar
    if (justificativaError) {
      setJustificativaError('');
    }
  };

  // Header actions com botões padronizados
  const headerActionsContent = useMemo(() => (
    <div className="d-flex gap-2">
      <Button
        type="button"
        variant="primary"
        size="sm"
        onClick={handleClose}
        disabled={isSubmitting}
      >
        Cancelar
      </Button>
      <Button
        type="submit"
        form="cancelar-nf-form"
        variant="primary"
        size="sm"
        disabled={!isFormValid || isSubmitting}
        isLoading={isSubmitting}
      >
        {isSubmitting ? 'Cancelando...' : 'Confirmar Cancelamento'}
      </Button>
    </div>
  ), [isFormValid, isSubmitting, handleClose]);

  if (!notaFiscal) return null;

  return (
    <DraggableModal
      show={show}
      onClose={handleClose}
      title="Cancelar Nota Fiscal"
      size="md"
      modalId="cancelar-nf-modal"
      headerActions={headerActionsContent}
    >
      <div style={{ padding: isMobile ? '0' : '16px' }}>
        <div className="alert alert-warning mb-3">
          <i className="fas fa-exclamation-triangle me-2"></i>
          <strong>Atenção!</strong> Esta ação não pode ser desfeita.
        </div>

        <div className="mb-3">
          <h6>Detalhes da Nota Fiscal:</h6>
          <div className="row">
            <div className="col-md-6">
              <small className="text-muted">Número:</small>
              <div className="fw-bold">{notaFiscal.numero || 'Não informado'}</div>
            </div>
            <div className="col-md-6">
              <small className="text-muted">Cliente:</small>
              <div className="fw-bold">
                {notaFiscal.cliente?.razao_social || notaFiscal.cliente?.nome_fantasia || 'Não informado'}
              </div>
            </div>
          </div>
          <div className="row mt-2">
            <div className="col-md-6">
              <small className="text-muted">Valor Total:</small>
              <div className="fw-bold text-success">
                R$ {notaFiscal.valor_total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
              </div>
            </div>
            <div className="col-md-6">
              <small className="text-muted">Status:</small>
              <div className="fw-bold">
                <span className={`badge ${
                  notaFiscal.status === 'AUTORIZADA' ? 'bg-success' : 'bg-secondary'
                }`}>
                  {notaFiscal.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        <form id="cancelar-nf-form" onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="justificativa" className="form-label">
              Justificativa do Cancelamento <span className="text-danger">*</span>
            </label>
            <textarea
              id="justificativa"
              name="justificativa"
              className={`form-control ${justificativaError ? 'is-invalid' : ''}`}
              rows={4}
              placeholder="Digite a justificativa para o cancelamento da nota fiscal (mínimo 15 caracteres)..."
              value={justificativa}
              onChange={handleJustificativaChange}
              disabled={isSubmitting}
            />
            {justificativaError && (
              <div className="invalid-feedback">{justificativaError}</div>
            )}
            <div className="form-text">
              {justificativa.length}/500 caracteres
            </div>
          </div>
        </form>
      </div>
    </DraggableModal>
  );
};

export default CancelarNotaFiscalModal;
