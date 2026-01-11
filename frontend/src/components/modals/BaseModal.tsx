import React, { useEffect, useRef } from 'react';
import { Modal } from 'bootstrap';

export interface BaseModalProps {
  /**
   * Se true, o modal será exibido
   */
  show: boolean;
  
  /**
   * Callback disparado quando o modal é fechado
   */
  onHide: () => void;
  
  /**
   * Título do modal
   */
  title?: string;
  
  /**
   * Tamanho do modal
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  
  /**
   * Centraliza o modal verticalmente
   * @default true
   */
  centered?: boolean;
  
  /**
   * Tipo de backdrop
   * @default true
   */
  backdrop?: boolean | 'static';
  
  /**
   * Se true, fecha o modal ao pressionar ESC
   * @default true
   */
  keyboard?: boolean;
  
  /**
   * Conteúdo do modal
   */
  children: React.ReactNode;
  
  /**
   * Rodapé do modal
   */
  footer?: React.ReactNode;
  
  /**
   * Ações adicionais no cabeçalho (renderizadas antes do botão fechar)
   */
  headerActions?: React.ReactNode;
  
  /**
   * Classes CSS adicionais para o modal-content
   */
  className?: string;
  
  /**
   * Se true, remove o padding padrão do body
   * @default false
   */
  noPadding?: boolean;
}

/**
 * BaseModal - Wrapper oficial para o Bootstrap Modal
 * Fornece uma API consistente e gerencia o ciclo de vida do modal nativo
 */
const BaseModal: React.FC<BaseModalProps> = ({
  show,
  onHide,
  title,
  size = 'md',
  centered = true,
  backdrop = true,
  keyboard = true,
  children,
  footer,
  headerActions,
  className = '',
  noPadding = false,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const bsModalRef = useRef<Modal | null>(null);

  // Inicializar e gerenciar o modal do Bootstrap
  useEffect(() => {
    if (modalRef.current) {
      bsModalRef.current = new Modal(modalRef.current, {
        backdrop,
        keyboard,
      });

      // Ouvir evento de fechar nativo (ex: clique no backdrop ou ESC)
      modalRef.current.addEventListener('hidden.bs.modal', () => {
        onHide();
      });
    }

    return () => {
      if (bsModalRef.current) {
        bsModalRef.current.dispose();
      }
    };
  }, [onHide, backdrop, keyboard]);

  // Mostrar/ocultar modal quando a prop 'show' mudar
  useEffect(() => {
    if (bsModalRef.current) {
      if (show) {
        bsModalRef.current.show();
      } else {
        bsModalRef.current.hide();
      }
    }
  }, [show]);

  return (
    <div
      className="modal fade"
      ref={modalRef}
      tabIndex={-1}
      aria-labelledby="baseModalLabel"
      aria-hidden="true"
    >
      <div className={`modal-dialog modal-${size} ${centered ? 'modal-dialog-centered' : ''}`}>
        <div className={`modal-content shadow-lg ${className}`}>
          {title && (
            <div className="modal-header border-bottom-0 pb-0">
              <h5 className="modal-title fs-6 fw-bold text-custom-primary" id="baseModalLabel">
                {title}
              </h5>
              <div className="ms-auto d-flex align-items-center gap-2">
                {headerActions}
                <button
                  type="button"
                  className="btn-close shadow-none"
                  onClick={onHide}
                  aria-label="Fechar"
                ></button>
              </div>
            </div>
          )}
          
          <div className={`modal-body ${noPadding ? 'p-0' : 'p-4'}`}>
            {children}
          </div>

          {footer && (
            <div className="modal-footer border-top-0 pt-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BaseModal;