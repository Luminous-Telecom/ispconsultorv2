import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type ModalType =
  | 'clientes'
  | 'cliente-modal'
  | 'planos'
  | 'bancos'
  | 'tipos-cobranca-contrato'
  | 'contratos'
  | 'contas-receber'
  | 'dados-empresa'
  | 'fornecedores'
  | 'contas-pagar'
  | 'notas-fiscais'
  | 'usuarios'
  | 'auditoria'
  | 'recursos-sistema'
  | 'hotsite'
  | 'servidor-email'
  | 'servidor-whatsapp'
  | 'historico-whatsapp'
  | 'historico-email'
  | 'nfse'
  | 'documentos-sistema'
  | 'dias-vencimento'
  | 'atualizacoes'
  | 'agendador-tarefas'
  | 'assinatura-digital'
  | 'blockdomi-dominios'
  | 'blockdomi-ipv4'
  | 'blockdomi-ipv6'
  | 'blockdomi-importar-lista'
  | 'blockdomi-ips-permitidos'
  | null;

interface ModalContextType {
  activeModal: ModalType;
  modalData: Record<string, unknown> | null;
  openModal: (modalName: ModalType, data?: Record<string, unknown>) => void;
  closeModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [modalData, setModalData] = useState<Record<string, unknown> | null>(null);

  const openModal = useCallback((modalName: ModalType, data?: Record<string, unknown>) => {
    setActiveModal(modalName);
    setModalData(data || null);
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
    setModalData(null);
  }, []);

  return (
    <ModalContext.Provider value={{ activeModal, modalData, openModal, closeModal }}>
      {children}
    </ModalContext.Provider>
  );
};

export const useModal = (): ModalContextType => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

