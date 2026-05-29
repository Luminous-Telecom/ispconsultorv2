import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { extractApiErrorMessage } from 'utils/apiErrorHelper';
import { useDeleteContrato, Contrato } from 'hooks/useContratos';
import { useEntityListModal } from 'hooks/useEntityListModal';
import { ContratoService } from 'services/contratoService';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import DocumentoSistemaService from 'services/documentoSistemaService';
import { formatDate, formatDateTime } from 'utils/formatters';
import { useImpressaoContrato } from 'hooks/useImpressaoContrato';
import ListModal from 'components/common/ListModal';
import { ListModalConfig } from 'types/modal';
import ContratoModal from 'components/modals/clientes/contrato/ContratoModal';
import ImprimirModal from 'components/common/ImprimirModal';
import { useIsMobile } from 'hooks/useMediaQuery';
import { useI18n } from 'contexts/I18nContext';
import { ContratoFilters } from 'services/contratoService';

type ContratoRow = Contrato & {
  cliente_razao_social?: string;
  plano_nome?: string;
  valor_plano_num?: number;
  desconto_num?: number;
  valor_final_num?: number;
};

interface ContratoListModalProps {
  show: boolean;
  onClose: () => void;
  onSelectContrato?: (contrato: Contrato) => void;
  title?: string;
  skipWrapper?: boolean;
  initialFilters?: Partial<ContratoFilters>;
}

const ContratoListModal: React.FC<ContratoListModalProps> = ({
  show,
  onClose,
  onSelectContrato,
  title = 'Contratos',
  skipWrapper = false,
  initialFilters,
}) => {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedContratoId, setSelectedContratoId] = useState<number | null>(null);
  const [showImprimirModal, setShowImprimirModal] = useState(false);
  const [pdfUrlLocal, setPdfUrlLocal] = useState<string | null>(null);
  const [isGeneratingPdfLocal, setIsGeneratingPdfLocal] = useState(false);

  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  const list = useEntityListModal<Contrato>({
    onClose,
    onSelect: onSelectContrato,
  });

  const impressaoHook = useImpressaoContrato({});

  const displayTitle = useMemo(() => {
    const tipoServicoLabels: Record<string, string> = {
      infraestrutura: t('form.serviceTypeInfrastructure'),
      consultoria: t('form.serviceTypeConsulting'),
      blockdomi: t('form.serviceTypeBlockdomi'),
    };
    let suffix = '';
    if (initialFilters?.em_atraso) {
      suffix = ` - ${t('status.inArrears')}`;
    } else if (initialFilters?.status) {
      const statusLabels: Record<string, string> = {
        ativo: t('status.active'),
        inativo: t('status.inactive'),
        suspenso: t('status.suspended'),
      };
      suffix = ` - ${statusLabels[initialFilters.status] || initialFilters.status}`;
    } else if (initialFilters?.isento_mensalidade) {
      suffix = ` - ${t('status.exempt')}`;
    } else if (initialFilters?.plano_id) {
      suffix = ` - ${t('table.plan')} #${initialFilters.plano_id}`;
    } else if (initialFilters?.tipo_servico) {
      suffix = ` - ${tipoServicoLabels[initialFilters.tipo_servico] || initialFilters.tipo_servico}`;
    }
    return title + suffix;
  }, [title, initialFilters, t]);

  const statusFilter =
    initialFilters?.em_atraso === true ? undefined : initialFilters?.status ?? 'ativo';
  const listFilters: ContratoFilters = {
    ...(initialFilters?.em_atraso === true && { em_atraso: true }),
    ...(statusFilter && { status: statusFilter }),
    ...(initialFilters?.excluir_em_atraso === true && { excluir_em_atraso: true }),
    ...(initialFilters?.isento_mensalidade !== undefined && {
      isento_mensalidade: initialFilters.isento_mensalidade,
    }),
    ...(initialFilters?.plano_id && { plano_id: initialFilters.plano_id }),
    ...(initialFilters?.tipo_servico && { tipo_servico: initialFilters.tipo_servico }),
  };

  const { data: contratosData, isLoading, refetch } = useQuery({
    queryKey: [
      'contratos',
      'list',
      list.tableFilters.page,
      list.tableFilters.limit,
      list.tableFilters.search,
      list.tableFilters.searchField,
      list.tableFilters.sortColumn,
      list.tableFilters.sortDirection,
      listFilters,
    ],
    queryFn: () =>
      ContratoService.list({
        page: list.tableFilters.page,
        limit: list.tableFilters.limit,
        search: list.tableFilters.search,
        searchField: list.tableFilters.searchField,
        sortColumn: list.tableFilters.sortColumn,
        sortDirection: list.tableFilters.sortDirection,
        ...listFilters,
      }),
    staleTime: 30 * 1000,
    refetchOnMount: false,
    enabled: show,
  });

  const contratos = useMemo(() => contratosData?.data || [], [contratosData]);

  const deleteContratoMutation = useDeleteContrato();

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        await deleteContratoMutation.mutateAsync(id);
        success('Contrato excluído com sucesso!');
        refetch();
      } catch (err: unknown) {
        showApiError(err, CONTEXT_ERROR_MESSAGES.CONTRACT_DELETE_ERROR);
      }
    },
    [deleteContratoMutation, success, refetch, showApiError]
  );

  const handleAudit = useCallback(
    (contrato: Contrato) => {
      list.auditoria.handleAudit('Contrato', contrato.id);
    },
    [list.auditoria]
  );

  const pagination = useMemo(
    () => list.buildPagination(contratosData?.pagination),
    [list, contratosData?.pagination]
  );

  const dataWithVirtualFields = useMemo((): ContratoRow[] => {
    if (!contratos) return [];

    return contratos.map((c: Contrato) => {
      let descontoValor = 0;
      if (c.desconto_valor && Number(c.desconto_valor) > 0) {
        descontoValor = Number(c.desconto_valor);
      } else if (
        c.desconto_percentual &&
        Number(c.desconto_percentual) > 0 &&
        c.plano?.valor_mensal
      ) {
        const valorPlano = Number(c.plano.valor_mensal);
        descontoValor = valorPlano * (Number(c.desconto_percentual) / 100);
      }

      return {
        ...c,
        cliente_razao_social: c.cliente?.razao_social || '',
        plano_nome: c.plano?.nome_plano || '',
        valor_plano_num: c.plano?.valor_mensal ? Number(c.plano.valor_mensal) : 0,
        desconto_num: descontoValor,
        valor_final_num: c.valor_final ? Number(c.valor_final) : 0,
      };
    });
  }, [contratos]);

  const valorTotalMensal = useMemo(() => {
    if (!contratos) return 0;

    return contratos.reduce((total, contrato) => {
      const valor = contrato.valor_final
        ? parseFloat(contrato.valor_final.toString())
        : contrato.plano?.valor_mensal
          ? parseFloat(contrato.plano.valor_mensal.toString())
          : 0;
      return total + valor;
    }, 0);
  }, [contratos]);

  const valorTotalDescontos = useMemo(() => {
    if (!contratos) return 0;

    return contratos.reduce((total, contrato) => {
      let desconto = 0;

      if (contrato.desconto_valor && Number(contrato.desconto_valor) > 0) {
        desconto = Number(contrato.desconto_valor);
      } else if (
        contrato.desconto_percentual &&
        Number(contrato.desconto_percentual) > 0 &&
        contrato.plano?.valor_mensal
      ) {
        const valorPlano = Number(contrato.plano.valor_mensal);
        desconto = valorPlano * (Number(contrato.desconto_percentual) / 100);
      }

      return total + desconto;
    }, 0);
  }, [contratos]);

  const formatCurrency = (value: number): string => {
    return `R$ ${value.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
  };

  const columns = useMemo(
    (): ListModalConfig<ContratoRow>['columns'] => [
      {
        key: 'id',
        label: 'ID',
        sortable: true,
        width: '42px',
        render: (item) => <span>{item.id}</span>,
      },
      {
        key: 'cliente_razao_social',
        label: 'Cliente',
        sortable: true,
        width: '200px',
        render: (item) => (
          <div>{item.cliente?.razao_social || item.cliente_razao_social || '-'}</div>
        ),
      },
      {
        key: 'endereco',
        label: 'Endereço',
        sortable: true,
        width: '180px',
        render: (item) => <span>{item.endereco || '-'}</span>,
      },
      {
        key: 'numero',
        label: 'Número',
        sortable: true,
        width: '70px',
        render: (item) => <span>{item.numero || '-'}</span>,
      },
      {
        key: 'complemento',
        label: 'Complemento',
        sortable: true,
        width: '120px',
        render: (item) => <span>{item.complemento || '-'}</span>,
      },
      {
        key: 'bairro',
        label: 'Bairro',
        sortable: true,
        width: '120px',
        render: (item) => <span>{item.bairro || '-'}</span>,
      },
      {
        key: 'cidade',
        label: 'Cidade',
        sortable: true,
        width: '130px',
        render: (item) => <span>{item.cidade || '-'}</span>,
      },
      {
        key: 'estado',
        label: 'Estado',
        sortable: true,
        width: '63px',
        render: (item) => <span>{item.estado || '-'}</span>,
      },
      {
        key: 'plano_nome',
        label: 'Plano',
        sortable: true,
        width: '140px',
        render: (item) => item.plano?.nome_plano || item.plano_nome || '-',
      },
      {
        key: 'valor_plano_num',
        label: 'Valor Plano',
        sortable: true,
        width: '90px',
        render: (item) =>
          item.plano?.valor_mensal
            ? `R$ ${Number(item.plano.valor_mensal).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`
            : '-',
      },
      {
        key: 'desconto_num',
        label: 'Desconto',
        sortable: true,
        width: '80px',
        render: (item) => {
          if (item.desconto_valor && Number(item.desconto_valor) > 0) {
            return `R$ ${Number(item.desconto_valor).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
          }
          if (
            item.desconto_percentual &&
            Number(item.desconto_percentual) > 0 &&
            item.plano?.valor_mensal
          ) {
            const valorPlano = Number(item.plano.valor_mensal);
            const descontoValor = valorPlano * (Number(item.desconto_percentual) / 100);
            return `R$ ${descontoValor.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
          }
          return '-';
        },
      },
      {
        key: 'valor_final_num',
        label: 'Valor Final',
        sortable: true,
        width: '82px',
        render: (item) =>
          item.valor_final
            ? `R$ ${Number(item.valor_final).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`
            : '-',
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        badgeLabels: ['Ativo', 'Inativo', 'Suspenso', 'Cancelado'],
        render: (item) => {
          const getStatusColor = (status: string) => {
            switch (status?.toLowerCase()) {
              case 'ativo':
                return 'bg-success';
              case 'inativo':
                return 'bg-danger';
              case 'suspenso':
                return 'bg-danger';
              case 'cancelado':
                return 'bg-secondary';
              default:
                return 'bg-warning text-dark';
            }
          };
          return (
            <span className={`badge ${getStatusColor(item.status || '')}`}>
              {item.status
                ? item.status.charAt(0).toUpperCase() + item.status.slice(1).toLowerCase()
                : '-'}
            </span>
          );
        },
      },
      {
        key: 'data_inicio',
        label: 'Data Início',
        sortable: true,
        width: '85px',
        render: (item) => formatDate(item.data_inicio),
      },
      {
        key: 'created_at',
        label: 'Criado em',
        sortable: true,
        width: '140px',
        render: (item) => {
          const row = item as ContratoRow & {
            created_at_formatada?: string | null;
            created_at?: string;
          };
          if (row.created_at_formatada) return row.created_at_formatada;
          return row.created_at ? formatDateTime(row.created_at) : '-';
        },
      },
    ],
    []
  );

  const searchFields = useMemo(
    () => [
      { key: 'id', label: 'ID' },
      { key: 'cliente_razao_social', label: 'Cliente' },
      { key: 'plano_nome', label: 'Plano' },
      { key: 'status', label: 'Status' },
      { key: 'valor_final_num', label: 'Valor Final' },
      { key: 'endereco', label: 'Endereço' },
      { key: 'cidade', label: 'Cidade' },
      { key: 'estado', label: 'Estado' },
    ],
    []
  );

  const bulkActions = useMemo(() => {
    if (onSelectContrato) {
      return [];
    }
    return [
      {
        label: 'Novo',
        variant: 'primary' as const,
        action: () => setShowCreateModal(true),
      },
      {
        label: 'Editar',
        variant: 'primary' as const,
        disabled: (selectedItems: Contrato[]) => selectedItems.length === 0,
        action: (selectedItems: Contrato[]) => {
          if (selectedItems.length > 0) {
            setSelectedContratoId(selectedItems[0].id);
            setShowEditModal(true);
          }
        },
      },
      {
        label: 'Deletar',
        variant: 'primary' as const,
        disabled: (selectedItems: Contrato[]) => selectedItems.length === 0,
        action: async (selectedItems: Contrato[]) => {
          if (selectedItems.length === 0) return;

          const confirmed = window.confirm(
            `Tem certeza que deseja deletar ${selectedItems.length} contrato(s)?`
          );
          if (confirmed) {
            for (const item of selectedItems) {
              await handleDelete(item.id);
            }
          }
        },
      },
      {
        label: 'Imprimir',
        variant: 'primary' as const,
        disabled: (selectedItems: Contrato[]) => selectedItems.length === 0,
        dropdown: [
          {
            label: 'Contrato',
            action: async (selectedItems?: Contrato[]) => {
              const items = selectedItems || [];
              if (items.length > 0) {
                const contrato = items[0];
                if (!contrato.cliente_id) {
                  showApiError('Contrato sem cliente associado');
                  return;
                }

                await impressaoHook.imprimirContrato(contrato.id, contrato.cliente_id);
              }
            },
          },
          {
            label: 'Termo de Adesão',
            action: async (selectedItems?: Contrato[]) => {
              const items = selectedItems || [];
              if (items.length > 0) {
                const contrato = items[0];

                if (!contrato.cliente_id) {
                  showApiError('Contrato sem cliente associado');
                  return;
                }

                setShowImprimirModal(true);
                setIsGeneratingPdfLocal(true);

                if (pdfUrlLocal) {
                  window.URL.revokeObjectURL(pdfUrlLocal);
                  setPdfUrlLocal(null);
                }

                try {
                  const modeloAdesao = await DocumentoSistemaService.getDefaultByType('contrato');

                  if (modeloAdesao.success && modeloAdesao.data) {
                    const modelosData = await DocumentoSistemaService.getModelosByModeloContrato(
                      modeloAdesao.data.id
                    );
                    const conteudoAdesao =
                      modelosData.data?.modelo_termo_adesao || modeloAdesao.data.conteudo;

                    if (!conteudoAdesao || conteudoAdesao.trim() === '') {
                      showApiError(
                        'Conteúdo do termo de adesão não encontrado. Verifique se o modelo possui conteúdo cadastrado.'
                      );
                      setShowImprimirModal(false);
                      setIsGeneratingPdfLocal(false);
                      return;
                    }

                    const pdfBlob = await DocumentoSistemaService.generateTestPdfWithContent(
                      modeloAdesao.data.id,
                      contrato.cliente_id,
                      conteudoAdesao
                    );

                    const url = window.URL.createObjectURL(pdfBlob);
                    setPdfUrlLocal(url);
                    setIsGeneratingPdfLocal(false);

                    success('Termo de Adesão gerado com sucesso!');
                  } else {
                    showApiError('Nenhum modelo de contrato encontrado. Cadastre um modelo primeiro.');
                    setShowImprimirModal(false);
                    setIsGeneratingPdfLocal(false);
                  }
                } catch (err) {
                  const showApiErrorMessage = await extractApiErrorMessage(err, {
                    defaultMessage: CONTEXT_ERROR_MESSAGES.CONTRACT_TERM_ADESAO_ERROR,
                    handleBlobResponse: true,
                    customStatusMessages: {
                      404: CONTEXT_ERROR_MESSAGES.CONTRACT_MODEL_NOT_FOUND,
                      500: CONTEXT_ERROR_MESSAGES.CONTRACT_TERM_ADESAO_SERVER_ERROR,
                    },
                  });
                  showApiError(showApiErrorMessage);
                  setShowImprimirModal(false);
                  setIsGeneratingPdfLocal(false);
                }
              }
            },
          },
          {
            label: 'Contrato Permanência',
            action: async (selectedItems?: Contrato[]) => {
              const items = selectedItems || [];
              if (items.length > 0) {
                const contrato = items[0];

                if (!contrato.cliente_id) {
                  showApiError('Contrato sem cliente associado');
                  return;
                }

                setShowImprimirModal(true);
                setIsGeneratingPdfLocal(true);

                if (pdfUrlLocal) {
                  window.URL.revokeObjectURL(pdfUrlLocal);
                  setPdfUrlLocal(null);
                }

                try {
                  const modeloPermanencia =
                    await DocumentoSistemaService.getDefaultByType('contrato');

                  if (modeloPermanencia.success && modeloPermanencia.data) {
                    const modelosData = await DocumentoSistemaService.getModelosByModeloContrato(
                      modeloPermanencia.data.id
                    );
                    const conteudoPermanencia =
                      modelosData.data?.modelo_contrato_permanencia || modeloPermanencia.data.conteudo;

                    if (!conteudoPermanencia || conteudoPermanencia.trim() === '') {
                      showApiError(
                        'Conteúdo do contrato de permanência não encontrado. Verifique se o modelo possui conteúdo cadastrado.'
                      );
                      setShowImprimirModal(false);
                      setIsGeneratingPdfLocal(false);
                      return;
                    }

                    const pdfBlob = await DocumentoSistemaService.generateTestPdfWithContent(
                      modeloPermanencia.data.id,
                      contrato.cliente_id,
                      conteudoPermanencia
                    );

                    const url = window.URL.createObjectURL(pdfBlob);
                    setPdfUrlLocal(url);
                    setIsGeneratingPdfLocal(false);

                    success('Contrato de Permanência gerado com sucesso!');
                  } else {
                    showApiError('Nenhum modelo de contrato encontrado. Cadastre um modelo primeiro.');
                    setShowImprimirModal(false);
                    setIsGeneratingPdfLocal(false);
                  }
                } catch (err) {
                  const showApiErrorMessage = await extractApiErrorMessage(err, {
                    defaultMessage: CONTEXT_ERROR_MESSAGES.CONTRACT_PERMANENCE_ERROR,
                    handleBlobResponse: true,
                    customStatusMessages: {
                      404: CONTEXT_ERROR_MESSAGES.CONTRACT_MODEL_NOT_FOUND,
                      500: CONTEXT_ERROR_MESSAGES.CONTRACT_PERMANENCE_SERVER_ERROR,
                    },
                  });
                  showApiError(showApiErrorMessage);
                  setShowImprimirModal(false);
                  setIsGeneratingPdfLocal(false);
                }
              }
            },
          },
        ],
      },
    ];
  }, [onSelectContrato, impressaoHook, pdfUrlLocal, showApiError, success, handleDelete]);

  const handleRowSelect = useCallback(
    (item: Contrato) => {
      onSelectContrato?.(item);
      onClose();
    },
    [onSelectContrato, onClose]
  );

  const hasResumo = show && dataWithVirtualFields.length > 0;

  const listModal = (
    <ListModal<ContratoRow>
      show={show}
      onClose={list.handleModalClose}
      skipWrapper={skipWrapper}
      config={{
        title: displayTitle,
        columns,
        searchPlaceholder: '',
        searchFields,
        emptyMessage: 'Nenhum contrato encontrado',
      }}
      data={dataWithVirtualFields}
      loading={isLoading}
      search={list.tableFilters.search}
      onSearchChange={list.handleSearchChange}
      sortColumn={list.tableFilters.sortColumn}
      sortDirection={list.tableFilters.sortDirection}
      onSortChange={list.tableFilters.setSort}
      pagination={pagination}
      onPageChange={list.tableFilters.setPage}
      onLimitChange={list.tableFilters.setLimit}
      onRefresh={refetch}
      bulkActions={bulkActions}
      onSelectionChange={list.handleSelectionChange}
      onRowClick={onSelectContrato ? handleRowSelect : undefined}
      onRowDoubleClick={onSelectContrato ? handleRowSelect : undefined}
      onAudit={handleAudit}
      auditEntity="Contrato"
      tableId="contrato-list-modal"
      modalId="contrato-list-modal"
    />
  );

  const resumo = hasResumo ? (
    <div
      className="p-3 bg-light rounded contrato-totais-resumo"
      style={{
        flexShrink: 0,
        marginTop: isMobile ? '0.25rem' : '0.5rem',
        marginBottom: 0,
        marginLeft: isMobile ? '0.5rem' : '1rem',
        marginRight: isMobile ? '0.5rem' : '1rem',
      }}
    >
      <div className="d-flex flex-wrap gap-2 gap-md-4 justify-content-end">
        <div className="text-end">
          <div className="small text-muted">{t('summary.monthlyTotalValue')} (Página)</div>
          <strong>{formatCurrency(valorTotalMensal)}</strong>
        </div>
        <div className="text-end">
          <div className="small text-muted">{t('summary.totalDiscountsValue')} (Página)</div>
          <strong>{formatCurrency(valorTotalDescontos)}</strong>
        </div>
      </div>
    </div>
  ) : null;

  const auxiliaryModals = (
    <>
      <ContratoModal
        show={showCreateModal || showEditModal}
        clienteId={undefined}
        contratoId={showEditModal ? selectedContratoId : null}
        onClose={() => {
          setShowCreateModal(false);
          setShowEditModal(false);
          setSelectedContratoId(null);
        }}
        onSuccess={() => {
          refetch();
        }}
      />

      <ImprimirModal
        show={impressaoHook.showModal || showImprimirModal}
        onClose={() => {
          if (impressaoHook.showModal) {
            impressaoHook.limparPdfUrl();
          }
          setShowImprimirModal(false);
          if (pdfUrlLocal) {
            window.URL.revokeObjectURL(pdfUrlLocal);
            setPdfUrlLocal(null);
          }
        }}
        pdfUrl={impressaoHook.pdfUrl || pdfUrlLocal || null}
        isGenerating={impressaoHook.isGeneratingPdf || isGeneratingPdfLocal}
        title="Visualizar Documento"
        modalId="contrato-list-imprimir-modal"
      />

      <ImprimirModal
        show={list.auditoria.showPreview}
        onClose={list.auditoria.handleClosePreview}
        pdfUrl={list.auditoria.pdfUrl}
        isGenerating={list.auditoria.isGeneratingPdf}
        title="Relatórios de logs"
        modalId="auditoria-contrato-modal"
      />
    </>
  );

  return (
    <>
      {listModal}
      {resumo}
      {auxiliaryModals}
    </>
  );
};

export default ContratoListModal;
