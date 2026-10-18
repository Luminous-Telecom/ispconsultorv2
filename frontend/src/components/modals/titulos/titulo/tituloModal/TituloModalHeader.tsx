import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { TituloService } from 'services/tituloService';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { isTituloPagoParaRecibo } from 'utils/tituloRecibo';
import { computeFixedDropdownPosition } from 'utils/fixedDropdownPosition';
import { CancelarButton, SalvarButton, AppButton, DropdownItemButton, PositionedFixed } from 'components/ui';

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
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);
  const [showSendDropdown, setShowSendDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ left: 0, top: 0 });

  const calculateDropdownPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const menuRect = dropdownRef.current?.getBoundingClientRect();
    setDropdownPosition(
      computeFixedDropdownPosition(triggerRect, {
        align: 'start',
        menuWidth: menuRect?.width,
        menuHeight: menuRect?.height,
      })
    );
  }, []);

  useEffect(() => {
    if (!showSendDropdown) return undefined;

    calculateDropdownPosition();

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (triggerRef.current?.contains(target) || dropdownRef.current?.contains(target)) {
        return;
      }
      setShowSendDropdown(false);
    };

    const handleScrollOrResize = () => {
      calculateDropdownPosition();
    };

    const timeoutId = window.setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [calculateDropdownPosition, showSendDropdown]);

  const handleEnviarWhatsApp = async () => {
    if (!internalTituloId) {
      return;
    }
    setShowSendDropdown(false);
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
    setShowSendDropdown(false);
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
    setShowSendDropdown(false);
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

  const handleToggleSendDropdown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!showSendDropdown) {
      calculateDropdownPosition();
      setShowSendDropdown(true);
      return;
    }
    setShowSendDropdown(false);
  };

  return (
    <div className="d-flex gap-2 modal-header-actions">
      {isEditMode && internalTituloId && (
        <div className="titulo-enviar-dropdown" ref={triggerRef}>
          <AppButton
            label={sendLabel}
            variant="primary"
            type="button"
            onClick={handleToggleSendDropdown}
            aria-expanded={showSendDropdown}
            aria-haspopup="menu"
            disabled={isPending}
          />
          {showSendDropdown &&
            createPortal(
              <PositionedFixed
                left={dropdownPosition.left}
                top={dropdownPosition.top}
                className="titulo-enviar-dropdown-menu"
              >
                <ul ref={dropdownRef} className="dropdown-menu show" role="menu">
                  <li role="none">
                    <DropdownItemButton
                      label={sendViaWhatsAppLabel}
                      role="menuitem"
                      onClick={handleEnviarWhatsApp}
                    />
                  </li>
                  <li role="none">
                    <DropdownItemButton
                      label={sendViaEmailLabel}
                      role="menuitem"
                      onClick={handleEnviarEmail}
                    />
                  </li>
                  <li role="none">
                    <DropdownItemButton
                      label={sendReceiptLabel}
                      role="menuitem"
                      onClick={handleEnviarRecibo}
                      disabled={reciboDesabilitado}
                    />
                  </li>
                </ul>
              </PositionedFixed>,
              document.body
            )}
        </div>
      )}
      <CancelarButton type="button" onClick={onClose} isPending={isPending} />
      <SalvarButton type="submit" form="titulo-form" isPending={isPending} />
    </div>
  );
};

export default TituloModalHeader;
