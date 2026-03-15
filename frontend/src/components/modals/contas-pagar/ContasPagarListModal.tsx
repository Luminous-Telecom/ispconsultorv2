import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useContasPagar, useDeleteContaPagar, useDuplicarContaPagar } from 'hooks/useContasPagar';
import { useFornecedores } from 'hooks/useFornecedores';
import { useModalSelect } from 'hooks/useModalSelect';
import { useTableFilters } from 'hooks/useTableFilters';
import { useAuditoria } from 'hooks/useAuditoria';
import { useIsMobile } from 'hooks/useMediaQuery';
import { useI18n } from 'contexts/I18nContext';
import { formatDateTime, formatDate, formatCurrency } from 'utils/formatters';
import { ContaPagar, ContaPagarFilters } from 'types';
import Table from 'components/tables/Table';
import { TableConfig } from 'components/tables/types';
import ImprimirModal from 'components/common/ImprimirModal';
import DraggableModal from 'components/common/DraggableModal';
import ContaPagarModal from './ContaPagarModal';
import { useConfirmModal } from 'hooks/useConfirmModal';
import ConfirmModal from 'components/modals/ConfirmModal';

interface ContasPagarListModalProps {
  show: boolean;
  onClose: () => void;
  onSelectContaPagar?: (contaPagar: ContaPagar) => void;
  title?: string;
  skipWrapper?: boolean;
  initialFilters?: Partial<ContaPagarFilters>;
}

const ContasPagarListModal: React.FC<ContasPagarListModalProps> = ({ 
  show, 
  onClose, 
  onSelectContaPagar,
  title,
  skipWrapper = false,
  initialFilters
}) => {
  const { t } = useI18n();
  const defaultTitle = title || t('financial.accountsPayable');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPagamentoModal, setShowPagamentoModal] = useState(false);
  const [selectedContaPagarId, setSelectedContaPagarId] = useState<number | null>(null);
  
  // Sem filtro de data por padrão - exibe todos os registros (ao abrir do dashboard aplica initialFilters)
  const [dataVencimentoInicio, setDataVencimentoInicio] = useState<string>('');
  const [dataVencimentoFim, setDataVencimentoFim] = useState<string>('');
  const isMobile = useIsMobile();

  // Quando abre do dashboard com initialFilters de data
  React.useEffect(() => {
    if (show && initialFilters?.data_inicio && initialFilters?.data_fim) {
      setDataVencimentoInicio(initialFilters.data_inicio);
      setDataVencimentoFim(initialFilters.data_fim);
    }
  }, [show, initialFilters?.data_inicio, initialFilters?.data_fim]);

  
  // Hook de auditoria
  const auditoria = useAuditoria();
  const { modalProps } = useConfirmModal();

  // Hook unificado para filtros, busca e paginação
  const tableFilters = useTableFilters<ContaPagarFilters>({
    initialSearch: '',
    initialPage: 1,
    initialLimit: 15,
    searchDebounceMs: 300,
    resetPageOnFilterChange: true,
    initialFilters: {
      status: undefined,
      tipo_pagamento: undefined,
      fornecedor_id: undefined,
      data_inicio: undefined,
      data_fim: undefined,
    } as ContaPagarFilters,
  });
  const { setPage } = tableFilters;

  // Buscar fornecedores para o filtro
  const { data: fornecedoresData } = useFornecedores({ limit: 1000 });
  const fornecedoresOptions = useMemo(() => {
    if (!fornecedoresData?.data) return [];
    return fornecedoresData.data.map(fornecedor => ({
      value: fornecedor.id?.toString() || '',
      label: fornecedor.nome_razao_social || fornecedor.nome_fantasia || `Fornecedor ${fornecedor.id}`
    }));
  }, [fornecedoresData]);
  
  // Usar hook customizado para gerenciar seleção
  const {
    selectedItem,
    handleSelectionChange,
    clearSelection
  } = useModalSelect<ContaPagar>(
    onSelectContaPagar ? (contaPagar) => {
      onSelectContaPagar(contaPagar);
      onClose();
    } : undefined
  );


  // Função para obter badge de status
  const getStatusBadge = (status: ContaPagar['status']) => {
    const statusMap = {
      'A_PAGAR': { label: t('financial.toPay'), className: 'bg-warning' },
      'PAGO': { label: t('financial.paid'), className: 'bg-success' },
      'PARCIAL': { label: t('status.pending'), className: 'bg-info' },
      'CANCELADO': { label: t('status.rejected'), className: 'bg-secondary' }
    };
    const statusInfo = statusMap[status] || { label: status, className: 'bg-secondary' };
    return (
      <span className={`badge ${statusInfo.className}`}>
        {statusInfo.label}
      </span>
    );
  };

  // Função para obter badge de tipo de pagamento
  const getTipoPagamentoBadge = (tipo: ContaPagar['tipo_pagamento']) => {
    const tipoMap: Record<string, string> = {
      'DINHEIRO': t('form.paymentTypeCash'),
      'BOLETO': t('form.paymentTypeBoleto'),
      'CARTAO': t('form.paymentTypeCard'),
      'DEPOSITO': t('form.paymentTypeDeposit'),
      'DEBITO_CONTA': t('form.paymentTypeDebit'),
      'TRANSFERENCIA': t('form.paymentTypeTransfer'),
      'PIX': t('form.paymentTypePix')
    };
    return tipoMap[tipo] || tipo;
  };

  const filters = [
    {
      key: 'fornecedor_id',
      label: t('table.supplier'),
      type: 'select' as const,
      options: fornecedoresOptions,
      placeholder: t('placeholder.selectProvider')
    },
    {
      key: 'data_inicio',
      label: t('form.dueDateStart'),
      type: 'date' as const,
      placeholder: t('placeholder.startDate')
    },
    {
      key: 'data_fim',
      label: t('form.dueDateEnd'),
      type: 'date' as const,
      placeholder: t('placeholder.endDate')
    },
    {
      key: 'status',
      label: t('table.status'),
      type: 'select' as const,
      options: [
        { value: 'A_PAGAR', label: t('financial.toPay') },
        { value: 'PAGO', label: t('financial.paid') },
        { value: 'PARCIAL', label: t('status.pending') },
        { value: 'CANCELADO', label: t('status.rejected') }
      ],
      placeholder: t('ui.selectOption')
    },
    {
      key: 'tipo_pagamento',
      label: t('form.paymentType'),
      type: 'select' as const,
      options: [
        { value: 'DINHEIRO', label: t('form.paymentTypeCash') },
        { value: 'BOLETO', label: t('form.paymentTypeBoleto') },
        { value: 'CARTAO', label: t('form.paymentTypeCard') },
        { value: 'DEPOSITO', label: t('form.paymentTypeDeposit') },
        { value: 'DEBITO_CONTA', label: t('form.paymentTypeDebit') },
        { value: 'TRANSFERENCIA', label: t('form.paymentTypeTransfer') },
        { value: 'PIX', label: t('form.paymentTypePix') }
      ],
      placeholder: t('placeholder.selectType')
    }
  ];

  // Configurar colunas para Table
  const tableColumns: TableConfig<ContaPagar & { created_at?: string; created_at_formatada?: string | null }>['columns'] = [
      {
        key: 'id',
        label: t('table.id'),
        sortable: true,
        width: '42px',
        render: (item: ContaPagar) => <span className="text-nowrap">{item.id ?? '-'}</span>
      },
      {
        key: 'fornecedor',
        label: t('table.supplier'),
        sortable: true,
        render: (item: ContaPagar) => (
          item.fornecedor?.nome_razao_social || '-'
        )
      },
      {
        key: 'data_vencimento',
        label: t('table.dueDate'),
        sortable: true,
        width: '130px',
        render: (item: ContaPagar) => (
          <span className="text-nowrap">
            {item.data_vencimento ? formatDate(item.data_vencimento) : '-'}
          </span>
        )
      },
      {
        key: 'valor',
        label: t('table.value'),
        sortable: true,
        width: '130px',
        render: (item: ContaPagar) => (
          <span className="text-nowrap">{formatCurrency(item.valor || 0)}</span>
        )
      },
      {
        key: 'valor_pago',
        label: t('table.paidValue'),
        sortable: true,
        width: '130px',
        render: (item: ContaPagar) => (
          <span className="text-nowrap">{formatCurrency(item.valor_pago || 0)}</span>
        )
      },
      {
        key: 'saldo_devedor',
        label: t('table.balanceDue'),
        sortable: true,
        width: '130px',
        render: (item: ContaPagar) => {
          const valor = typeof item.valor === 'number' ? item.valor : parseFloat(String(item.valor || 0));
          const valorPago = typeof item.valor_pago === 'number' ? item.valor_pago : parseFloat(String(item.valor_pago || 0));
          const saldo = valor - valorPago;
          return (
            <span className={`text-nowrap ${saldo > 0 ? 'text-danger' : 'text-success'}`}>
              {formatCurrency(saldo)}
            </span>
          );
        }
      },
      {
        key: 'status',
        label: t('table.status'),
        sortable: true,
        badgeLabels: [t('financial.toPay'), t('financial.paid'), t('status.pending'), t('status.rejected')],
        render: (item: ContaPagar) => getStatusBadge(item.status)
      },
      {
        key: 'tipo_pagamento',
        label: t('table.paymentType'),
        sortable: true,
        width: '150px',
        render: (item: ContaPagar) => (
          <span className="text-nowrap">{getTipoPagamentoBadge(item.tipo_pagamento)}</span>
        )
      },
      {
        key: 'numero_documento',
        label: t('table.documentNumber'),
        sortable: true,
        width: '150px',
        render: (item: ContaPagar) => (
          <span className="text-nowrap">{item.numero_documento || '-'}</span>
        )
      },
      {
        key: 'descricao',
        label: t('table.description'),
        sortable: true,
        width: '200px',
        render: (item: ContaPagar) => (
          <span className="text-nowrap" title={item.descricao || ''}>
            {item.descricao ? (item.descricao.length > 50 ? `${item.descricao.substring(0, 50)}...` : item.descricao) : '-'}
          </span>
        )
      },
      {
        key: 'data_pagamento',
        label: t('table.paymentDate'),
        sortable: true,
        width: '130px',
        render: (item: ContaPagar) => (
          <span className="text-nowrap">
            {item.data_pagamento ? formatDate(item.data_pagamento) : '-'}
          </span>
        )
      },
      {
        key: 'created_at',
        label: t('table.createdAt'),
        sortable: true,
        width: '150px',
        render: (item: ContaPagar & { created_at?: string; created_at_formatada?: string | null }) => {
          if (item.created_at_formatada) {
            return item.created_at_formatada;
          }
          return item.created_at ? formatDateTime(item.created_at) : '-';
        }
      }
    ];

  const searchFields = [
    { key: 'id', label: t('table.id') },
    { key: 'numero_documento', label: t('table.documentNumber') },
    { key: 'nota_fiscal', label: t('form.invoiceNumber') },
    { key: 'fornecedor', label: t('table.supplier') },
    { key: 'vencimento', label: t('table.dueDate') },
    { key: 'valor', label: t('table.value') },
    { key: 'status', label: t('table.status') },
    { key: 'tipo', label: t('form.paymentType') }
  ];

  // Resetar página quando filtros de data mudarem
  useEffect(() => {
    setPage(1);
  }, [dataVencimentoInicio, dataVencimentoFim, setPage]);

  // Preparar filtros para a API
  const apiFilters = useMemo(() => {
    const filters: ContaPagarFilters = {
      ...(tableFilters.filters.status && { status: tableFilters.filters.status as ContaPagarFilters['status'] }),
      ...(tableFilters.filters.tipo_pagamento && { tipo_pagamento: tableFilters.filters.tipo_pagamento as ContaPagarFilters['tipo_pagamento'] }),
      ...(tableFilters.filters.fornecedor_id && { fornecedor_id: String(tableFilters.filters.fornecedor_id) }),
      ...(dataVencimentoInicio && { data_inicio: dataVencimentoInicio }),
      ...(dataVencimentoFim && { data_fim: dataVencimentoFim })
    };
    
    return filters;
  }, [tableFilters.filters, dataVencimentoInicio, dataVencimentoFim]);

  const handleLimitChange = useCallback((limit: number) => {
    tableFilters.setLimit(limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableFilters.setLimit]);

  // Hook para buscar contas a pagar usando parâmetros do useTableFilters
  const { data: contasPagarData, isLoading, refetch } = useContasPagar({
    search: tableFilters.debouncedSearch || undefined,
    searchField: tableFilters.searchField || undefined,
    page: tableFilters.page,
    limit: tableFilters.limit,
    sortColumn: tableFilters.sortColumn || undefined,
    sortDirection: tableFilters.sortDirection || undefined,
    ...apiFilters
  });

  // Calcular resumo financeiro baseado nos dados filtrados
  const resumoFinanceiro = useMemo(() => {
    const contas = (contasPagarData?.data || []).filter(item => item.id != null);
    
    const valorTotal = contas.reduce((sum, item) => {
      return sum + Number(item.valor || 0);
    }, 0);

    const valorBaixado = contas.reduce((sum, item) => {
      const valorPago = Number(item.valor_pago || 0);
      if (valorPago > 0) {
        return sum + valorPago;
      }
      return sum;
    }, 0);

    const valorAberto = contas.reduce((sum, item) => {
      if (item.status === 'PAGO' || item.status === 'CANCELADO') {
        return sum;
      }
      const valor = Number(item.valor || 0);
      const valorPago = Number(item.valor_pago || 0);
      const valorAberto = valor - valorPago;
      return sum + (valorAberto > 0 ? valorAberto : 0);
    }, 0);

    const valorTotalPago = contas.reduce((sum, item) => {
      if (item.status === 'PAGO') {
        return sum + Number(item.valor || 0);
      }
      return sum;
    }, 0);

    const valorCancelado = contas.reduce((sum, item) => {
      if (item.status === 'CANCELADO') {
        return sum + Number(item.valor || 0);
      }
      return sum;
    }, 0);

    return {
      valorTotal,
      valorBaixado,
      valorAberto,
      valorTotalPago,
      valorCancelado
    };
  }, [contasPagarData?.data]);

  const deleteContaPagarMutation = useDeleteContaPagar();
  const duplicarContaPagarMutation = useDuplicarContaPagar();

  const handleSelect = (selectedItems?: ContaPagar[]) => {
    const item = selectedItems && selectedItems.length > 0 ? selectedItems[0] : selectedItem;
    if (item) {
      clearSelection();
      if (onSelectContaPagar) {
        onSelectContaPagar(item);
        onClose();
      }
    }
  };

  const handleDelete = async (contaPagarId: number) => {
    try {
      await deleteContaPagarMutation.mutateAsync(contaPagarId);
      refetch();
    } catch (error) {
      // Erro já tratado pelo hook
    }
  };

  const handleDuplicar = async (contaPagarId: number) => {
    try {
      await duplicarContaPagarMutation.mutateAsync(contaPagarId);
      refetch();
    } catch (error) {
      // Erro já tratado pelo hook
    }
  };

  const handleAudit = (contaPagar: ContaPagar) => {
    auditoria.handleAudit('ContaPagar', contaPagar.id);
  };

  // Paginação do backend
  const pagination = useMemo(() => {
    if (contasPagarData?.pagination && typeof contasPagarData.pagination === 'object') {
      const pag = contasPagarData.pagination;
      const total = pag.total ?? 0;
      const perPage = pag.per_page ?? tableFilters.limit;
      const currentPage = pag.current_page ?? tableFilters.page;
      
      // Calcular last_page se não estiver definido
      let lastPage = pag.last_page;
      if (!lastPage && total > 0) {
        lastPage = Math.max(1, Math.ceil(total / perPage));
      } else if (!lastPage) {
        lastPage = 1;
      }
      
      return {
        current_page: currentPage,
        last_page: lastPage,
        per_page: perPage,
        total: total,
        from: pag.from ?? ((currentPage - 1) * perPage) + 1,
        to: pag.to ?? Math.min(currentPage * perPage, total)
      };
    }
    return {
      current_page: tableFilters.page,
      last_page: 1,
      per_page: tableFilters.limit,
      total: 0,
      from: 0,
      to: 0
    };
  }, [contasPagarData?.pagination, tableFilters.page, tableFilters.limit]);

  // Bulk actions
  const bulkActions = onSelectContaPagar ? [
    {
      label: t('buttons.cancel'),
      variant: 'primary' as const,
      action: () => {
        clearSelection();
        onClose();
      }
    },
    {
      label: t('actions.insert'),
      variant: 'primary' as const,
      disabled: (selectedItems: ContaPagar[]) => selectedItems.length === 0 && !selectedItem,
      action: (selectedItems: ContaPagar[]) => handleSelect(selectedItems)
    }
  ] : [
    {
      label: t('actions.new'),
      variant: 'primary' as const,
      action: () => setShowCreateModal(true)
    },
    {
      label: t('buttons.edit'),
      variant: 'primary' as const,
      disabled: (selectedItems: ContaPagar[]) => selectedItems.length === 0,
      action: (selectedItems: ContaPagar[]) => {
        const item = selectedItems.length > 0 ? selectedItems[0] : selectedItem;
        if (item) {
          setSelectedContaPagarId(item.id);
          setShowEditModal(true);
        }
      }
    },
    {
      label: t('actions.pay'),
      variant: 'primary' as const,
      disabled: (selectedItems: ContaPagar[]) => {
        const item = selectedItems.length > 0 ? selectedItems[0] : selectedItem;
        return !item || item.status === 'PAGO' || item.status === 'CANCELADO';
      },
      action: (selectedItems: ContaPagar[]) => {
        const item = selectedItems.length > 0 ? selectedItems[0] : selectedItem;
        if (item) {
          setSelectedContaPagarId(item.id);
          setShowPagamentoModal(true);
        }
      }
    },
    {
      label: t('actions.duplicate'),
      variant: 'primary' as const,
      disabled: (selectedItems: ContaPagar[]) => selectedItems.length === 0,
      action: (selectedItems: ContaPagar[]) => {
        const item = selectedItems.length > 0 ? selectedItems[0] : selectedItem;
        if (item) {
          handleDuplicar(item.id);
        }
      }
    },
    {
      label: t('buttons.delete'),
      disabled: (selectedItems: ContaPagar[]) => selectedItems.length === 0,
      action: async (selectedItems: ContaPagar[]) => {
        const item = selectedItems.length > 0 ? selectedItems[0] : selectedItem;
        if (!item) return;
        
        const confirmed = window.confirm(t('messages.confirmDeleteAccountPayable'));
        if (confirmed) {
          handleDelete(item.id);
        }
      }
    }
  ];

  const handleSearchChange = useCallback((search: string, field?: string) => {
    setTimeout(() => {
      tableFilters.setSearch(search);
      if (field) tableFilters.setSearchField(field);
    }, 0);
  }, [tableFilters]);

  const modalData = useMemo(() => (contasPagarData?.data || []).filter(item => item.id != null), [contasPagarData?.data]);
  const hasResumo = show && modalData.length > 0;
  
  const modalContent = (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        <Table
          title={defaultTitle}
          config={{
            columns: tableColumns,
            data: modalData,
            loading: isLoading,
            searchable: true,
            searchPlaceholder: t('layout.searchPlaceholder'),
            searchFields,
            sortable: true,
            sortColumn: tableFilters.sortColumn,
            sortDirection: tableFilters.sortDirection,
            striped: true,
            hover: true,
            responsive: true,
            selectable: true,
            multiSelect: false,
            filters,
            bulkActions: bulkActions.map(action => ({
              key: action.label.toLowerCase().replace(/\s+/g, '-'),
              label: action.label,
              onClick: action.action,
              disabled: action.disabled,
              variant: action.variant
            })),
            emptyMessage: 'Nenhuma conta a pagar encontrada',
            pagination: pagination,
            customControlsAfterActions: (
              <div className="d-flex align-items-center gap-2">
                <label htmlFor="dataVencimentoInicio" className="form-label mb-0 small">{t('filter.startDate')}</label>
                <input
                  type="date"
                  id="dataVencimentoInicio"
                  className="form-control form-control-sm table-pagination-filter"
                  value={dataVencimentoInicio}
                  onChange={(e) => {
                    setTimeout(() => {
                      setDataVencimentoInicio(e.target.value);
                    }, 0);
                  }}
                />
                <label htmlFor="dataVencimentoFim" className="form-label mb-0 small">{t('filter.endDate')}</label>
                <input
                  type="date"
                  id="dataVencimentoFim"
                  className="form-control form-control-sm table-pagination-filter"
                  value={dataVencimentoFim}
                  onChange={(e) => {
                    setTimeout(() => {
                      setDataVencimentoFim(e.target.value);
                    }, 0);
                  }}
                />
              </div>
            )
          }}
          tableId="contas-pagar-list-modal"
          onSelectionChange={(items) => {
            handleSelectionChange(items);
          }}
          onRowClick={onSelectContaPagar ? (item) => {
            onSelectContaPagar(item);
            onClose();
          } : undefined}
          onRefresh={refetch}
          onAudit={handleAudit}
          auditEntity="ContaPagar"
          onPageChange={(page) => {
            setTimeout(() => {
              tableFilters.setPage(page);
            }, 0);
          }}
          onPageSizeChange={handleLimitChange}
          onSort={(column, direction) => {
            setTimeout(() => {
              tableFilters.setSort(column, direction);
            }, 0);
          }}
          onSearch={(search, field) => handleSearchChange(search, field)}
          onSearchFieldChange={(field) => {
            setTimeout(() => tableFilters.setSearchField(field), 0);
          }}
          search={tableFilters.search}
          syncWithHeader={false}
          onFilter={(filters) => {
            setTimeout(() => {
              const convertedFilters: Partial<ContaPagarFilters> = {};
              Object.entries(filters).forEach(([key, value]) => {
                convertedFilters[key as keyof ContaPagarFilters] = Array.isArray(value) ? (value[0] || null) : (value as string | number | boolean | null | undefined);
              });
              tableFilters.setFilters(convertedFilters);
            }, 0);
          }}
        />
      </div>

      {/* Resumo Financeiro - Fixo no final do modal */}
      {hasResumo && (
        <div className="d-flex justify-content-end align-items-center p-3 bg-light financeiro-resumo" style={{ flexShrink: 0, marginTop: isMobile ? '0.25rem' : '0.5rem', marginBottom: 0, marginLeft: isMobile ? '0.5rem' : '1rem', marginRight: isMobile ? '0.5rem' : '1rem' }}>
          <div className="d-flex flex-wrap gap-2 gap-md-4 justify-content-end">
            <div className="text-end">
              <div className="small text-muted">{t('summary.value')}</div>
              <strong>{formatCurrency(resumoFinanceiro.valorTotal)}</strong>
            </div>
            <div className="text-end">
              <div className="small text-muted">{t('summary.paidValue')}</div>
              <strong>{formatCurrency(resumoFinanceiro.valorBaixado)}</strong>
            </div>
            <div className="text-end">
              <div className="small text-muted">{t('summary.openValue')}</div>
              <strong>{formatCurrency(resumoFinanceiro.valorAberto)}</strong>
            </div>
            <div className="text-end">
              <div className="small text-muted">{t('summary.totalPaidValue')}</div>
              <strong>{formatCurrency(resumoFinanceiro.valorTotalPago)}</strong>
            </div>
            <div className="text-end">
              <div className="small text-muted">{t('summary.canceledValue')}</div>
              <strong>{formatCurrency(resumoFinanceiro.valorCancelado)}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const modals = (
    <>
      {showCreateModal && (
        <ContaPagarModal
          show={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => refetch()}
        />
      )}

      {showEditModal && selectedContaPagarId && (
        <ContaPagarModal
          show={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedContaPagarId(null);
          }}
          contaPagarId={selectedContaPagarId}
          onSuccess={() => refetch()}
        />
      )}
    </>
  );



  if (skipWrapper) {
    return (
      <>
        {modalContent}
        {modals}
        
        <ContaPagarModal
          key={`pagamento-manual-${selectedContaPagarId || 'none'}`}
          show={showPagamentoModal}
          onClose={() => {
            setShowPagamentoModal(false);
            setSelectedContaPagarId(null);
          }}
          contaPagarId={selectedContaPagarId}
          onSuccess={() => {
            refetch();
          }}
          showPagamentoOnOpen={true}
        />

        {/* Modal de Visualização de PDF de Auditoria */}
        <ImprimirModal
          show={auditoria.showPreview}
          onClose={auditoria.handleClosePreview}
          pdfUrl={auditoria.pdfUrl}
          isGenerating={auditoria.isGeneratingPdf}
          title={t('financial.executionLogs')}
          modalId="auditoria-conta-pagar-modal"
        />
      </>
    );
  }

  return (
    <>
      <DraggableModal
        show={show}
        onClose={() => {
          clearSelection();
          onClose();
        }}
        title={defaultTitle}
        size="lg"
        className="no-padding"
      >
        {modalContent}
      </DraggableModal>

      {modals}

      <ContaPagarModal
        key={`pagamento-manual-${selectedContaPagarId || 'none'}`}
        show={showPagamentoModal}
        onClose={() => {
          setShowPagamentoModal(false);
          setSelectedContaPagarId(null);
        }}
        contaPagarId={selectedContaPagarId}
        onSuccess={() => {
          refetch();
        }}
        showPagamentoOnOpen={true}
      />

      {/* Modal de Visualização de PDF de Auditoria */}
      <ImprimirModal
        show={auditoria.showPreview}
        onClose={auditoria.handleClosePreview}
        pdfUrl={auditoria.pdfUrl}
        isGenerating={auditoria.isGeneratingPdf}
        title={t('financial.executionLogs')}
        modalId="auditoria-conta-pagar-modal"
      />

      {/* ConfirmModal */}
      {modalProps && <ConfirmModal {...modalProps} />}
    </>
  );
};

export default ContasPagarListModal;
