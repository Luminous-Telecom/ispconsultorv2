import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useI18n } from 'contexts/I18nContext';
import DraggableModal from 'components/common/DraggableModal';
import DetailFieldGrid, { DetailFieldItem } from 'components/common/DetailFieldGrid';
import { CancelarButton, ConfirmarCancelamentoButton, FormField, StatusBadge } from 'components/ui';
import { NotaFiscal } from 'types';
import { NotaFiscalService } from 'services/notaFiscalService';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { formatCurrency } from 'utils/formatters';

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
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justificativa, setJustificativa] = useState('');
  const [justificativaError, setJustificativaError] = useState('');

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

  const isFormValid = useMemo(() => {
    return justificativa.trim().length >= 15 && justificativa.trim().length <= 500;
  }, [justificativa]);

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
        showApiError(response.message || CONTEXT_ERROR_MESSAGES.NFSE_CANCEL_ERROR);
      }
    } catch (err) {
      showApiError(err, CONTEXT_ERROR_MESSAGES.NFSE_CANCEL_ERROR);
    } finally {
      setIsSubmitting(false);
    }
  };

  const headerActionsContent = useMemo(() => (
    <div className="d-flex gap-2 modal-header-actions">
      <CancelarButton type="button" onClick={handleClose} isPending={isSubmitting} />
      <ConfirmarCancelamentoButton
        type="submit"
        form="cancelar-nf-form"
        disabled={!isFormValid || isSubmitting}
        isPending={isSubmitting}
      />
    </div>
  ), [isFormValid, isSubmitting, handleClose]);

  const detailFields = useMemo((): DetailFieldItem[] => {
    if (!notaFiscal) return [];

    const statusLabel =
      notaFiscal.status === 'AUTORIZADA' ? t('status.authorized') : notaFiscal.status;

    return [
      {
        label: t('table.number'),
        value: notaFiscal.numero || t('messages.notInformed'),
      },
      {
        label: t('table.client'),
        value:
          notaFiscal.cliente?.razao_social ||
          notaFiscal.cliente?.nome_fantasia ||
          t('messages.notInformed'),
      },
      {
        label: t('table.totalValue'),
        value: formatCurrency(notaFiscal.valor_total || 0),
        inputClassName: 'text-success',
      },
      {
        label: t('table.status'),
        value: (
          <StatusBadge
            variant={notaFiscal.status === 'AUTORIZADA' ? 'success' : 'secondary'}
            label={statusLabel}
          />
        ),
      },
    ];
  }, [notaFiscal, t]);

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
      <form id="cancelar-nf-form" onSubmit={handleSubmit} className="form-modal-simple">
        <p className="form-helper-message form-modal-input-col mb-3">
          {t('messages.warning')}! {t('messages.actionCannotBeUndone')}
        </p>

        <DetailFieldGrid fields={detailFields} className="mb-3" />

        <div className="row g-2">
          <div className="col-12">
            <FormField
              name="justificativa"
              type="textarea"
              label={t('form.justificationCancel')}
              rows={4}
              placeholder={t('placeholder.enterJustification')}
              value={justificativa}
              onChange={(v) => {
                setJustificativa(String(v ?? ''));
                if (justificativaError) setJustificativaError('');
              }}
              error={justificativaError}
              required
              disabled={isSubmitting}
              helpText={`${justificativa.length}/500 ${t('other.characters')}`}
              size="sm"
            />
          </div>
        </div>
      </form>
    </DraggableModal>
  );
};

export default CancelarNotaFiscalModal;
