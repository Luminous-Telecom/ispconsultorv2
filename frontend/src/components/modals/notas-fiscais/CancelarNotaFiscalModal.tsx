import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useI18n } from '@/contexts/I18nContext';
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
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const { error, success } = useNotificationContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justificativa, setJustificativa] = useState('');
  const [justificativaError, setJustificativaError] = useState('');

  // Validação da justificativa
  const validateJustificativa = (value: string): string => {
    if (!value.trim()) {
      return t('messages.justificationRequired');
    }
    if (value.trim().length < 15) {
      return t('messages.justificationMinLength');
    }
    if (value.length > 500) {
      return t('messages.justificationMaxLength');
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
        success(t('messages.invoiceCanceled'));
        onSuccess?.();
        onClose();
      } else {
        error(response.message || t('messages.errorCancelingInvoice'));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('messages.errorCancelingInvoice');
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
        {t('buttons.cancel')}
      </Button>
      <Button
        type="submit"
        form="cancelar-nf-form"
        variant="primary"
        size="sm"
        disabled={!isFormValid || isSubmitting}
        isLoading={isSubmitting}
      >
        {isSubmitting ? t('buttons.canceling') : t('buttons.confirmCancellation')}
      </Button>
    </div>
  ), [isFormValid, isSubmitting, handleClose, t]);

  if (!notaFiscal) return null;

  return (
    <DraggableModal
      show={show}
      onClose={handleClose}
      title={t('modal.cancelInvoice')}
      size="md"
      modalId="cancelar-nf-modal"
      headerActions={headerActionsContent}
    >
      <div style={{ padding: isMobile ? '0' : '16px' }}>
        <div className="alert alert-warning mb-3">
          <i className="fas fa-exclamation-triangle me-2"></i>
          <strong>{t('messages.warning')}!</strong> {t('messages.actionCannotBeUndone')}
        </div>

        <div className="mb-3">
          <h6>{t('other.invoiceDetails')}</h6>
          <div className="row">
            <div className="col-md-6">
              <small className="text-muted">{t('table.number')}:</small>
              <div className="fw-bold">{notaFiscal.numero || t('messages.notInformed')}</div>
            </div>
            <div className="col-md-6">
              <small className="text-muted">{t('table.client')}:</small>
              <div className="fw-bold">
                {notaFiscal.cliente?.razao_social || notaFiscal.cliente?.nome_fantasia || t('messages.notInformed')}
              </div>
            </div>
          </div>
          <div className="row mt-2">
            <div className="col-md-6">
              <small className="text-muted">{t('table.totalValue')}:</small>
              <div className="fw-bold text-success">
                R$ {notaFiscal.valor_total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
              </div>
            </div>
            <div className="col-md-6">
              <small className="text-muted">{t('table.status')}:</small>
              <div className="fw-bold">
                <span className={`badge ${
                  notaFiscal.status === 'AUTORIZADA' ? 'bg-success' : 'bg-secondary'
                }`}>
                  {notaFiscal.status === 'AUTORIZADA' ? t('status.authorized') : notaFiscal.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        <form id="cancelar-nf-form" onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="justificativa" className="form-label">
              {t('form.justificationCancel')} <span className="text-danger">*</span>
            </label>
            <textarea
              id="justificativa"
              name="justificativa"
              className={`form-control ${justificativaError ? 'is-invalid' : ''}`}
              rows={4}
              placeholder={t('placeholder.enterJustification')}
              value={justificativa}
              onChange={handleJustificativaChange}
              disabled={isSubmitting}
            />
            {justificativaError && (
              <div className="invalid-feedback">{justificativaError}</div>
            )}
            <div className="form-text">
              {justificativa.length}/500 {t('other.characters')}
            </div>
          </div>
        </form>
      </div>
    </DraggableModal>
  );
};

export default CancelarNotaFiscalModal;
