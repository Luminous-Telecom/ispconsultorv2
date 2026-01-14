import React, { Suspense, lazy, useState, useEffect } from 'react';
import { useModal } from '@/contexts/ModalContext';
import Loading from './Loading';
import DraggableModal from './DraggableModal';

// Lazy load dos modais (code splitting)
const ClienteListModal = lazy(() => import('../modals/clientes').then(m => ({ default: m.ClienteListModal })));
const ClienteModal = lazy(() => import('../modals/clientes').then(m => ({ default: m.ClienteModal })));
const PlanoListModal = lazy(() => import('../modals/planos').then(m => ({ default: m.PlanoListModal })));
const BancoListModal = lazy(() => import('../modals/bancos').then(m => ({ default: m.BancoListModal })));
const DadosEmpresaModal = lazy(() => import('../modals/empresa/empresa').then(m => ({ default: m.DadosEmpresaModal })));
const ServidorEmailModal = lazy(() => import('../modals/parametros/servidor-email').then(m => ({ default: m.ServidorEmailModal })));
const ServidorWhatsappModal = lazy(() => import('../modals/parametros/servidor-whatsapp').then(m => ({ default: m.ServidorWhatsappModal })));
const NFSeModal = lazy(() => import('../modals/parametros/NFSeModal'));
const ContratoListModal = lazy(() => import('../modals/contratos/ContratoListModal'));
const FinanceiroModal = lazy(() => import('../modals/financeiro/FinanceiroModal'));
const FornecedorListModal = lazy(() => import('../modals/fornecedores').then(m => ({ default: m.FornecedorListModal })));
const ContasPagarListModal = lazy(() => import('../modals/contas-pagar').then(m => ({ default: m.ContasPagarListModal })));
const NotaFiscalListModal = lazy(() => import('../modals/notas-fiscais/NotaFiscalListModal'));
const UsuariosModal = lazy(() => import('../modals/parametros/UsuariosModal'));
const RecursosSistemaModal = lazy(() => import('../modals/parametros/RecursosSistemaModal'));
const DiasVencimentoModal = lazy(() => import('../modals/parametros/DiasVencimentoModal'));
const AtualizacoesModal = lazy(() => import('../modals/parametros/AtualizacoesModal'));
const AgendadorTarefasModal = lazy(() => import('../modals/parametros/AgendadorTarefasModal'));
const AssinaturaDigitalModal = lazy(() => import('../modals/parametros/AssinaturaDigitalModal'));
const AuditoriaModal = lazy(() => import('../modals/parametros/AuditoriaModal'));
const DocumentosSistemaModal = lazy(() => import('../modals/parametros/documentos-sistema').then(m => ({ default: m.DocumentosSistemaModal })));

interface ModalComponentProps {
  show: boolean;
  onClose: () => void;
  title?: string;
  skipWrapper?: boolean;
  headerActions?: React.ReactNode;
  [key: string]: unknown;
}

interface ModalConfig {
  component: React.LazyExoticComponent<React.ComponentType<ModalComponentProps>>;
  title: string;
  loadingMessage: string;
  className?: string;
}

const MODAL_CONFIGS: Record<string, ModalConfig> = {
  clientes: { component: ClienteListModal, title: 'Clientes', loadingMessage: 'Carregando clientes...' },
  'cliente-modal': { component: ClienteModal, title: 'Editar Cliente', loadingMessage: 'Carregando cliente...' },
  planos: { component: PlanoListModal, title: 'Planos', loadingMessage: 'Carregando planos...' },
  bancos: { component: BancoListModal, title: 'Bancos', loadingMessage: 'Carregando bancos...' },
  contratos: { component: ContratoListModal, title: 'Contratos', loadingMessage: 'Carregando contratos...' },
  financeiro: { component: FinanceiroModal, title: 'Financeiro - Títulos', loadingMessage: 'Carregando financeiro...', className: 'no-padding' },
  fornecedores: { component: FornecedorListModal, title: 'Fornecedores', loadingMessage: 'Carregando fornecedores...' },
  'contas-pagar': { component: ContasPagarListModal, title: 'Contas a Pagar', loadingMessage: 'Carregando contas a pagar...' },
  'notas-fiscais': { component: NotaFiscalListModal, title: 'Notas Fiscais', loadingMessage: 'Carregando notas fiscais...' },
  'dados-empresa': { component: DadosEmpresaModal, title: 'Dados da Empresa', loadingMessage: 'Carregando dados da empresa...' },
  usuarios: { component: UsuariosModal, title: 'Usuários', loadingMessage: 'Carregando usuários...' },
  'recursos-sistema': { component: RecursosSistemaModal, title: 'Recursos do Sistema', loadingMessage: 'Carregando recursos do sistema...' },
  'servidor-email': { component: ServidorEmailModal, title: 'Servidor de E-Mail', loadingMessage: 'Carregando servidor de e-mail...' },
  'servidor-whatsapp': { component: ServidorWhatsappModal, title: 'Servidor de WhatsApp', loadingMessage: 'Carregando servidor de WhatsApp...' },
  nfse: { component: NFSeModal, title: 'NFS-e', loadingMessage: 'Carregando configurações de NFS-e...' },
  'dias-vencimento': { component: DiasVencimentoModal, title: 'Dias de Vencimento', loadingMessage: 'Carregando dias de vencimento...' },
  atualizacoes: { component: AtualizacoesModal, title: 'Atualizações', loadingMessage: 'Carregando atualizações...' },
  'agendador-tarefas': { component: AgendadorTarefasModal, title: 'Agendador de Tarefas', loadingMessage: 'Carregando agendador de tarefas...' },
  'assinatura-digital': { component: AssinaturaDigitalModal, title: 'Assinatura Digital', loadingMessage: 'Carregando configurações de assinatura digital...' },
  auditoria: { component: AuditoriaModal, title: 'Logs de Auditoria', loadingMessage: 'Carregando logs de auditoria...', className: 'no-padding' },
  'documentos-sistema': { component: DocumentosSistemaModal, title: 'Modelos de Documentos', loadingMessage: 'Carregando modelos de documentos...' },
};

const SingleModalWrapper: React.FC = () => {
  const { activeModal, modalData, closeModal } = useModal();
  const [headerActions, setHeaderActions] = useState<React.ReactNode>(null);

  // Limpar headerActions quando o modal ativo mudar
  useEffect(() => {
    setHeaderActions(null);
  }, [activeModal]);

  if (!activeModal) return null;

  const modalConfig = MODAL_CONFIGS[activeModal];
  if (!modalConfig) return null;

  const ModalComponent = modalConfig.component;

  // Para o modal de cliente, extraímos o clienteId dos modalData
  const isClienteModal = activeModal === 'cliente-modal';
  const clienteId = isClienteModal && modalData?.clienteId ? modalData.clienteId as number : undefined;

  const modalProps: ModalComponentProps = {
    show: true,
    onClose: closeModal,
    skipWrapper: true,
    onHeaderActionsReady: setHeaderActions,
    ...(['clientes', 'planos', 'bancos', 'contratos'].includes(activeModal) && { title: modalConfig.title }),
    // Para o cliente-modal, passamos clienteId como prop específica
    ...(isClienteModal && { clienteId }),
    // Para outros modais, passamos os dados adicionais normalmente
    ...(!isClienteModal && modalData && modalData),
  };

  return (
    <DraggableModal
      show={true}
      onClose={closeModal}
      title={modalConfig.title}
      size="xl"
      modalId={`single-modal-${activeModal}`}
      className={modalConfig.className || ''}
      headerActions={headerActions}
    >
      <Suspense fallback={<Loading message={modalConfig.loadingMessage} />}>
        <ModalComponent {...modalProps} />
      </Suspense>
    </DraggableModal>
  );
};

export default SingleModalWrapper;

