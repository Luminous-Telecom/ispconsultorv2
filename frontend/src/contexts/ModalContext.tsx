import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type ModalType = 
  | 'clientes'
  | 'planos'
  | 'bancos'
  | 'contratos'
  | 'financeiro'
  | 'dados-empresa'
  | 'usuarios'
  | 'auditoria'
  | 'recursos-sistema'
  | 'servidor-email'
  | 'servidor-whatsapp'
  | 'documentos-sistema'
  | 'dias-vencimento'
  | 'atualizacoes'
  | 'agendador-tarefas'
  | 'assinatura-digital'
  | null;

interface ModalContextType {
  activeModal: ModalType;
  openModal: (modalName: ModalType) => void;
  closeModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  const openModal = useCallback((modalName: ModalType) => {
    setActiveModal(modalName);
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
  }, []);

  return (
    <ModalContext.Provider value={{ activeModal, openModal, closeModal }}>
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

