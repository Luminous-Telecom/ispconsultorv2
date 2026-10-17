import React, { useState, useEffect, useCallback, useMemo, useLayoutEffect } from 'react';
import { DiasVencimentoService, type DiasVencimento } from 'services/diasVencimentoService';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import DraggableModal from 'components/common/DraggableModal';
import { AtivoInativoField, Loading, ModalFormActions } from 'components/ui';
import { useI18n } from 'contexts/I18nContext';

interface DiasVencimentoModalProps {
  show: boolean;
  onClose: () => void;
  variant?: 'erp';
  skipWrapper?: boolean;
  onHeaderActionsReady?: (actions: React.ReactNode) => void;
}

const DiasVencimentoModal: React.FC<DiasVencimentoModalProps> = ({
  show,
  onClose,
  variant = 'erp',
  skipWrapper = false,
  onHeaderActionsReady,
}) => {
  const [diasAtivos, setDiasAtivos] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();
  const { t } = useI18n();
  const formId = 'dias-vencimento-form';

  const loadDiasAtivosErp = useCallback(async () => {
    const response = await DiasVencimentoService.get();
    if (response.success && Array.isArray(response.data)) {
      const dias = response.data
        .filter((item: DiasVencimento) => item.ativo)
        .map((item: DiasVencimento) => item.dia ?? item.dia_padrao)
        .filter((dia): dia is number => dia !== undefined);
      setDiasAtivos(dias);
    }
  }, []);

  useEffect(() => {
    if (!show) return;

    const loadDiasAtivos = async () => {
      setIsLoading(true);
      try {
        await loadDiasAtivosErp();
      } catch (err) {
        showApiError(err, CONTEXT_ERROR_MESSAGES.PARAMS_UPDATE_ERROR);
      } finally {
        setIsLoading(false);
      }
    };

    void loadDiasAtivos();
  }, [show, loadDiasAtivosErp, showApiError]);

  useEffect(() => {
    if (!show) {
      setIsLoading(false);
      setIsSaving(false);
    }
  }, [show]);

  const setDiaAtivo = (dia: number, ativo: boolean) => {
    setDiasAtivos((prev) => {
      const has = prev.includes(dia);
      if (ativo && !has) return [...prev, dia].sort((a, b) => a - b);
      if (!ativo && has) return prev.filter((d) => d !== dia);
      return prev;
    });
  };

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setIsSaving(true);
      await DiasVencimentoService.update({ dias: diasAtivos });
      success(t('params.dueDaysSaveSuccess'));
    } catch (err: unknown) {
      showApiError(err, CONTEXT_ERROR_MESSAGES.PARAMS_UPDATE_ERROR);
    } finally {
      setIsSaving(false);
    }
  }, [diasAtivos, success, showApiError, t]);

  const headerActionsContent = useMemo(
    () => (
      <ModalFormActions
        onCancel={onClose}
        formId={formId}
        isPending={isSaving || isLoading}
      />
    ),
    [onClose, formId, isSaving, isLoading]
  );

  useLayoutEffect(() => {
    if (skipWrapper && onHeaderActionsReady) {
      onHeaderActionsReady(headerActionsContent);
    }
  }, [skipWrapper, onHeaderActionsReady, headerActionsContent]);

  const content = (
    <form id={formId} className="form-modal-simple modal-inner-padding" onSubmit={handleSubmit}>
      <div className="form-section-heading-row">
        <span className="form-section-heading-pill">{t('params.dueDaysAvailable')}</span>
        <div className="form-section-heading-line" aria-hidden />
      </div>
      {isLoading ? (
        <Loading variant="modal" />
      ) : (
        <div className="row g-2">
          {Array.from({ length: 30 }, (_, i) => i + 1).map((dia) => (
            <div key={dia} className="col-12">
              <AtivoInativoField
                value={diasAtivos.includes(dia)}
                onChange={(ativo) => setDiaAtivo(dia, ativo)}
                label={t('params.activateDueDay', { day: String(dia).padStart(2, '0') })}
                name={`dia-${variant}-${dia}`}
                disabled={isSaving}
              />
            </div>
          ))}
        </div>
      )}
    </form>
  );

  if (skipWrapper) return content;

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={t('params.dueDays')}
      size="xl"
      modalId="dias-vencimento-modal"
      headerActions={headerActionsContent}
    >
      {content}
    </DraggableModal>
  );
};

export default DiasVencimentoModal;
