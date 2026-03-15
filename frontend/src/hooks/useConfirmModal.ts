import { useState, useCallback, useRef } from 'react';
import { ConfirmVariant } from 'components/modals/ConfirmModal';

export interface ConfirmConfig {
  /**
   * Título do modal
   */
  title?: string;
  
  /**
   * Mensagem a ser exibida no modal
   */
  message: string;
  
  /**
   * Texto do botão de confirmação
   */
  confirmText?: string;
  
  /**
   * Texto do botão de cancelamento
   */
  cancelText?: string;
  
  /**
   * Variante visual do modal
   */
  variant?: ConfirmVariant;
  
  /**
   * Se true, o modal será centralizado
   */
  centered?: boolean;
}

export interface UseConfirmModalReturn {
  /**
   * Função para mostrar modal de confirmação
   * Retorna Promise<boolean> que resolve com true se confirmado, false se cancelado
   */
  confirm: (config: ConfirmConfig) => Promise<boolean>;
  
  /**
   * Função para controlar loading do botão de confirmação
   */
  setLoading: (loading: boolean) => void;
  
  /**
   * Props para renderizar o ConfirmModal
   */
  modalProps: {
    show: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: ConfirmVariant;
    centered?: boolean;
    isLoading: boolean;
  } | null;
}

/**
 * Hook para facilitar o uso do ConfirmModal
 * Retorna uma Promise<boolean> que resolve com true se confirmado, false se cancelado
 * 
 * @example
 * const { confirm, modalProps } = useConfirmModal();
 * 
 * const handleDelete = async () => {
 *   const confirmed = await confirm({
 *     message: 'Tem certeza que deseja excluir?',
 *     variant: 'danger',
 *   });
 *   
 *   if (confirmed) {
 *     // Executar ação
 *   }
 * };
 * 
 * // No return do componente:
 * // {modalProps && <ConfirmModal {...modalProps} />}
 */
export const useConfirmModal = (): UseConfirmModalReturn => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<ConfirmConfig | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const confirm = useCallback((config: ConfirmConfig): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setConfig(config);
      resolveRef.current = resolve;
      setIsOpen(true);
      setIsLoading(false);
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (resolveRef.current) {
      resolveRef.current(true);
      resolveRef.current = null;
      setIsOpen(false);
      setConfig(null);
      setIsLoading(false);
    }
  }, []);

  const handleClose = useCallback(() => {
    if (resolveRef.current) {
      resolveRef.current(false);
      resolveRef.current = null;
      setIsOpen(false);
      setConfig(null);
      setIsLoading(false);
    }
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  // Retornar props para renderizar o modal
  const modalProps = isOpen && config ? {
    show: isOpen,
    onClose: handleClose,
    onConfirm: handleConfirm,
    title: config.title,
    message: config.message,
    confirmText: config.confirmText,
    cancelText: config.cancelText,
    variant: config.variant,
    centered: config.centered,
    isLoading,
  } : null;

  return {
    confirm,
    setLoading,
    modalProps,
  };
};
