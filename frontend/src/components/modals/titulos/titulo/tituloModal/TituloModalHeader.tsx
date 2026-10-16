import React from 'react';
import { TituloService } from 'services/tituloService';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { isTituloPagoParaRecibo } from 'utils/tituloRecibo';
import { CancelarButton, SalvarButton, AppButton, DropdownItemButton } from 'components/ui';

interface TituloModalHeaderProps {
  isEditMode: boolean;
  internalTituloId: number | null;
  isPending: boolean;
  tituloStatus?: string | null;
  sendLabel: string;
  sendViaWhatsAppLabel: string;
  sendViaEmailLabel: string;
  sendReceiptLabel: string;
  sendSuccessMessage: string;
  onClose: () => void;
}

const TituloModalHeader: React.FC<TituloModalHeaderProps> = ({
  isEditMode,
  internalTituloId,
  isPending,
  tituloStatus,
  sendLabel,
  sendViaWhatsAppLabel,
  sendViaEmailLabel,
  sendReceiptLabel,
  sendSuccessMessage,
  onClose,
}) => {
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  const handleEnviarWhatsApp = async () => {
    if (!internalTituloId) {
      return;
    }
    try {
      const response = await TituloService.enviarWhatsApp(internalTituloId);
      if (response.success) {
        success(response.message || sendSuccessMessage);
      } else {
        showApiError(response.message || CONTEXT_ERROR_MESSAGES.TITULO_SEND_WHATSAPP_ERROR);
      }
    } catch (err) {
      showApiError(err, CONTEXT_ERROR_MESSAGES.TITULO_SEND_WHATSAPP_ERROR);
    }
  };

  const handleEnviarEmail = async () => {
    if (!internalTituloId) {
      return;
    }
    try {
      const response = await TituloService.enviarEmail(internalTituloId);
      if (response.success) {
        success(response.message || sendSuccessMessage);
      } else {
        showApiError(response.message || CONTEXT_ERROR_MESSAGES.TITULO_SEND_EMAIL_ERROR);
      }
    } catch (err) {
      showApiError(err, CONTEXT_ERROR_MESSAGES.TITULO_SEND_EMAIL_ERROR);
    }
  };

  const handleEnviarRecibo = async () => {
    if (!internalTituloId || !isTituloPagoParaRecibo(tituloStatus)) {
      return;
    }
    try {
      const response = await TituloService.enviarRecibo(internalTituloId);
      if (response.success) {
        success(response.message || sendSuccessMessage);
      } else {
        showApiError(response.message || CONTEXT_ERROR_MESSAGES.TITULO_SEND_RECEIPT_ERROR);
      }
    } catch (err) {
      showApiError(err, CONTEXT_ERROR_MESSAGES.TITULO_SEND_RECEIPT_ERROR);
    }
  };

  const reciboDesabilitado = !isTituloPagoParaRecibo(tituloStatus);

  return (
    <div className="d-flex gap-2 modal-header-actions">
      {isEditMode && internalTituloId && (
        <div className="btn-group">
          <AppButton
            label={sendLabel}
            variant="primary"
            className="dropdown-toggle"
            data-bs-toggle="dropdown"
            aria-expanded="false"
            disabled={isPending}
          />
          <ul className="dropdown-menu">
            <li>
              <DropdownItemButton label={sendViaWhatsAppLabel} onClick={handleEnviarWhatsApp} />
            </li>
            <li>
              <DropdownItemButton label={sendViaEmailLabel} onClick={handleEnviarEmail} />
            </li>
            <li>
              <DropdownItemButton
                label={sendReceiptLabel}
                onClick={handleEnviarRecibo}
                disabled={reciboDesabilitado}
              />
            </li>
          </ul>
        </div>
      )}
      <CancelarButton type="button" onClick={onClose} isPending={isPending} />
      {isEditMode ? (
        <SalvarButton type="submit" form="titulo-form" isPending={isPending} />
      ) : (
        <SalvarButton type="submit" form="titulo-form" isPending={isPending} />
      )}
    </div>
  );
};

export default TituloModalHeader;
