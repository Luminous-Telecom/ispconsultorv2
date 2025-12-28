import React, { Suspense, lazy } from 'react';
import { useModal } from '@/contexts/ModalContext';
import Loading from './Loading';
import DraggableModal from './DraggableModal';

// Lazy load dos modais (code splitting)
const ClienteListModal = lazy(() => import('../modals/clientes').then(m => ({ default: m.ClienteListModal })));
const PlanoListModal = lazy(() => import('../modals/planos').then(m => ({ default: m.PlanoListModal })));
const BancoListModal = lazy(() => import('../modals/bancos').then(m => ({ default: m.BancoListModal })));
const DadosEmpresaModal = lazy(() => import('../modals/empresa/empresa').then(m => ({ default: m.DadosEmpresaModal })));
const ServidorEmailModal = lazy(() => import('../modals/parametros/servidor-email').then(m => ({ default: m.ServidorEmailModal })));
const ServidorWhatsappModal = lazy(() => import('../modals/parametros/servidor-whatsapp').then(m => ({ default: m.ServidorWhatsappModal })));
const ContratoListModal = lazy(() => import('../modals/contratos/ContratoListModal'));
const FinanceiroModal = lazy(() => import('../modals/financeiro/FinanceiroModal'));
const UsuariosModal = lazy(() => import('../modals/parametros/UsuariosModal'));
const RecursosSistemaModal = lazy(() => import('../modals/parametros/RecursosSistemaModal'));
const DiasVencimentoModal = lazy(() => import('../modals/parametros/DiasVencimentoModal'));
const AtualizacoesModal = lazy(() => import('../modals/parametros/AtualizacoesModal'));
const AgendadorTarefasModal = lazy(() => import('../modals/parametros/AgendadorTarefasModal'));
const AssinaturaDigitalModal = lazy(() => import('../modals/parametros/AssinaturaDigitalModal'));
const AuditoriaModal = lazy(() => import('../modals/parametros/AuditoriaModal'));

interface ModalComponentProps {
  show: boolean;
  onClose: () => void;
  title?: string;
  skipWrapper?: boolean;
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
  planos: { component: PlanoListModal, title: 'Planos', loadingMessage: 'Carregando planos...' },
  bancos: { component: BancoListModal, title: 'Bancos', loadingMessage: 'Carregando bancos...' },
  contratos: { component: ContratoListModal, title: 'Contratos', loadingMessage: 'Carregando contratos...' },
  financeiro: { component: FinanceiroModal, title: 'Financeiro - Títulos', loadingMessage: 'Carregando financeiro...', className: 'no-padding' },
  'dados-empresa': { component: DadosEmpresaModal, title: 'Dados da Empresa', loadingMessage: 'Carregando dados da empresa...' },
  usuarios: { component: UsuariosModal, title: 'Usuários', loadingMessage: 'Carregando usuários...' },
  'recursos-sistema': { component: RecursosSistemaModal, title: 'Recursos do Sistema', loadingMessage: 'Carregando recursos do sistema...' },
  'servidor-email': { component: ServidorEmailModal, title: 'Servidor de E-Mail', loadingMessage: 'Carregando servidor de e-mail...' },
  'servidor-whatsapp': { component: ServidorWhatsappModal, title: 'Servidor de WhatsApp', loadingMessage: 'Carregando servidor de WhatsApp...' },
  'dias-vencimento': { component: DiasVencimentoModal, title: 'Dias de Vencimento', loadingMessage: 'Carregando dias de vencimento...' },
  atualizacoes: { component: AtualizacoesModal, title: 'Atualizações', loadingMessage: 'Carregando atualizações...' },
  'agendador-tarefas': { component: AgendadorTarefasModal, title: 'Agendador de Tarefas', loadingMessage: 'Carregando agendador de tarefas...' },
  'assinatura-digital': { component: AssinaturaDigitalModal, title: 'Assinatura Digital', loadingMessage: 'Carregando configurações de assinatura digital...' },
  auditoria: { component: AuditoriaModal, title: 'Logs de Auditoria', loadingMessage: 'Carregando logs de auditoria...', className: 'no-padding' },
};

const SingleModalWrapper: React.FC = () => {
  const { activeModal, closeModal } = useModal();

  if (!activeModal) return null;

  const modalConfig = MODAL_CONFIGS[activeModal];
  if (!modalConfig) return null;

  const ModalComponent = modalConfig.component;
  const modalProps: ModalComponentProps = {
    show: true,
    onClose: closeModal,
    skipWrapper: true,
  };

  if (['clientes', 'planos', 'bancos', 'contratos'].includes(activeModal)) {
    modalProps.title = modalConfig.title;
  }

  return (
    <DraggableModal
      show={true}
      onClose={closeModal}
      title={modalConfig.title}
      size="xl"
      modalId={`single-modal-${activeModal}`}
      className={modalConfig.className || ''}
    >
      <Suspense fallback={<Loading message={modalConfig.loadingMessage} />}>
        <ModalComponent {...modalProps} />
      </Suspense>
    </DraggableModal>
  );
};

export default SingleModalWrapper;

