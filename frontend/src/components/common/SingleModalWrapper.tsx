import React, { Suspense, lazy, useState, useEffect, useRef } from 'react';
import { useModal } from 'contexts/ModalContext';
import { useI18n, TranslationKeys } from 'contexts/I18nContext';
import Loading from './Loading';
import DraggableModal from './DraggableModal';
import { resolveLogsModal } from '../modals/logs/logsModalRegistry';
import type { ModalType } from 'contexts/ModalContext';

// Lazy load dos modais (code splitting)
const EmpresasModal = lazy(() => import('../modals/empresas/EmpresasModal'));
const ClienteListModal = lazy(() => import('../modals/clientes').then(m => ({ default: m.ClienteListModal })));
const ClienteModal = lazy(() => import('../modals/clientes').then(m => ({ default: m.ClienteModal })));
const PlanoListModal = lazy(() => import('../modals/planos').then(m => ({ default: m.PlanoListModal })));
const BancoListModal = lazy(() => import('../modals/bancos').then(m => ({ default: m.BancoListModal })));
const TipoCobrancaContratoListModal = lazy(() => import('../modals/tipoCobrancaContrato').then(m => ({ default: m.TipoCobrancaContratoListModal })));
const DadosEmpresaModal = lazy(() => import('../modals/empresa/empresa').then(m => ({ default: m.DadosEmpresaModal })));
const ServidorEmailModal = lazy(() => import('../modals/parametros/servidor-email').then(m => ({ default: m.ServidorEmailModal })));
const ServidorWhatsappModal = lazy(() => import('../modals/parametros/servidor-whatsapp').then(m => ({ default: m.ServidorWhatsappModal })));
const NFSeModal = lazy(() => import('../modals/parametros/NFSeModal'));
const ContratoListModal = lazy(() => import('../modals/contratos').then(m => ({ default: m.ContratoListModal })));
const ContasReceberListModal = lazy(() => import('../modals/contas-receber').then(m => ({ default: m.ContasReceberListModal })));
const FornecedorListModal = lazy(() => import('../modals/fornecedores').then(m => ({ default: m.FornecedorListModal })));
const ContasPagarListModal = lazy(() => import('../modals/contas-pagar').then(m => ({ default: m.ContasPagarListModal })));
const NotaFiscalListModal = lazy(() => import('../modals/notas-fiscais/NotaFiscalListModal'));
const UsuariosModal = lazy(() => import('../modals/parametros/UsuariosModal'));
const SegurancaUsuarioModal = lazy(() => import('../modals/parametros/SegurancaUsuarioModal'));
const ConfUsuarioModal = lazy(() => import('../modals/parametros/ConfUsuarioModal'));
const RecursosSistemaModal = lazy(() => import('../modals/parametros/RecursosSistemaModal'));
const DiasVencimentoModal = lazy(() => import('../modals/parametros/DiasVencimentoModal'));
const AtualizacoesModal = lazy(() => import('../modals/parametros/AtualizacoesModal'));
const BackupsModal = lazy(() => import('../modals/parametros/BackupsModal'));
const AssinaturaDigitalModal = lazy(() => import('../modals/parametros/AssinaturaDigitalModal'));
const AuditoriaModal = lazy(() => import('../modals/parametros/AuditoriaModal'));
const DocumentosSistemaModal = lazy(() => import('../modals/parametros/documentos-sistema').then(m => ({ default: m.DocumentosSistemaModal })));
const DominioListModal = lazy(() => import('../modals/blockdomi/dominios').then(m => ({ default: m.DominioListModal })));
const IPv4ListModal = lazy(() => import('../modals/blockdomi/ipv4').then(m => ({ default: m.IPv4ListModal })));
const IPv6ListModal = lazy(() => import('../modals/blockdomi/ipv6').then(m => ({ default: m.IPv6ListModal })));
const ImportarListaBlockdomiModal = lazy(() => import('../modals/blockdomi/ImportarListaBlockdomiModal'));
const IpsPermitidosListModal = lazy(() => import('../modals/blockdomi/ips-permitidos').then(m => ({ default: m.IpsPermitidosListModal })));

const AgendadorTarefasModal = lazy(() => import('../modals/parametros/AgendadorTarefasModal'));

// SSH Manager
const SshDeviceListModal = lazy(() => import('../modals/ssh-manager').then(m => ({ default: m.SshDeviceListModal })));
const LogsModal = lazy(() => import('../modals/logs/LogsModal'));

// Agents / Tunnels
const AgentListModal = lazy(() => import('../modals/agent').then(m => ({ default: m.AgentListModal })));
const DashboardBackupEquipamentosModal = lazy(
  () => import('../modals/dashboard/DashboardBackupEquipamentosModal')
);
const RpkiCaListModal = lazy(() => import('../modals/rpki/RpkiCaListModal'));
const RpkiCaParentListModal = lazy(() => import('../modals/rpki/RpkiCaParentListModal'));
const RpkiRepositoryListModal = lazy(() => import('../modals/rpki/RpkiRepositoryListModal'));
const RpkiAspaListModal = lazy(() => import('../modals/rpki/RpkiAspaListModal'));
const RpkiRoaListModal = lazy(() => import('../modals/rpki/RpkiRoaListModal'));
const RpkiValidateRouteModal = lazy(() => import('../modals/rpki/RpkiValidateRouteModal'));
const RpkiValidationLogsModal = lazy(() => import('../modals/logs/RpkiValidationLogsModal'));
const IxcOsSyncLogsModal = lazy(() => import('../modals/logs/ixc/IxcOsSyncLogsModal'));

// Suporte
const OrdemServicoListModal = lazy(() => import('../modals/ordens-servico').then(m => ({ default: m.OrdemServicoListModal })));
const AtendimentoListModal = lazy(() => import('../modals/atendimentos').then(m => ({ default: m.AtendimentoListModal })));
const IntegracaoIxcProvedorListModal = lazy(() =>
  import('../modals/integracao-ixc-provedor').then((m) => ({ default: m.IntegracaoIxcProvedorListModal }))
);
const RpkiCaPaiLogsModal = lazy(() => import('../modals/logs/rpki/RpkiCaPaiLogsModal'));
const RpkiRepositorioLogsModal = lazy(() => import('../modals/logs/rpki/RpkiRepositorioLogsModal'));

interface ResolvedRpkiModal {
  /** Título fixo (listas RPKI). Preferir titleKey para modais de logs (igual ao menu). */
  title?: string;
  titleKey?: keyof TranslationKeys;
  component: React.LazyExoticComponent<React.ComponentType<ModalComponentProps>>;
  size?: 'sm' | 'lg' | 'xl';
  className?: string;
}

const resolveRpkiModal = (active: ModalType): ResolvedRpkiModal | null => {
  switch (active) {
    case 'rpki-cas':
      return { title: 'RPKI - CAs', component: RpkiCaListModal };
    case 'rpki-cas-pai':
      return { title: 'RPKI - CAs-pai', component: RpkiCaParentListModal };
    case 'rpki-repositorios':
      return { title: 'RPKI - Repositorios', component: RpkiRepositoryListModal };
    case 'rpki-aspas':
      return { title: 'RPKI - ASPAs', component: RpkiAspaListModal };
    case 'rpki-roas':
      return { title: 'RPKI - ROAs', component: RpkiRoaListModal };
    case 'rpki-validar-rota':
      return { title: 'RPKI - Rota', component: RpkiValidateRouteModal };
    case 'rpki-logs-validacao':
      return { titleKey: 'logs.rpkiSincronizacao', component: RpkiValidationLogsModal, size: 'xl', className: 'no-padding' };
    case 'rpki-logs-ca-pai':
      return { titleKey: 'logs.rpkiCaPai', component: RpkiCaPaiLogsModal, size: 'xl', className: 'no-padding' };
    case 'rpki-logs-repositorios':
      return { titleKey: 'logs.rpkiRepositorios', component: RpkiRepositorioLogsModal, size: 'xl', className: 'no-padding' };
    case 'logs-ixc-os-sync':
      return { titleKey: 'logs.ixcOsSincronizacao', component: IxcOsSyncLogsModal, size: 'xl', className: 'no-padding' };
    default:
      return null;
  }
};

const resolveSuporteModal = (active: ModalType): ResolvedRpkiModal | null => {
  switch (active) {
    case 'atendimentos':
      return {
        title: 'Atendimentos',
        component: AtendimentoListModal,
        size: 'xl',
        className: 'no-padding list-modal-no-body-scroll',
      };
    case 'ordens-servico':
      return {
        title: 'Ordens de Serviço',
        component: OrdemServicoListModal,
        size: 'xl',
        className: 'no-padding list-modal-no-body-scroll',
      };
    default:
      return null;
  }
};

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
  empresas: { component: EmpresasModal, titleKey: 'modal.companyData', loadingMessageKey: 'ui.loadingPage' },
  clientes: { component: ClienteListModal, titleKey: 'modal.clients', loadingMessageKey: 'ui.loadingPage', className: 'no-padding list-modal-no-body-scroll' },
  'cliente-modal': { component: ClienteModal, titleKey: 'modal.editClient', loadingMessageKey: 'ui.loadingPage' },
  planos: { component: PlanoListModal, titleKey: 'modal.plans', loadingMessageKey: 'ui.loadingPage', className: 'no-padding list-modal-no-body-scroll' },
  bancos: { component: BancoListModal, titleKey: 'modal.banks', loadingMessageKey: 'ui.loadingPage', className: 'no-padding list-modal-no-body-scroll' },
  'tipos-cobranca-contrato': { component: TipoCobrancaContratoListModal, titleKey: 'modal.billingType', loadingMessageKey: 'ui.loadingPage', className: 'no-padding list-modal-no-body-scroll' },
  contratos: { component: ContratoListModal, titleKey: 'modal.contracts', loadingMessageKey: 'ui.loadingPage', className: 'no-padding list-modal-no-body-scroll' },
  'contas-receber': { component: ContasReceberListModal, titleKey: 'modal.accountsReceivable', loadingMessageKey: 'ui.loadingPage', className: 'no-padding list-modal-no-body-scroll' },
  fornecedores: { component: FornecedorListModal, titleKey: 'modal.suppliers', loadingMessageKey: 'ui.loadingPage', className: 'no-padding list-modal-no-body-scroll' },
  'contas-pagar': { component: ContasPagarListModal, titleKey: 'modal.accountsPayable', loadingMessageKey: 'ui.loadingPage', className: 'no-padding list-modal-no-body-scroll' },
  'notas-fiscais': { component: NotaFiscalListModal, titleKey: 'modal.invoices', loadingMessageKey: 'ui.loadingPage', className: 'no-padding list-modal-no-body-scroll' },
  'dados-empresa': { component: DadosEmpresaModal, titleKey: 'modal.companyData', loadingMessageKey: 'ui.loadingPage' },
  usuarios: { component: UsuariosModal, titleKey: 'modal.users', loadingMessageKey: 'ui.loadingPage' },
  'seguranca-usuario': { component: SegurancaUsuarioModal, titleKey: 'security.title', loadingMessageKey: 'ui.loadingPage', size: 'lg' },
  'conf-usuario': { component: ConfUsuarioModal, titleKey: 'userConfig.title', loadingMessageKey: 'ui.loadingPage', size: 'lg' },
  'recursos-sistema': { component: RecursosSistemaModal, titleKey: 'modal.systemResources', loadingMessageKey: 'ui.loadingPage' },
  'servidor-email': { component: ServidorEmailModal, titleKey: 'modal.emailServer', loadingMessageKey: 'ui.loadingPage' },
  'servidor-whatsapp': { component: ServidorWhatsappModal, titleKey: 'modal.whatsappServer', loadingMessageKey: 'ui.loadingPage' },
  nfse: { component: NFSeModal, titleKey: 'modal.nfse', loadingMessageKey: 'ui.loadingPage' },
  'dias-vencimento': { component: DiasVencimentoModal, titleKey: 'modal.dueDays', loadingMessageKey: 'ui.loadingPage' },
  'assinatura-digital': { component: AssinaturaDigitalModal, titleKey: 'modal.digitalSignature', loadingMessageKey: 'ui.loadingPage' },
  auditoria: { component: AuditoriaModal, titleKey: 'modal.auditLogs', loadingMessageKey: 'ui.loadingPage', className: 'no-padding' },
  atualizacoes: { component: AtualizacoesModal, titleKey: 'updates.title', loadingMessageKey: 'ui.loadingPage' },
  backups: { component: BackupsModal, titleKey: 'modal.backups', loadingMessageKey: 'ui.loadingPage', size: 'xl', className: 'no-padding' },
  'documentos-sistema': { component: DocumentosSistemaModal, titleKey: 'modal.systemDocuments', loadingMessageKey: 'ui.loadingPage', size: 'xl', className: 'no-padding' },
  'agendador-tarefas': { component: AgendadorTarefasModal, titleKey: 'params.taskScheduler', loadingMessageKey: 'ui.loadingPage', size: 'lg', className: 'no-padding' },
  // SSH Manager
  'ssh-devices': { component: SshDeviceListModal, titleKey: 'modal.sshDevices', loadingMessageKey: 'ui.loadingPage', size: 'xl', className: 'no-padding' },
  'dashboard-backup-equipamentos': {
    component: DashboardBackupEquipamentosModal,
    titleKey: 'modal.backupLogs',
    loadingMessageKey: 'ui.loadingPage',
    size: 'xl',
    className: 'no-padding',
  },
  // Agents / Tunnels
  'agents':       { component: AgentListModal,       titleKey: 'modal.agents',      loadingMessageKey: 'ui.loadingPage', size: 'xl', className: 'no-padding' },
  'blockdomi-dominios': { component: DominioListModal, titleKey: 'modal.domains', loadingMessageKey: 'ui.loadingPage', className: 'no-padding list-modal-no-body-scroll' },
  'blockdomi-ipv4': { component: IPv4ListModal, titleKey: 'modal.ipv4', loadingMessageKey: 'ui.loadingPage', className: 'no-padding list-modal-no-body-scroll' },
  'blockdomi-ipv6': { component: IPv6ListModal, titleKey: 'modal.ipv6', loadingMessageKey: 'ui.loadingPage', className: 'no-padding list-modal-no-body-scroll' },
  'blockdomi-importar-lista': { component: ImportarListaBlockdomiModal, titleKey: 'modal.importList', loadingMessageKey: 'ui.loadingPage', size: 'xl' },
  'blockdomi-ips-permitidos': { component: IpsPermitidosListModal, titleKey: 'blockdomi.ipsPermitidos', loadingMessageKey: 'ui.loadingPage', className: 'no-padding' },
  'integracao-ixc-provedor': {
    component: IntegracaoIxcProvedorListModal,
    titleKey: 'tabs.ixcProvedor',
    loadingMessageKey: 'ui.loadingPage',
    size: 'xl',
    className: 'no-padding list-modal-no-body-scroll',
  },
  // Logs: resolveLogsModal (logsModalRegistry.ts) — não duplicar aqui
});

const SingleModalWrapper: React.FC = () => {
  const { activeModal, modalData, closeModal } = useModal();
  const { t } = useI18n();
  const [headerActions, setHeaderActions] = useState<React.ReactNode>(null);
  const prevModalRef = useRef<string | null>(null);

  // Limpar headerActions quando o modal fechar ou quando trocar de um modal para outro,
  // para não exibir botões da tela anterior (ex.: IPs permitidos ao abrir Domínios).
  if (prevModalRef.current !== activeModal) {
    prevModalRef.current = activeModal ?? null;
    setHeaderActions(null);
  }

  useEffect(() => {
    if (!activeModal) {
      setHeaderActions(null);
    }
  }, [activeModal]);

  if (!activeModal) return null;

  const resolvedLogs = resolveLogsModal(activeModal);
  if (resolvedLogs) {
    const loadingMessage = t('ui.loadingPage');
    const logsTitle = t(resolvedLogs.titleKey);
    return (
      <DraggableModal
        show={true}
        onClose={closeModal}
        title={logsTitle}
        size="xl"
        className="no-padding"
        headerActions={headerActions}
      >
        <Suspense fallback={<Loading message={loadingMessage} variant="modal" />}>
          <LogsModal
            show={true}
            onClose={closeModal}
            skipWrapper={true}
            logType={resolvedLogs.logType}
            variant={resolvedLogs.variant}
            {...(modalData ?? {})}
          />
        </Suspense>
      </DraggableModal>
    );
  }

  const resolvedRpki = resolveRpkiModal(activeModal);
  if (resolvedRpki) {
    const loadingMessage = t('ui.loadingPage');
    const RpkiComponent = resolvedRpki.component;
    const rpkiTitle = resolvedRpki.titleKey != null ? t(resolvedRpki.titleKey) : (resolvedRpki.title ?? '');
    return (
      <DraggableModal
        show={true}
        onClose={closeModal}
        title={rpkiTitle}
        size={resolvedRpki.size ?? 'lg'}
        className={resolvedRpki.className ?? ''}
      >
        <Suspense fallback={<Loading message={loadingMessage} variant="modal" />}>
          <RpkiComponent
            show={true}
            onClose={closeModal}
            skipWrapper={true}
            {...(modalData ?? {})}
          />
        </Suspense>
      </DraggableModal>
    );
  }

  const resolvedSuporte = resolveSuporteModal(activeModal);
  if (resolvedSuporte) {
    const loadingMessage = t('ui.loadingPage');
    const SuporteComponent = resolvedSuporte.component;
    const suporteTitle = resolvedSuporte.titleKey != null ? t(resolvedSuporte.titleKey) : (resolvedSuporte.title ?? '');
    return (
      <DraggableModal
        show={true}
        onClose={closeModal}
        title={suporteTitle}
        size={resolvedSuporte.size ?? 'lg'}
        className={resolvedSuporte.className ?? ''}
        headerActions={headerActions}
      >
        <Suspense fallback={<Loading message={loadingMessage} variant="modal" />}>
          <SuporteComponent
            show={true}
            onClose={closeModal}
            skipWrapper={true}
            {...(modalData ?? {})}
          />
        </Suspense>
      </DraggableModal>
    );
  }

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
    onHeaderActionsReady: setHeaderActions,
    ...(['clientes', 'planos', 'bancos', 'tipos-cobranca-contrato', 'contratos'].includes(activeModal) && { title: modalTitle }),
    ...(isClienteModal && { clienteId }),
    // Para outros modais, passamos os dados adicionais normalmente
    ...(!isClienteModal && modalData && modalData),
    // Por último: modalData nunca pode desativar o wrapper único (evita segundo DraggableModal / cabeçalho duplicado)
    skipWrapper: true,
  };

  // O ClienteModal já encapsula seu próprio DraggableModal (header/abas/actions),
  // então aqui não podemos criar um segundo wrapper externo.
  if (isClienteModal) {
    return (
      <Suspense fallback={<Loading message={loadingMessage} />}>
        <ModalComponent {...modalProps} />
      </Suspense>
    );
  }

  return (
    <DraggableModal
      show={true}
      onClose={closeModal}
      title={modalTitle}
      size={modalConfig.size ?? 'lg'}
      className={modalConfig.className || ''}
      headerActions={headerActions}
    >
      <Suspense fallback={<Loading message={loadingMessage} variant="modal" />}>
        <ModalComponent {...modalProps} />
      </Suspense>
    </DraggableModal>
  );
};

export default SingleModalWrapper;

