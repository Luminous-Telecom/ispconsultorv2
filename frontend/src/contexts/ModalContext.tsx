import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type ModalType =
  | 'empresas'
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
  | 'servidor-email'
  | 'servidor-whatsapp'
  | 'nfse'
  | 'documentos-sistema'
  | 'dias-vencimento'
  | 'agendador-tarefas'
  | 'assinatura-digital'
  | 'blockdomi-dominios'
  | 'blockdomi-ipv4'
  | 'blockdomi-ipv6'
  | 'blockdomi-importar-lista'
  | 'blockdomi-ips-permitidos'
  | 'blockdomi-logs-acesso'
  // Logs
  | 'logs-usuarios'
  | 'logs-agenda-tarefas'
  | 'logs-webhook'
  | 'logs-email'
  | 'logs-whatsapp'
  | 'logs-assinatura-digital'
  | 'logs-acesso-sistema'
  | 'logs-equipamentos'
  | 'logs-agentes'
  // SaaS Super Admin (rotas exclusivas /api/saas/*)
  | 'saas-planos'
  | 'saas-usuarios'
  | 'saas-servidores-email'
  | 'saas-servidores-whatsapp'
  | 'saas-bancos'
  | 'saas-tipos-cobranca'
  | 'saas-dias-vencimento'
  | 'saas-clientes'
  | 'saas-dados-empresa'
  | 'saas-titulos'
  | 'saas-recursos-sistema'
  | 'saas-agendador-tarefas'
  | 'saas-nfse'
  | 'saas-auditoria'
  | 'saas-historico-whatsapp'
  | 'saas-historico-email'
  | 'saas-atualizacoes'
  | 'saas-backups'
  // SSH Manager
  | 'ssh-devices'
  // Agents / Tunnels
  | 'agents'
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

