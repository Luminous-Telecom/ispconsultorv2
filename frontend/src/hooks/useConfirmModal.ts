import { useState, useCallback } from 'react';
import ConfirmModal, { ConfirmModalProps, ConfirmVariant } from '@/components/modals/ConfirmModal';

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

/**
 * Hook para facilitar o uso do ConfirmModal
 * Retorna uma Promise<boolean> que resolve com true se confirmado, false se cancelado
 * 
 * @example
 * ```tsx
 * const confirm = useConfirmModal();
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
 * ```
 */
export const useConfirmModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<ConfirmConfig | null>(null);
  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const confirm = useCallback((config: ConfirmConfig): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setConfig(config);
      setResolvePromise(() => resolve);
      setIsOpen(true);
      setIsLoading(false);
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (resolvePromise) {
      resolvePromise(true);
      setIsOpen(false);
      setConfig(null);
      setResolvePromise(null);
      setIsLoading(false);
    }
  }, [resolvePromise]);

  const handleClose = useCallback(() => {
    if (resolvePromise) {
      resolvePromise(false);
      setIsOpen(false);
      setConfig(null);
      setResolvePromise(null);
      setIsLoading(false);
    }
  }, [resolvePromise]);

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  // Renderizar modal apenas quando necessário
  const ConfirmModalComponent = isOpen && config ? (
    <ConfirmModal
      show={isOpen}
      onClose={handleClose}
      onConfirm={handleConfirm}
      title={config.title}
      message={config.message}
      confirmText={config.confirmText}
      cancelText={config.cancelText}
      variant={config.variant}
      centered={config.centered}
      isLoading={isLoading}
    />
  ) : null;

  return {
    /**
     * Função para mostrar modal de confirmação
     * Retorna Promise<boolean> que resolve com true se confirmado, false se cancelado
     */
    confirm,
    
    /**
     * Função para controlar loading do botão de confirmação
     */
    setLoading,
    
    /**
     * Componente ConfirmModal (deve ser renderizado no componente que usa o hook)
     */
    ConfirmModal: ConfirmModalComponent,
  };
};

export default useConfirmModal;
