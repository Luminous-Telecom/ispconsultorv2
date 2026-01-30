import React, { Suspense, lazy } from 'react';
import { useModal } from '@/contexts/ModalContext';
import { useI18n, TranslationKeys } from '@/contexts/I18nContext';
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
const ContasReceberListModal = lazy(() => import('../modals/contas-receber').then(m => ({ default: m.ContasReceberListModal })));
const FornecedorListModal = lazy(() => import('../modals/fornecedores').then(m => ({ default: m.FornecedorListModal })));
const ContasPagarListModal = lazy(() => import('../modals/contas-pagar').then(m => ({ default: m.ContasPagarListModal })));
const NotaFiscalListModal = lazy(() => import('../modals/notas-fiscais/NotaFiscalListModal'));
const UsuariosModal = lazy(() => import('../modals/parametros/UsuariosModal'));
const RecursosSistemaModal = lazy(() => import('../modals/parametros/RecursosSistemaModal'));
const HotsiteModal = lazy(() => import('../modals/parametros/HotsiteModal'));
const DiasVencimentoModal = lazy(() => import('../modals/parametros/DiasVencimentoModal'));
const AtualizacoesModal = lazy(() => import('../modals/parametros/AtualizacoesModal'));
const AgendadorTarefasModal = lazy(() => import('../modals/parametros/AgendadorTarefasModal'));
const AssinaturaDigitalModal = lazy(() => import('../modals/parametros/AssinaturaDigitalModal'));
const AuditoriaModal = lazy(() => import('../modals/parametros/AuditoriaModal'));
const DocumentosSistemaModal = lazy(() => import('../modals/parametros/documentos-sistema').then(m => ({ default: m.DocumentosSistemaModal })));
const WhatsAppHistoricoModal = lazy(() => import('../modals/comunicacao/WhatsAppHistoricoModal'));
const EmailHistoricoModal = lazy(() => import('../modals/comunicacao/EmailHistoricoModal'));
const DominioListModal = lazy(() => import('../modals/blockdomi/dominios').then(m => ({ default: m.DominioListModal })));
const IPv4ListModal = lazy(() => import('../modals/blockdomi/ipv4').then(m => ({ default: m.IPv4ListModal })));
const IPv6ListModal = lazy(() => import('../modals/blockdomi/ipv6').then(m => ({ default: m.IPv6ListModal })));
const ImportarListaBlockdomiModal = lazy(() => import('../modals/blockdomi/ImportarListaBlockdomiModal'));

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
  titleKey: keyof TranslationKeys;
  loadingMessageKey: keyof TranslationKeys;
  className?: string;
  size?: 'sm' | 'lg' | 'xl';
}

const getModalConfigs = (): Record<string, ModalConfig> => ({
  clientes: { component: ClienteListModal, titleKey: 'modal.clients', loadingMessageKey: 'ui.loadingPage' },
  'cliente-modal': { component: ClienteModal, titleKey: 'modal.editClient', loadingMessageKey: 'ui.loadingPage' },
  planos: { component: PlanoListModal, titleKey: 'modal.plans', loadingMessageKey: 'ui.loadingPage' },
  bancos: { component: BancoListModal, titleKey: 'modal.banks', loadingMessageKey: 'ui.loadingPage' },
  contratos: { component: ContratoListModal, titleKey: 'modal.contracts', loadingMessageKey: 'ui.loadingPage' },
  'contas-receber': { component: ContasReceberListModal, titleKey: 'modal.accountsReceivable', loadingMessageKey: 'ui.loadingPage', className: 'no-padding' },
  fornecedores: { component: FornecedorListModal, titleKey: 'modal.suppliers', loadingMessageKey: 'ui.loadingPage' },
  'contas-pagar': { component: ContasPagarListModal, titleKey: 'modal.accountsPayable', loadingMessageKey: 'ui.loadingPage' },
  'notas-fiscais': { component: NotaFiscalListModal, titleKey: 'modal.invoices', loadingMessageKey: 'ui.loadingPage' },
  'dados-empresa': { component: DadosEmpresaModal, titleKey: 'modal.companyData', loadingMessageKey: 'ui.loadingPage' },
  usuarios: { component: UsuariosModal, titleKey: 'modal.users', loadingMessageKey: 'ui.loadingPage' },
  'recursos-sistema': { component: RecursosSistemaModal, titleKey: 'modal.systemResources', loadingMessageKey: 'ui.loadingPage' },
  hotsite: { component: HotsiteModal, titleKey: 'modal.hotsite', loadingMessageKey: 'ui.loadingPage' },
  'servidor-email': { component: ServidorEmailModal, titleKey: 'modal.emailServer', loadingMessageKey: 'ui.loadingPage' },
  'servidor-whatsapp': { component: ServidorWhatsappModal, titleKey: 'modal.whatsappServer', loadingMessageKey: 'ui.loadingPage' },
  nfse: { component: NFSeModal, titleKey: 'modal.nfse', loadingMessageKey: 'ui.loadingPage' },
  'dias-vencimento': { component: DiasVencimentoModal, titleKey: 'modal.dueDays', loadingMessageKey: 'ui.loadingPage' },
  atualizacoes: { component: AtualizacoesModal, titleKey: 'modal.updates', loadingMessageKey: 'ui.loadingPage' },
  'agendador-tarefas': { component: AgendadorTarefasModal, titleKey: 'modal.taskScheduler', loadingMessageKey: 'ui.loadingPage' },
  'assinatura-digital': { component: AssinaturaDigitalModal, titleKey: 'modal.digitalSignature', loadingMessageKey: 'ui.loadingPage' },
  auditoria: { component: AuditoriaModal, titleKey: 'modal.auditLogs', loadingMessageKey: 'ui.loadingPage', className: 'no-padding' },
  'documentos-sistema': { component: DocumentosSistemaModal, titleKey: 'modal.systemDocuments', loadingMessageKey: 'ui.loadingPage' },
  'historico-whatsapp': { component: WhatsAppHistoricoModal, titleKey: 'modal.whatsappHistory', loadingMessageKey: 'ui.loadingPage', className: 'no-padding' },
  'historico-email': { component: EmailHistoricoModal, titleKey: 'modal.emailHistory', loadingMessageKey: 'ui.loadingPage', className: 'no-padding' },
  'blockdomi-dominios': { component: DominioListModal, titleKey: 'modal.domains', loadingMessageKey: 'ui.loadingPage', className: 'no-padding' },
  'blockdomi-ipv4': { component: IPv4ListModal, titleKey: 'modal.ipv4', loadingMessageKey: 'ui.loadingPage', className: 'no-padding' },
  'blockdomi-ipv6': { component: IPv6ListModal, titleKey: 'modal.ipv6', loadingMessageKey: 'ui.loadingPage', className: 'no-padding' },
  'blockdomi-importar-lista': { component: ImportarListaBlockdomiModal, titleKey: 'modal.importList', loadingMessageKey: 'ui.loadingPage', size: 'xl' },
});

const SingleModalWrapper: React.FC = () => {
  const { activeModal, modalData, closeModal } = useModal();
  const { t } = useI18n();

  if (!activeModal) return null;

  const MODAL_CONFIGS = getModalConfigs();
  const modalConfig = MODAL_CONFIGS[activeModal];
  if (!modalConfig) return null;

  const ModalComponent = modalConfig.component;
  const modalTitle = t(modalConfig.titleKey);
  const loadingMessage = t(modalConfig.loadingMessageKey);

  // Para o modal de cliente, extraímos o clienteId dos modalData
  const isClienteModal = activeModal === 'cliente-modal';
  const clienteId = isClienteModal && modalData?.clienteId ? modalData.clienteId as number : null;


  const modalProps: ModalComponentProps = {
    show: true,
    onClose: closeModal,
    skipWrapper: true, // Sempre usar skipWrapper para que o conteúdo seja renderizado dentro do DraggableModal único
    ...(['clientes', 'planos', 'bancos', 'contratos'].includes(activeModal) && { title: modalTitle }),
    // Para o cliente-modal, passamos clienteId como prop específica
    ...(isClienteModal && { clienteId }),
    // Para outros modais, passamos os dados adicionais normalmente
    ...(!isClienteModal && modalData && modalData),
  };

  return (
    <DraggableModal
      show={true}
      onClose={closeModal}
      title={modalTitle}
      size={modalConfig.size ?? 'lg'}
      className={modalConfig.className || ''}
    >
      <Suspense fallback={<Loading message={loadingMessage} />}>
        <ModalComponent {...modalProps} />
      </Suspense>
    </DraggableModal>
  );
};

export default SingleModalWrapper;

