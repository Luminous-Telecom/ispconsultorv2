import { useMemo } from 'react';
import { type ModalType } from 'contexts/ModalContext';
import type { SidebarFolderConfig, SidebarMenuItem, TranslateFn } from 'components/layout/layout/types';

interface UseSaasMenuItemsParams {
  t: TranslateFn;
  openModal: (modalName: ModalType) => void;
}

const createItem = (
  id: string,
  label: string,
  handleOpenModal: (modalName: string) => void
): SidebarMenuItem => ({
  id,
  modalId: id,
  label,
  icon: '',
  onClick: () => handleOpenModal(id),
});

export const useSaasMenuItems = ({ t, openModal }: UseSaasMenuItemsParams) => {
  const sidebarFolders = useMemo((): SidebarFolderConfig[] => {
    const handleOpenModal = (modalName: string) => {
      openModal(modalName as ModalType);
    };

    const logsErpRootItems = [
      createItem('logs-usuarios', t('logs.usuarios'), handleOpenModal),
      createItem('logs-assinatura-digital', t('logs.assinaturaDigital'), handleOpenModal),
      createItem('logs-acesso-sistema', t('logs.acessoSistema'), handleOpenModal),
      createItem('logs-blockdomi-api', t('blockdomi.logsApi'), handleOpenModal),
    ];

    const logsErpComunicacaoItems = [
      createItem('logs-whatsapp', t('logs.whatsapp'), handleOpenModal),
      createItem('logs-email', t('logs.email'), handleOpenModal),
    ];

    const logsErpEquipamentosItems = [
      createItem('logs-equipamentos', t('logs.equipamentos'), handleOpenModal),
      createItem('logs-agentes', t('logs.agentes'), handleOpenModal),
    ];

    const logsErpRpkiItems = [
      createItem('rpki-logs-validacao', t('logs.rpkiSincronizacao'), handleOpenModal),
      createItem('rpki-logs-ca-pai', t('logs.rpkiCaPai'), handleOpenModal),
      createItem('rpki-logs-repositorios', t('logs.rpkiRepositorios'), handleOpenModal),
    ];

    return [
      {
        accordionId: 'cadastros-saasAccordion',
        collapseId: 'cadastros-saasCollapse',
        headingId: 'cadastros-saasHeading',
        title: t('layout.folderCadastrosSaas'),
        items: [
          createItem('saas-clientes', t('modal.clientsTenants'), handleOpenModal),
          createItem('saas-planos', t('menu.plans'), handleOpenModal),
          createItem('saas-bancos', t('menu.banks'), handleOpenModal),
          createItem('saas-tipos-cobranca', t('menu.billingType'), handleOpenModal),
        ],
      },
      {
        accordionId: 'financeiro-saasAccordion',
        collapseId: 'financeiro-saasCollapse',
        headingId: 'financeiro-saasHeading',
        title: t('layout.folderFinanceiroSaas'),
        items: [createItem('saas-titulos', t('menu.accountsReceivable'), handleOpenModal)],
      },
      {
        accordionId: 'logs-erp-superadminAccordion',
        collapseId: 'logs-erp-superadminCollapse',
        headingId: 'logs-erp-superadminHeading',
        title: t('layout.folderLogsErp'),
        items: logsErpRootItems,
        nestedFolders: [
          {
            accordionId: 'saasLogsComunicacaoAccordion',
            collapseId: 'saasLogsComunicacaoCollapse',
            headingId: 'saasLogsComunicacaoHeading',
            titleKey: 'layout.folderLogsComunicacao',
            items: logsErpComunicacaoItems,
          },
          {
            accordionId: 'saasLogsEquipamentosAccordion',
            collapseId: 'saasLogsEquipamentosCollapse',
            headingId: 'saasLogsEquipamentosHeading',
            titleKey: 'layout.folderLogsEquipamentos',
            items: logsErpEquipamentosItems,
          },
          {
            accordionId: 'saasLogsRpkiAccordion',
            collapseId: 'saasLogsRpkiCollapse',
            headingId: 'saasLogsRpkiHeading',
            titleKey: 'layout.folderLogsRpki',
            items: logsErpRpkiItems,
          },
        ],
      },
      {
        accordionId: 'logs-saas-superadminAccordion',
        collapseId: 'logs-saas-superadminCollapse',
        headingId: 'logs-saas-superadminHeading',
        title: t('layout.folderLogsSaas'),
        items: [
          createItem('saas-logs-usuarios', t('logs.usuarios'), handleOpenModal),
          createItem('saas-logs-agenda-tarefas', t('logs.agendaTarefas'), handleOpenModal),
          createItem('saas-logs-email', t('logs.email'), handleOpenModal),
          createItem('saas-logs-whatsapp', t('logs.whatsapp'), handleOpenModal),
          createItem('saas-logs-assinatura-digital', t('logs.assinaturaDigital'), handleOpenModal),
          createItem('saas-logs-acesso-sistema', t('logs.acessoSistema'), handleOpenModal),
        ],
      },
      {
        accordionId: 'parametros-saasAccordion',
        collapseId: 'parametros-saasCollapse',
        headingId: 'parametros-saasHeading',
        title: t('layout.folderConfiguracoes'),
        items: [
          createItem('saas-dados-empresa', t('menu.companyData'), handleOpenModal),
          createItem('saas-usuarios', t('menu.usersSaas'), handleOpenModal),
          createItem('saas-recursos-sistema', t('params.systemResources'), handleOpenModal),
          createItem('saas-agendador-tarefas', t('params.taskScheduler'), handleOpenModal),
          createItem('saas-nfse', t('params.nfse'), handleOpenModal),
          createItem('saas-dias-vencimento', t('params.dueDays'), handleOpenModal),
          createItem('saas-servidores-email', t('menu.emailServers'), handleOpenModal),
          createItem('saas-servidores-whatsapp', t('menu.whatsappServers'), handleOpenModal),
          createItem('saas-historico-whatsapp', t('menu.whatsappHistory'), handleOpenModal),
          createItem('saas-historico-email', t('menu.emailHistory'), handleOpenModal),
          createItem('saas-auditoria', t('menu.audit'), handleOpenModal),
          createItem('saas-atualizacoes', t('modal.updates'), handleOpenModal),
          createItem('saas-backups', t('menu.backups'), handleOpenModal),
        ],
      },
    ];
  }, [t, openModal]);

  return { sidebarFolders };
};
