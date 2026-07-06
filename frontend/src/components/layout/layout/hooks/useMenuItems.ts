import { useCallback, useMemo } from 'react';
import type { ModalType } from 'contexts/ModalContext';
import type { SidebarFolderConfig, SidebarMenuItem, TranslateFn } from '../types';
import { filterByModulo } from '../utils';
import type { PlanoModuloId } from 'services/planoModulosService';

interface UseMenuItemsParams {
  t: TranslateFn;
  openModal: (modalName: ModalType) => void;
  hasModulo: (moduloId: PlanoModuloId) => boolean;
}

export const useMenuItems = ({ t, openModal, hasModulo }: UseMenuItemsParams) => {
  const handleOpenModal = useCallback(
    (modalName: string) => {
      openModal(modalName as ModalType);
    },
    [openModal]
  );

  const filterItem = useCallback(
    (item: SidebarMenuItem) => filterByModulo(item.modalId, hasModulo),
    [hasModulo]
  );

  const cadastrosFolderItems = useMemo(
    () =>
      [
        { id: 'clientes', modalId: 'clientes', label: t('menu.clients'), icon: 'bi-people', onClick: () => handleOpenModal('clientes') },
        { id: 'contratos', modalId: 'contratos', label: t('menu.contracts'), icon: 'bi-file-earmark-text', onClick: () => handleOpenModal('contratos') },
        { id: 'planos', modalId: 'planos', label: t('menu.plans'), icon: 'bi-card-list', onClick: () => handleOpenModal('planos') },
        { id: 'bancos', modalId: 'bancos', label: t('menu.banks'), icon: 'bi-bank', onClick: () => handleOpenModal('bancos') },
        { id: 'tipos-cobranca-contrato', modalId: 'tipos-cobranca-contrato', label: t('menu.billingType'), icon: 'bi-credit-card', onClick: () => handleOpenModal('tipos-cobranca-contrato') },
        { id: 'fornecedores', modalId: 'fornecedores', label: t('menu.suppliers'), icon: 'bi-truck', onClick: () => handleOpenModal('fornecedores') },
        { id: 'documentos-sistema', modalId: 'documentos-sistema', label: t('menu.documentModels'), icon: 'bi-folder', onClick: () => handleOpenModal('documentos-sistema') },
      ].filter(filterItem),
    [t, handleOpenModal, filterItem]
  );

  const financeiroFolderItems = useMemo(
    () =>
      [
        { id: 'contas-receber', modalId: 'contas-receber', label: t('menu.accountsReceivable'), icon: 'bi-cash-stack', onClick: () => handleOpenModal('contas-receber') },
        { id: 'contas-pagar', modalId: 'contas-pagar', label: t('menu.accountsPayable'), icon: 'bi-arrow-down-circle', onClick: () => handleOpenModal('contas-pagar') },
        { id: 'notas-fiscais', modalId: 'notas-fiscais', label: t('menu.invoices'), icon: 'bi-receipt', onClick: () => handleOpenModal('notas-fiscais') },
      ].filter(filterItem),
    [t, handleOpenModal, filterItem]
  );

  const parametrosFolderItems = useMemo(
    () =>
      [
        { id: 'dados-empresa', modalId: 'dados-empresa', label: t('menu.companyData'), icon: 'bi-building', onClick: () => handleOpenModal('dados-empresa') },
        { id: 'usuarios', modalId: 'usuarios', label: t('params.users'), icon: 'bi-people-fill', onClick: () => handleOpenModal('usuarios') },
        { id: 'recursos-sistema', modalId: 'recursos-sistema', label: t('params.systemResources'), icon: 'bi-gear', onClick: () => handleOpenModal('recursos-sistema') },
        { id: 'dias-vencimento', modalId: 'dias-vencimento', label: t('params.dueDays'), icon: 'bi-calendar-event', onClick: () => handleOpenModal('dias-vencimento') },
      ].filter(filterItem),
    [t, handleOpenModal, filterItem]
  );

  const sshManagerFolderItems = useMemo(
    () =>
      [
        { id: 'agents', modalId: 'agents', label: t('menu.tunnelsAgents'), icon: 'bi-plugin', onClick: () => handleOpenModal('agents') },
        { id: 'ssh-devices', modalId: 'ssh-devices', label: t('menu.equipment'), icon: 'bi-terminal', onClick: () => handleOpenModal('ssh-devices') },
      ].filter(filterItem),
    [t, handleOpenModal, filterItem]
  );

  const blockdomiFolderItems = useMemo(
    () =>
      [
        { id: 'dominios', modalId: 'blockdomi-dominios', label: t('modal.domains'), icon: 'bi-globe', onClick: () => handleOpenModal('blockdomi-dominios') },
        { id: 'ipv4', modalId: 'blockdomi-ipv4', label: t('modal.ipv4'), icon: 'bi-router', onClick: () => handleOpenModal('blockdomi-ipv4') },
        { id: 'ipv6', modalId: 'blockdomi-ipv6', label: t('modal.ipv6'), icon: 'bi-router-fill', onClick: () => handleOpenModal('blockdomi-ipv6') },
        { id: 'importar-lista', modalId: 'blockdomi-importar-lista', label: t('modal.importList'), icon: 'bi-list-ul', onClick: () => handleOpenModal('blockdomi-importar-lista') },
        { id: 'ips-permitidos', modalId: 'blockdomi-ips-permitidos', label: t('blockdomi.ipsPermitidos'), icon: 'bi-shield-check', onClick: () => handleOpenModal('blockdomi-ips-permitidos') },
      ].filter(filterItem),
    [t, handleOpenModal, filterItem]
  );

  const rpkiFolderItems = useMemo(
    () =>
      [
        { id: 'rpki-cas', modalId: 'rpki-cas', label: 'CAs', icon: 'bi-diagram-3', onClick: () => handleOpenModal('rpki-cas') },
        { id: 'rpki-cas-pai', modalId: 'rpki-cas-pai', label: 'CAs-pai', icon: 'bi-diagram-2', onClick: () => handleOpenModal('rpki-cas-pai') },
        { id: 'rpki-repositorios', modalId: 'rpki-repositorios', label: t('menu.repositories'), icon: 'bi-hdd-network', onClick: () => handleOpenModal('rpki-repositorios') },
        { id: 'rpki-roas', modalId: 'rpki-roas', label: 'ROAs', icon: 'bi-list-check', onClick: () => handleOpenModal('rpki-roas') },
        { id: 'rpki-aspas', modalId: 'rpki-aspas', label: 'ASPAs', icon: 'bi-shield-check', onClick: () => handleOpenModal('rpki-aspas') },
        { id: 'rpki-validar-rota', modalId: 'rpki-validar-rota', label: t('menu.validateRoute'), icon: 'bi-search', onClick: () => handleOpenModal('rpki-validar-rota') },
      ].filter(filterItem),
    [t, handleOpenModal, filterItem]
  );

  const suporteFolderItems = useMemo(
    () =>
      [
        { id: 'ordens-servico', modalId: 'ordens-servico', label: t('menu.serviceOrders'), icon: 'bi-headset', onClick: () => handleOpenModal('ordens-servico') },
      ].filter(filterItem),
    [t, handleOpenModal, filterItem]
  );

  const integracoesFolderItems = useMemo(
    () =>
      [
        { id: 'servidor-email', modalId: 'servidor-email', label: t('params.emailServer'), icon: 'bi-envelope', onClick: () => handleOpenModal('servidor-email') },
        { id: 'servidor-whatsapp', modalId: 'servidor-whatsapp', label: t('params.whatsappServer'), icon: 'bi-whatsapp', onClick: () => handleOpenModal('servidor-whatsapp') },
        { id: 'nfse', modalId: 'nfse', label: t('params.nfse'), icon: 'bi-file-earmark-text', onClick: () => handleOpenModal('nfse') },
        { id: 'assinatura-digital', modalId: 'assinatura-digital', label: t('params.digitalSignature'), icon: 'bi-pen', onClick: () => handleOpenModal('assinatura-digital') },
        {
          id: 'integracao-ixc-provedor',
          modalId: 'integracao-ixc-provedor',
          label: t('tabs.ixcProvedor'),
          icon: 'bi-plug',
          onClick: () => handleOpenModal('integracao-ixc-provedor'),
        },
      ].filter(filterItem),
    [t, handleOpenModal, filterItem]
  );

  const logsFolderItems = useMemo(
    () =>
      [
        { id: 'auditoria', modalId: 'auditoria', label: t('params.auditLogs'), icon: 'bi-journal-text', onClick: () => handleOpenModal('auditoria') },
        { id: 'logs-usuarios', modalId: 'logs-usuarios', label: t('logs.usuarios'), icon: 'bi-people-fill', onClick: () => handleOpenModal('logs-usuarios') },
        { id: 'logs-assinatura-digital', modalId: 'logs-assinatura-digital', label: t('logs.assinaturaDigital'), icon: 'bi-pen', onClick: () => handleOpenModal('logs-assinatura-digital') },
        { id: 'logs-acesso-sistema', modalId: 'logs-acesso-sistema', label: t('logs.acessoSistema'), icon: 'bi-door-open', onClick: () => handleOpenModal('logs-acesso-sistema') },
        { id: 'logs-blockdomi-api', modalId: 'logs-blockdomi-api', label: t('blockdomi.logsApi'), icon: 'bi-journal-text', onClick: () => handleOpenModal('logs-blockdomi-api') },
      ].filter(filterItem),
    [t, handleOpenModal, filterItem]
  );

  const logsComunicacaoFolderItems = useMemo(
    () =>
      [
        { id: 'logs-whatsapp', modalId: 'logs-whatsapp', label: t('logs.whatsapp'), icon: 'bi-whatsapp', onClick: () => handleOpenModal('logs-whatsapp') },
        { id: 'logs-email', modalId: 'logs-email', label: t('logs.email'), icon: 'bi-envelope', onClick: () => handleOpenModal('logs-email') },
      ].filter(filterItem),
    [t, handleOpenModal, filterItem]
  );

  const logsEquipamentosFolderItems = useMemo(
    () =>
      [
        { id: 'logs-equipamentos', modalId: 'logs-equipamentos', label: t('logs.equipamentos'), icon: 'bi-journal-code', onClick: () => handleOpenModal('logs-equipamentos') },
        { id: 'logs-agentes', modalId: 'logs-agentes', label: t('logs.agentes'), icon: 'bi-plugin', onClick: () => handleOpenModal('logs-agentes') },
      ].filter(filterItem),
    [t, handleOpenModal, filterItem]
  );

  const logsIntegracaoFolderItems = useMemo(
    () =>
      [
        {
          id: 'logs-ixc-os-sync',
          modalId: 'logs-ixc-os-sync',
          label: t('logs.ixcOsSincronizacao'),
          icon: 'bi-journal-text',
          onClick: () => handleOpenModal('logs-ixc-os-sync'),
        },
      ].filter(filterItem),
    [t, handleOpenModal, filterItem]
  );

  const logsRpkiFolderItems = useMemo(
    () =>
      [
        { id: 'rpki-logs-validacao', modalId: 'rpki-logs-validacao', label: t('logs.rpkiSincronizacao'), icon: 'bi-journal-text', onClick: () => handleOpenModal('rpki-logs-validacao') },
        { id: 'rpki-logs-ca-pai', modalId: 'rpki-logs-ca-pai', label: t('logs.rpkiCaPai'), icon: 'bi-cloud-arrow-up', onClick: () => handleOpenModal('rpki-logs-ca-pai') },
        { id: 'rpki-logs-repositorios', modalId: 'rpki-logs-repositorios', label: t('logs.rpkiRepositorios'), icon: 'bi-hdd-rack', onClick: () => handleOpenModal('rpki-logs-repositorios') },
      ].filter(filterItem),
    [t, handleOpenModal, filterItem]
  );

  const sidebarFolders: SidebarFolderConfig[] = useMemo(
    () => [
      {
        accordionId: 'cadastrosAccordion',
        collapseId: 'cadastrosCollapse',
        headingId: 'cadastrosHeading',
        title: t('layout.folderCadastros'),
        items: cadastrosFolderItems,
        requireModulosLoaded: true,
      },
      {
        accordionId: 'financeiroAccordion',
        collapseId: 'financeiroCollapse',
        headingId: 'financeiroHeading',
        title: t('layout.folderFinanceiro'),
        items: financeiroFolderItems,
        requireModulosLoaded: true,
      },
      {
        accordionId: 'sshManagerAccordion',
        collapseId: 'sshManagerCollapse',
        headingId: 'sshManagerHeading',
        title: t('layout.folderEquipamentos'),
        items: sshManagerFolderItems,
        requireModulosLoaded: true,
      },
      {
        accordionId: 'blockdomiAccordion',
        collapseId: 'blockdomiCollapse',
        headingId: 'blockdomiHeading',
        title: t('blockdomi.menuTitle'),
        items: blockdomiFolderItems,
        requireModulosLoaded: true,
      },
      {
        accordionId: 'rpkiAccordion',
        collapseId: 'rpkiCollapse',
        headingId: 'rpkiHeading',
        title: 'RPKI',
        items: rpkiFolderItems,
      },
      {
        accordionId: 'integracoesAccordion',
        collapseId: 'integracoesCollapse',
        headingId: 'integracoesHeading',
        title: t('layout.folderIntegracoes'),
        items: integracoesFolderItems,
      },
      {
        accordionId: 'suporteAccordion',
        collapseId: 'suporteCollapse',
        headingId: 'suporteHeading',
        title: t('layout.folderSupport'),
        items: suporteFolderItems,
      },
      {
        accordionId: 'logsAccordion',
        collapseId: 'logsCollapse',
        headingId: 'logsHeading',
        title: t('layout.folderLogs'),
        items: logsFolderItems,
        nestedFolders: [
          {
            accordionId: 'logsComunicacaoAccordion',
            collapseId: 'logsComunicacaoCollapse',
            headingId: 'logsComunicacaoHeading',
            titleKey: 'layout.folderLogsComunicacao',
            items: logsComunicacaoFolderItems,
          },
          {
            accordionId: 'logsEquipamentosAccordion',
            collapseId: 'logsEquipamentosCollapse',
            headingId: 'logsEquipamentosHeading',
            titleKey: 'layout.folderLogsEquipamentos',
            items: logsEquipamentosFolderItems,
          },
          {
            accordionId: 'logsIntegracaoAccordion',
            collapseId: 'logsIntegracaoCollapse',
            headingId: 'logsIntegracaoHeading',
            titleKey: 'layout.folderLogsIntegracao',
            items: logsIntegracaoFolderItems,
          },
          {
            accordionId: 'logsRpkiAccordion',
            collapseId: 'logsRpkiCollapse',
            headingId: 'logsRpkiHeading',
            titleKey: 'layout.folderLogsRpki',
            items: logsRpkiFolderItems,
          },
        ],
      },
      {
        accordionId: 'parametrosAccordion',
        collapseId: 'parametrosCollapse',
        headingId: 'parametrosHeading',
        title: t('layout.parameters'),
        items: parametrosFolderItems,
      },
    ],
    [
      t,
      cadastrosFolderItems,
      financeiroFolderItems,
      sshManagerFolderItems,
      blockdomiFolderItems,
      rpkiFolderItems,
      integracoesFolderItems,
      suporteFolderItems,
      logsFolderItems,
      logsComunicacaoFolderItems,
      logsEquipamentosFolderItems,
      logsIntegracaoFolderItems,
      logsRpkiFolderItems,
      parametrosFolderItems,
    ]
  );

  return {
    handleOpenModal,
    sidebarFolders,
  };
};
