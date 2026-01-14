import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Button } from '@/components/ui';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useI18n } from '@/contexts/I18nContext';

export type ConfirmVariant = 'danger' | 'warning' | 'info' | 'success';

export interface ConfirmModalProps {
  /**
   * Se true, o modal será exibido
   */
  show: boolean;
  
  /**
   * Callback quando o modal é fechado (cancel ou ESC)
   */
  onClose: () => void;
  
  /**
   * Callback quando o usuário confirma a ação
   */
  onConfirm: () => void;
  
  /**
   * Título do modal
   * @default 'Confirmar ação'
   */
  title?: string;
  
  /**
   * Mensagem a ser exibida no modal
   */
  message: string;
  
  /**
   * Texto do botão de confirmação
   * @default 'Confirmar'
   */
  confirmText?: string;
  
  /**
   * Texto do botão de cancelamento
   * @default 'Cancelar'
   */
  cancelText?: string;
  
  /**
   * Variante visual do modal (afeta cor do botão de confirmação)
   * @default 'danger'
   */
  variant?: ConfirmVariant;
  
  /**
   * Se true, o modal será centralizado na tela
   * @default true
   */
  centered?: boolean;
  
  /**
   * Se true, o botão de confirmação estará em loading
   * @default false
   */
  isLoading?: boolean;
}

/**
 * Componente Modal de Confirmação usando Bootstrap Modal
 * Substitui window.confirm() por um modal Bootstrap acessível e customizável
 * 
 * @example
 * ```tsx
 * const [showConfirm, setShowConfirm] = useState(false);
 * 
 * <ConfirmModal
 *   show={showConfirm}
 *   onClose={() => setShowConfirm(false)}
 *   onConfirm={() => {
 *     handleDelete();
 *     setShowConfirm(false);
 *   }}
 *   message="Tem certeza que deseja excluir este item?"
 *   variant="danger"
 * />
 * ```
 */
const ConfirmModal: React.FC<ConfirmModalProps> = ({
  show,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  variant = 'danger',
  centered = true,
  isLoading = false,
}) => {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  
  const defaultTitle = title || t('ui.confirmAction');
  const defaultConfirmText = confirmText || t('ui.confirm');
  const defaultCancelText = cancelText || t('actions.cancel');

  // Prevenir scroll do body quando modal estiver aberto
  useEffect(() => {
    if (show) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [show]);

  // Handler para tecla ESC
  useEffect(() => {
    if (!show) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [show, isLoading, onClose]);

  // Overlay para fechar modal ao clicar fora
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  if (!show) return null;

  // Determinar variante do botão de confirmação
  const confirmButtonVariant = variant === 'danger' ? 'danger' :
                                variant === 'warning' ? 'warning' :
                                variant === 'info' ? 'info' :
                                variant === 'success' ? 'success' :
                                'primary';

  const modalContent = (
    <div
      className="modal fade show"
      style={{
        display: 'block',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
      }}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmModalTitle"
      tabIndex={-1}
    >
      <div
        className={`modal-dialog modal-dialog-centered ${centered ? '' : ''}`}
        style={{
          maxWidth: isMobile ? '90%' : '500px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content">
          {/* Header */}
          <div className="modal-header">
            <h5 className="modal-title" id="confirmModalTitle">
              {defaultTitle}
            </h5>
            {!isLoading && (
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                aria-label={t('actions.cancel')}
              />
            )}
          </div>

          {/* Body */}
          <div className="modal-body">
            <p className="mb-0">{message}</p>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <Button
              variant="outline-primary"
              onClick={onClose}
              disabled={isLoading}
            >
              {defaultCancelText}
            </Button>
            <Button
              variant={confirmButtonVariant}
              onClick={onConfirm}
              disabled={isLoading}
              isLoading={isLoading}
            >
              {defaultConfirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  // Renderizar usando portal para garantir que está acima de tudo
  return ReactDOM.createPortal(
    modalContent,
    document.body
  );
};

export default ConfirmModal;
