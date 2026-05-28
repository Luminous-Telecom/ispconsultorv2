import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TituloService } from 'services/tituloService';
import { useTableFilters } from 'hooks/useTableFilters';
import { useFormPrefix } from 'hooks/useFormId';
import { useClienteForm } from 'hooks/useClienteForm';
import { useClienteContratos } from 'hooks/useClienteContratos';
import { useClienteImpressao } from 'hooks/useClienteImpressao';
import { useClienteBulkActions } from 'hooks/useClienteBulkActions';
import { useIsMobile } from 'hooks/useMediaQuery';
import { useAuditoria } from 'hooks/useAuditoria';
import { usePlanoModulos } from 'hooks/usePlanoModulos';
import { useI18n } from 'contexts/I18nContext';
import { formatCurrency, formatDate, formatDateTime } from 'utils/formatters';
import { CarneParcela } from 'types';
import { TituloItem } from 'types/cliente';
import DraggableModal from 'components/common/DraggableModal';
import ModalTabsOverflow, { ModalTabItem } from 'components/common/ModalTabsOverflow';
import ImprimirModal from 'components/common/ImprimirModal';
import { TituloModal } from 'components/modals/titulos/titulo';
import ReceberModal from 'components/modals/pagamentos/ReceberModal';
import ContratoModal from '../contrato/ContratoModal';
import GerarNFeModal from 'components/modals/notas-fiscais/GerarNFeModal';
import { ModalFormActions, Spinner } from 'components/ui';
// import './ClienteModal.css'; // Estilos movidos para _components.scss
// Componentes de abas
import DadosBasicosTab from './abas/DadosBasicosTab';
import ContatoTab from './abas/ContatoTab';
import EnderecoTab from './abas/EnderecoTab';
import ContratosTab from './abas/ContratosTab';
import FinanceiroTab from './abas/FinanceiroTab';
import ObservacoesTab from './abas/ObservacoesTab';
import ArquivosTab from './abas/ArquivosTab';
import ClienteTunelTab from './abas/ClienteTunelTab';
import ClienteSshDevicesTab from './abas/ClienteSshDevicesTab';
import ClienteSshBackupsTab from './abas/ClienteSshBackupsTab';
import ClienteRpkiCasTab from './abas/ClienteRpkiCasTab';
import ClienteRpkiCaPaiTab from './abas/ClienteRpkiCaPaiTab';
import ClienteRpkiRepositoriosTab from './abas/ClienteRpkiRepositoriosTab';
import ClienteRpkiRoasTab from './abas/ClienteRpkiRoasTab';
import ClienteRpkiAspasTab from './abas/ClienteRpkiAspasTab';

interface ClienteModalProps {
  show: boolean;
  onClose: () => void;
  clienteId?: number | null;
  onSuccess?: () => void;
}

const CLIENTE_RPKI_TAB_IDS = [
  'rpki-cas',
  'rpki-cas-pai',
  'rpki-repositorios',
  'rpki-roas',
  'rpki-aspas',
] as const;

const ClienteModal = ({
  show,
  onClose,
  clienteId = null,
  onSuccess
}: ClienteModalProps) => {
  const { t } = useI18n();
  const { hasModulo } = usePlanoModulos();
  const formPrefix = useFormPrefix('ClienteEditModal');
  const isMobile = useIsMobile();
  const hasModuloEquipamentos = hasModulo('equipamentos');
  const hasModuloRpki = hasModulo('rpki');

  // Estados de modais aninhados
  const [activeTab, setActiveTab] = useState('dados-basicos');
  const [showCancelados, setShowCancelados] = useState(false);
  const [showTituloEditModal, setShowTituloEditModal] = useState(false);
  const [showReceberModal, setShowReceberModal] = useState(false);
  const [showContratoCreateModal, setShowContratoCreateModal] = useState(false);
  const [showContratoEditModal, setShowContratoEditModal] = useState(false);
  const [selectedContratoId, setSelectedContratoId] = useState<number | null>(null);
  const [selectedTituloId, setSelectedTituloId] = useState<number | null>(null);
  const [selectedParcela, setSelectedParcela] = useState<TituloItem | null>(null);
  const [showGerarNFeModal, setShowGerarNFeModal] = useState(false);
  const [selectedTituloForNFe, setSelectedTituloForNFe] = useState<CarneParcela | null>(null);

  // Resetar aba ativa quando modal abrir ou quando módulo equipamentos for desativado
  useEffect(() => {
    if (show) {
      setActiveTab('dados-basicos');
    }
  }, [show]);

  useEffect(() => {
    if (!hasModuloEquipamentos && ['tunel', 'ssh-devices', 'ssh-backups'].includes(activeTab)) {
      setActiveTab('dados-basicos');
    }
  }, [hasModuloEquipamentos, activeTab]);

  useEffect(() => {
    if (!hasModuloRpki && CLIENTE_RPKI_TAB_IDS.includes(activeTab as (typeof CLIENTE_RPKI_TAB_IDS)[number])) {
      setActiveTab('dados-basicos');
    }
  }, [hasModuloRpki, activeTab]);

  // Hook de formulário
  const formHook = useClienteForm({
    clienteId,
    show,
    onSuccess
  });


  // Gerenciar ordenação para contratos do cliente (backend ordena)
  const contratosTableFilters = useTableFilters({
    initialPage: 1,
    initialLimit: 100,
    initialSortColumn: 'id',
    initialSortDirection: 'desc',
    resetPageOnFilterChange: false,
  });

  // Hook de contratos
  const contratosHook = useClienteContratos({
    clienteId,
    createdClienteId: formHook.createdClienteId,
    sortColumn: contratosTableFilters.sortColumn,
    sortDirection: contratosTableFilters.sortDirection as 'asc' | 'desc' | undefined
  });

  // Gerenciar ordenação para títulos do cliente (backend ordena)
  const titulosTableFilters = useTableFilters({
    initialPage: 1,
    initialLimit: 100,
    initialSortColumn: 'id',
    initialSortDirection: 'desc',
    resetPageOnFilterChange: false,
  });

  // Buscar parcelas do cliente (todas, sem filtro por data) - ordenação no backend
  const effectiveClienteIdForParcelas = clienteId || formHook.createdClienteId || undefined;
  const { data: parcelasData, isLoading: isLoadingParcelas, refetch: refetchParcelas } = useQuery({
    queryKey: ['parcelas', 'cliente', effectiveClienteIdForParcelas, titulosTableFilters.sortColumn, titulosTableFilters.sortDirection],
    queryFn: () => TituloService.list({
      cliente_id: effectiveClienteIdForParcelas!,
      page: 1,
      limit: 5000,
      sortColumn: titulosTableFilters.sortColumn,
      sortDirection: titulosTableFilters.sortDirection
    }),
    enabled: !!effectiveClienteIdForParcelas,
  });

  // Hook de impressão (independente, não precisa de selectedItems na criação)
  const impressaoHook = useClienteImpressao({
    clienteId,
    parcelasData
  });

  // Hook de auditoria
  const auditoria = useAuditoria();

  // Criar handlers que serão passados para bulkActions
  const handleImprimirTitulosSelecionadosWrapper = async (selectedItems: TituloItem[]) => {
    await impressaoHook.handleImprimirTitulosSelecionados(selectedItems);
  };

  // Hook de bulk actions (recebe handlers de impressão)
  const bulkActionsHook = useClienteBulkActions({
    clienteId,
    createdClienteId: formHook.createdClienteId,
    parcelasData,
    contratosData: contratosHook.contratosData,
    onRefreshParcelas: async () => {
      await refetchParcelas();
    },
    onRefreshContratos: async () => {
      await contratosHook.refetchContratos();
    },
    onShowTituloEditModal: (tituloId: number) => {
      setSelectedTituloId(tituloId);
      setShowTituloEditModal(true);
    },
    onShowReceberModal: (parcela: TituloItem) => {
      setSelectedParcela(parcela);
      setShowReceberModal(true);
    },
    onShowContratoCreateModal: () => setShowContratoCreateModal(true),
    onShowContratoEditModal: (contratoId: number) => {
      setSelectedContratoId(contratoId);
      setShowContratoEditModal(true);
    },
    onShowImprimirModal: () => {
      impressaoHook.setShowImprimirModal(true);
    },
    handleImprimirTitulosSelecionados: handleImprimirTitulosSelecionadosWrapper,
    handleImprimirTodosEmAberto: impressaoHook.handleImprimirTodosEmAberto,
    handleImprimirContrato: impressaoHook.handleImprimirContrato,
    handleImprimirTermoAdesao: impressaoHook.handleImprimirTermoAdesao,
    handleImprimirContratoPermanencia: impressaoHook.handleImprimirContratoPermanencia,
    handleImprimirRecibos: impressaoHook.handleImprimirRecibos,
    onShowGerarNFeModal: (titulo?: CarneParcela) => {
      if (titulo) {
        // O titulo já é CarneParcela vindo da tabela
        setSelectedTituloForNFe(titulo);
      }
      setShowGerarNFeModal(true);
    },
    handleImprimirNF: impressaoHook.handleImprimirNF
  });

  // Determinar se as abas Contratos e Financeiro devem ser habilitadas
  const canEditContratosFinanceiro = useMemo(() => {
    return formHook.isEditing || !!formHook.createdClienteId;
  }, [formHook.isEditing, formHook.createdClienteId]);

  // Filtrar e processar dados de parcelas
  const getFilteredData = () => {
    if (!parcelasData?.data) return [];
    
    const allData = parcelasData.data;

    // Filtrar cancelados se não estiver marcado para mostrar
    let filteredData = allData.filter((titulo: CarneParcela) => {
      if (titulo.status === 'cancelado' && !showCancelados) {
        return false;
      }
      return true;
    });

    return filteredData;
  };

  const filteredData = getFilteredData();

  // Adicionar campos virtuais aos dados para busca funcionar
  const sortedData = filteredData.map((titulo: CarneParcela) => ({
    ...titulo,
    plano_nome: titulo.plano?.nome_plano || '',
    numero_titulo_str: (titulo.numero_titulo || titulo.numero_parcela || titulo.id).toString(),
    valor_str: (titulo.valor || titulo.valor_parcela || 0).toString(),
    valor_pago_str: (titulo.valor_pago || 0).toString()
  }));

  // Função para obter a cor do status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pago':
        return 'success';
      case 'pago_atraso':
        return 'warning';
      case 'pendente':
        return 'primary';
      case 'vencido':
        return 'danger';
      case 'parcial':
        return 'info';
      case 'cancelado':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  // Colunas para a tabela de títulos
  const columns = [
    {
      key: 'id',
      label: t('table.id'),
      sortable: true,
      searchable: true,
      width: 42,
      resizable: true,
      render: (item: CarneParcela) => item.id
    },
    {
      key: 'contrato_id',
      label: t('table.contract'),
      sortable: true,
      searchable: true,
      render: (item: CarneParcela) => {
        const itemAny = item as unknown as { contrato_id?: number; contrato?: { id?: number } };
        const contratoId = itemAny.contrato_id || itemAny.contrato?.id;
        return contratoId || '-';
      }
    },
    {
      key: 'status',
      label: t('table.status'),
      sortable: true,
      searchable: true,
      badgeLabels: [t('status.paid'), t('status.paidLate'), t('status.pending'), t('status.overdue'), t('status.partial'), t('status.cancelled')],
      render: (item: CarneParcela) => {
        return (
          <span className={`badge bg-${getStatusColor(item.status)}`}>
            {item.status === 'pago' ? t('status.paid') : 
             item.status === 'pago_atraso' ? t('status.paidLate') : 
             item.status === 'pendente' ? t('status.pending') : 
             item.status === 'vencido' ? t('status.overdue') : 
             item.status === 'parcial' ? t('status.partial') : 
             item.status === 'cancelado' ? t('status.cancelled') : 
             item.status}
          </span>
        );
      }
    },
    {
      key: 'plano_nome',
      label: t('table.plan'),
      sortable: true,
      searchable: true,
      render: (item: CarneParcela & { plano_nome?: string }) => {
        return item.plano?.nome_plano || item.plano_nome || '-';
      }
    },
    {
      key: 'data_vencimento',
      label: t('table.dueDate'),
      sortable: true,
      searchable: false,
      render: (item: CarneParcela) => {
        return formatDate(item.data_vencimento);
      }
    },
    {
      key: 'valor',
      label: t('table.value'),
      sortable: true,
      searchable: true,
      render: (item: CarneParcela) => {
        return formatCurrency(item.valor || 0);
      }
    },
    {
      key: 'valor_pago',
      label: t('table.paidValue'),
      sortable: true,
      searchable: true,
      render: (item: CarneParcela) => {
        return item.status === 'pago' ? formatCurrency(item.valor_pago || item.valor || 0) : formatCurrency(0);
      }
    },
    {
      key: 'valor_aberto',
      label: t('table.openValue'),
      sortable: true,
      searchable: false,
      render: (item: CarneParcela) => {
        return (item.status === 'pago' || item.status === 'cancelado') ? formatCurrency(0) : formatCurrency(item.valor || 0);
      }
    },
    {
      key: 'nfse_numero',
      label: t('table.invoice'),
      sortable: true,
      searchable: true,
      render: (item: CarneParcela & { nfse_numero?: string | null }) => item.nfse_numero || '-'
    },
    {
      key: 'nfse_status',
      label: t('table.invoiceStatus'),
      sortable: true,
      searchable: true,
      badgeLabels: [t('status.scheduled'), t('status.issued'), t('status.cancelled'), t('status.rejected'), t('status.error')],
      render: (item: CarneParcela & { nfse_status?: 'agendado' | 'emitida' | 'cancelada' | 'rejeitada' | 'erro' | null }) => {
        if (!item.nfse_status) return '-';
        const statusMap: Record<string, { label: string; color: string }> = {
          'agendado': { label: t('status.scheduled'), color: 'info' },
          'emitida': { label: t('status.issued'), color: 'success' },
          'cancelada': { label: t('status.cancelled'), color: 'danger' },
          'rejeitada': { label: t('status.rejected'), color: 'warning' },
          'erro': { label: t('status.error'), color: 'danger' }
        };
        const status = statusMap[item.nfse_status] || { label: item.nfse_status, color: 'secondary' };
        return <span className={`badge bg-${status.color}`}>{status.label}</span>;
      }
    },
    {
      key: 'data_pagamento',
      label: t('table.paymentDate'),
      sortable: true,
      searchable: false,
      render: (item: CarneParcela) => {
        if (item.data_pagamento_formatada) {
          return item.data_pagamento_formatada;
        }
        return item.data_pagamento ? formatDate(item.data_pagamento) : '-';
      }
    },
    {
      key: 'charge_id',
      label: t('table.chargeId'),
      sortable: true,
      searchable: true,
      render: (item: CarneParcela) => {
        return item.charge_id || '-';
      }
    },
    {
      key: 'nosso_numero',
      label: t('table.ourNumber'),
      sortable: true,
      searchable: true,
      render: (item: CarneParcela) => item.nosso_numero || '-'
    },
    {
      key: 'created_at',
      label: t('table.createdAt'),
      sortable: true,
      searchable: false,
      render: (item: CarneParcela & { created_at?: string }) => 
        item.created_at ? formatDateTime(item.created_at) : '-'
    }
  ];

  // Handler para limpar estado ao fechar
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Determinar título dinamicamente
  const modalTitle = formHook.isEditing ? t('modal.editClient') : t('modal.createClient');


  // Renderizar conteúdo baseado no estado
  const renderContent = () => {
    // Estado de loading
    if (formHook.isLoadingCliente && formHook.isEditing) {
      return (
        <div className="text-center p-4">
          <Spinner size="md" variant="primary" aria-label={t('messages.loading')} />
          <p className="mt-2">{t('messages.loadingClientData')}</p>
        </div>
      );
    }

    // Estado de erro (cliente não encontrado)
    if (!formHook.cliente && formHook.isEditing) {
      return (
        <div className="text-center p-4">
          <p>{t('messages.noData')}</p>
        </div>
      );
    }

    // Conteúdo normal do formulário
    return (
      <div className="cliente-modal-content">

          {/* Conteúdo das Abas - Com Scroll */}
          <div
            className={`tab-content cliente-tab-content ${
              (activeTab === 'contratos' || activeTab === 'financeiro' || activeTab === 'arquivos' || activeTab === 'tunel' || activeTab === 'ssh-devices' || activeTab === 'ssh-backups' || CLIENTE_RPKI_TAB_IDS.includes(activeTab as (typeof CLIENTE_RPKI_TAB_IDS)[number]))
                ? 'cliente-tab-content-scrollable'
                : 'cliente-tab-content-padded'
            }`}
            id="clienteTabContent"
          >
            {/* Aba Cliente */}
            {activeTab === 'dados-basicos' && (
              <DadosBasicosTab
                formData={formHook.formData}
                errors={formHook.errors}
                handleInputChange={formHook.handleInputChange}
                isSubmitting={formHook.isSubmitting}
                formPrefix={formPrefix}
              />
            )}

            {/* Aba Contato */}
            {activeTab === 'contato' && (
              <ContatoTab
                formData={formHook.formData}
                errors={formHook.errors}
                handleInputChange={formHook.handleInputChange}
                isSubmitting={formHook.isSubmitting}
                formPrefix={formPrefix}
              />
            )}

            {/* Aba Endereço */}
            {activeTab === 'endereco' && (
              <EnderecoTab
                formData={formHook.formData}
                errors={formHook.errors}
                handleInputChange={formHook.handleInputChange}
                isSubmitting={formHook.isSubmitting}
                formPrefix={formPrefix}
              />
            )}

            {/* Aba Contratos */}
            {activeTab === 'contratos' && (
              <ContratosTab
                clienteId={clienteId || formHook.createdClienteId || undefined}
                isLoadingContratos={contratosHook.isLoadingContratos}
                sortedContratosData={contratosHook.sortedContratosData}
                selectedContratosItems={bulkActionsHook.selectedContratosItems}
                setSelectedContratosItems={bulkActionsHook.setSelectedContratosItems}
                contratosBulkActions={bulkActionsHook.contratosBulkActions}
                showInativosContratos={contratosHook.showInativosContratos}
                setShowInativosContratos={contratosHook.setShowInativosContratos}
                onRefresh={() => contratosHook.refetchContratos()}
                onShowCreateModal={() => setShowContratoCreateModal(true)}
                onShowEditModal={(contratoId) => {
                  setSelectedContratoId(contratoId);
                  setShowContratoEditModal(true);
                }}
                isGeneratingPdf={impressaoHook.isGeneratingPdf}
                onAudit={(contrato) => auditoria.handleAudit('Contrato', contrato.id)}
                auditEntity="Contrato"
                sortColumn={contratosTableFilters.sortColumn}
                sortDirection={contratosTableFilters.sortDirection}
                onSort={contratosTableFilters.setSort}
              />
            )}

            {/* Aba Financeiro */}
            {activeTab === 'financeiro' && (
              <FinanceiroTab
                sortedData={sortedData}
                isLoadingParcelas={isLoadingParcelas}
                selectedItems={bulkActionsHook.selectedItems}
                setSelectedItems={bulkActionsHook.setSelectedItems}
                bulkActions={bulkActionsHook.titulosBulkActions}
                showCancelados={showCancelados}
                setShowCancelados={setShowCancelados}
                onRefresh={() => refetchParcelas()}
                isGeneratingPdf={impressaoHook.isGeneratingPdf}
                columns={columns}
                onAudit={(titulo) => auditoria.handleAudit('Titulo', titulo.id)}
                auditEntity="Titulo"
                sortColumn={titulosTableFilters.sortColumn}
                sortDirection={titulosTableFilters.sortDirection}
                onSort={titulosTableFilters.setSort}
              />
            )}

            {/* Aba Observações */}
            {activeTab === "observacoes" && (
              <ObservacoesTab
                formData={formHook.formData}
                errors={formHook.errors}
                handleInputChange={formHook.handleInputChange}
                isSubmitting={formHook.isSubmitting}
                formPrefix={formPrefix}
              />
            )}

            {/* Aba Arquivos */}
            {activeTab === "arquivos" && (
              <ArquivosTab
                clienteId={effectiveClienteIdForParcelas}
                onAudit={(arquivo) => auditoria.handleAudit('ClienteArquivo', arquivo.id)}
                auditEntity="ClienteArquivo"
              />
            )}

            {hasModuloEquipamentos && activeTab === 'tunel' && (
              <ClienteTunelTab clienteId={effectiveClienteIdForParcelas} />
            )}

            {hasModuloEquipamentos && activeTab === 'ssh-devices' && (
              <ClienteSshDevicesTab clienteId={effectiveClienteIdForParcelas} />
            )}

            {hasModuloEquipamentos && activeTab === 'ssh-backups' && (
              <ClienteSshBackupsTab clienteId={effectiveClienteIdForParcelas} />
            )}

            {hasModuloRpki && activeTab === 'rpki-cas' && (
              <ClienteRpkiCasTab clienteId={effectiveClienteIdForParcelas} />
            )}

            {hasModuloRpki && activeTab === 'rpki-cas-pai' && (
              <ClienteRpkiCaPaiTab clienteId={effectiveClienteIdForParcelas} />
            )}

            {hasModuloRpki && activeTab === 'rpki-repositorios' && (
              <ClienteRpkiRepositoriosTab clienteId={effectiveClienteIdForParcelas} />
            )}

            {hasModuloRpki && activeTab === 'rpki-roas' && (
              <ClienteRpkiRoasTab clienteId={effectiveClienteIdForParcelas} />
            )}

            {hasModuloRpki && activeTab === 'rpki-aspas' && (
              <ClienteRpkiAspasTab clienteId={effectiveClienteIdForParcelas} />
            )}
          </div>
      </div>
    );
  };

  // Construir headerActions
  const clienteTabs = useMemo((): ModalTabItem[] => {
    const tabs: ModalTabItem[] = [
      { id: 'dados-basicos', label: t('tabs.basicData') },
      { id: 'contato', label: t('tabs.contact') },
      { id: 'endereco', label: t('tabs.address') },
      {
        id: 'contratos',
        label: t('tabs.contracts'),
        disabled: !canEditContratosFinanceiro,
      },
      {
        id: 'financeiro',
        label: t('tabs.financial'),
        disabled: !canEditContratosFinanceiro,
      },
      { id: 'observacoes', label: t('tabs.observations') },
      {
        id: 'arquivos',
        label: t('tabs.files'),
        disabled: !canEditContratosFinanceiro,
      },
    ];

    if (hasModuloRpki) {
      tabs.push(
        { id: 'rpki-cas', label: t('tabs.rpkiCas'), disabled: !canEditContratosFinanceiro },
        { id: 'rpki-cas-pai', label: t('tabs.rpkiCaPai'), disabled: !canEditContratosFinanceiro },
        { id: 'rpki-repositorios', label: t('tabs.rpkiRepositorios'), disabled: !canEditContratosFinanceiro },
        { id: 'rpki-roas', label: t('tabs.rpkiRoas'), disabled: !canEditContratosFinanceiro },
        { id: 'rpki-aspas', label: t('tabs.rpkiAspas'), disabled: !canEditContratosFinanceiro },
      );
    }

    if (hasModuloEquipamentos) {
      tabs.push(
        { id: 'tunel', label: t('tabs.tunnelAgents'), disabled: !canEditContratosFinanceiro },
        { id: 'ssh-devices', label: t('tabs.sshDevicesSection'), disabled: !canEditContratosFinanceiro },
        { id: 'ssh-backups', label: t('tabs.sshDeviceBackups'), disabled: !canEditContratosFinanceiro },
      );
    }

    return tabs;
  }, [canEditContratosFinanceiro, hasModuloEquipamentos, hasModuloRpki, t]);

  const headerActionsContent = useMemo(() => {
    const shouldRender =
      !(formHook.isLoadingCliente && formHook.isEditing) &&
      !(!formHook.cliente && formHook.isEditing);

    if (!shouldRender) return undefined;

    return (
      <div className="cliente-header-unified">
              {/* Botões à direita */}
              <ModalFormActions
                className="cliente-header-buttons modal-header-actions"
                onCancel={handleClose}
                isPending={formHook.isSubmitting}
                saveType="button"
                onSave={() => formHook.handleSubmit()}
              />

              {/* Abas na parte inferior do header */}
              <div className="cliente-header-tabs">
                <ModalTabsOverflow
                  tabs={clienteTabs}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  tabsClassName={`cliente-tabs-unified ${isMobile ? 'cliente-tabs-mobile' : ''}`}
                  disabledClassName="cliente-tab-disabled"
                  isMobile={isMobile}
                  id="clienteTabs"
                />
              </div>
            </div>
    );
  }, [formHook, clienteTabs, activeTab, isMobile, handleClose]);


  const renderModalContent = () => {
    // Renderizar com DraggableModal (modo standalone)
    return (
    <>
      <DraggableModal
        show={show}
        onClose={handleClose}
        title={modalTitle}
        size="xl"
        modalId={formHook.isEditing ? "cliente-edit-modal" : "cliente-create-modal"}
        headerActions={headerActionsContent}
      >
        {renderContent()}
      </DraggableModal>

      {/* Modais aninhados */}
      <TituloModal
            show={showTituloEditModal}
            tituloId={selectedTituloId || null}
            onClose={() => {
              setShowTituloEditModal(false);
              setSelectedTituloId(null);
              refetchParcelas();
            }}
            onSuccess={() => {
              refetchParcelas();
            }}
          />

          {/* Modal para receber */}
          <ReceberModal
            isOpen={showReceberModal}
            onClose={() => {
              setShowReceberModal(false);
              setSelectedParcela(null);
            }}
            parcela={selectedParcela ? {
              id: selectedParcela!.id,
              numero_titulo: (selectedParcela!.numero_titulo || selectedParcela!.numero_parcela || `${t('table.id')} ${selectedParcela!.id}`).toString(),
              valor_parcela: selectedParcela!.valor || selectedParcela!.valor_parcela,
              data_vencimento: selectedParcela!.data_vencimento,
              cliente: (selectedParcela!.cliente as { razao_social?: string })?.razao_social ? { razao_social: (selectedParcela!.cliente as { razao_social?: string }).razao_social! } : undefined
            } : null}
            onSuccess={() => {
              refetchParcelas();
            }}
          />

          {/* Modal de contrato (criação e edição unificados) */}
          <ContratoModal
            show={showContratoCreateModal || showContratoEditModal}
            clienteId={formHook.cliente?.id || formHook.createdClienteId || undefined}
            contratoId={showContratoEditModal ? selectedContratoId : null}
            onClose={() => {
              setShowContratoCreateModal(false);
              setShowContratoEditModal(false);
              setSelectedContratoId(null);
            }}
            onSuccess={() => {
              // Não fechar o modal automaticamente - permitir criar múltiplos contratos
            }}
          />

          {/* Modal de impressão */}
          <ImprimirModal
            show={impressaoHook.showImprimirModal}
            onClose={impressaoHook.handleCloseImprimirModal}
            pdfUrl={impressaoHook.pdfUrl}
            isGenerating={impressaoHook.isGeneratingPdf}
            title={t('modal.viewDocument')}
            modalId="cliente-imprimir-modal"
          />

          {/* Modal de Visualização de PDF de Auditoria */}
          <ImprimirModal
            show={auditoria.showPreview}
            onClose={auditoria.handleClosePreview}
            pdfUrl={auditoria.pdfUrl}
            isGenerating={auditoria.isGeneratingPdf}
            title={t('financial.executionLogs')}
            modalId="auditoria-cliente-modal"
          />

          {/* Modal de Gerar NFS-e Avulsa */}
          <GerarNFeModal
            show={showGerarNFeModal}
            onClose={() => {
              setShowGerarNFeModal(false);
              setSelectedTituloForNFe(null);
            }}
            cliente={formHook.cliente || undefined}
            titulo={selectedTituloForNFe || undefined}
            onSuccess={() => {
              refetchParcelas();
            }}
          />
    </>
    );
  };

  return (
    <>
      {renderModalContent()}
    </>
  );
};

export default ClienteModal;
