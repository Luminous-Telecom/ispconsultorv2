import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useContasPagar, useDeleteContaPagar, useDuplicarContaPagar } from '@/hooks/useContasPagar';
import { useFornecedores } from '@/hooks/useFornecedores';
import { useModalSelect } from '@/hooks/useModalSelect';
import { useListModal } from '@/hooks/useListModal';
import { useTableFilters } from '@/hooks/useTableFilters';
import { useAuditoria } from '@/hooks/useAuditoria';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useI18n } from '@/contexts/I18nContext';
import { formatDateTime, formatDate, formatCurrency } from '@/utils/formatters';
import { ContaPagar, ContaPagarFilters } from '@/types';
import ListModal from '@/components/common/ListModal';
import ImprimirModal from '@/components/common/ImprimirModal';
import DraggableModal from '@/components/common/DraggableModal';
import ContaPagarModal from './ContaPagarModal';
import { useConfirmModal } from '@/hooks/useConfirmModal';
import ConfirmModal from '@/components/modals/ConfirmModal';

interface ContasPagarListModalProps {
  show: boolean;
  onClose: () => void;
  onSelectContaPagar?: (contaPagar: ContaPagar) => void;
  title?: string;
  skipWrapper?: boolean;
}

const ContasPagarListModal: React.FC<ContasPagarListModalProps> = ({ 
  show, 
  onClose, 
  onSelectContaPagar,
  title,
  skipWrapper: _skipWrapper 
}) => {
  const { t } = useI18n();
  const defaultTitle = title || t('financial.accountsPayable');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPagamentoModal, setShowPagamentoModal] = useState(false);
  const [selectedContaPagarId, setSelectedContaPagarId] = useState<number | null>(null);
  const [searchField, setSearchField] = useState<string>('numero_documento');
  const [dataVencimentoInicio, setDataVencimentoInicio] = useState<string>('');
  const [dataVencimentoFim, setDataVencimentoFim] = useState<string>('');
  const isMobile = useIsMobile();

  
  // Hook de auditoria
  const auditoria = useAuditoria();
  const { confirm, modalProps } = useConfirmModal();

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
      'DINHEIRO': 'Dinheiro',
      'BOLETO': 'Boleto',
      'CARTAO': 'Cartão',
      'DEPOSITO': 'Depósito',
      'DEBITO_CONTA': 'Débito em Conta',
      'TRANSFERENCIA': 'Transferência',
      'PIX': 'PIX'
    };
    return tipoMap[tipo] || tipo;
  };

  // Configurar modal centralizado
  const modal = useListModal({
    title: defaultTitle,
    filters: [
      {
        key: 'fornecedor_id',
        label: 'Fornecedor',
        type: 'select',
        options: fornecedoresOptions,
        placeholder: 'Selecione o fornecedor'
      },
      {
        key: 'data_inicio',
        label: 'Vencimento Inicial',
        type: 'date',
        placeholder: 'Data inicial'
      },
      {
        key: 'data_fim',
        label: 'Vencimento Final',
        type: 'date',
        placeholder: 'Data final'
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: 'A_PAGAR', label: t('financial.toPay') },
          { value: 'PAGO', label: t('financial.paid') },
          { value: 'PARCIAL', label: t('status.pending') },
          { value: 'CANCELADO', label: 'Cancelado' }
        ],
        placeholder: t('ui.selectOption')
      },
      {
        key: 'tipo_pagamento',
        label: 'Tipo',
        type: 'select',
        options: [
          { value: 'DINHEIRO', label: 'Dinheiro' },
          { value: 'BOLETO', label: 'Boleto' },
          { value: 'CARTAO', label: 'Cartão' },
          { value: 'DEPOSITO', label: 'Depósito' },
          { value: 'DEBITO_CONTA', label: 'Débito em Conta' },
          { value: 'TRANSFERENCIA', label: 'Transferência' },
          { value: 'PIX', label: 'PIX' }
        ],
        placeholder: 'Selecione o tipo'
      }
    ],
    columns: [
      {
        key: 'id',
        label: 'ID',
        sortable: true,
        width: '42px',
        render: (item: ContaPagar) => <span className="text-nowrap">{item.id ?? '-'}</span>
      },
      {
        key: 'fornecedor',
        label: 'Fornecedor',
        sortable: true,
        render: (item: ContaPagar) => (
          item.fornecedor?.nome_razao_social || '-'
        )
      },
      {
        key: 'data_vencimento',
        label: 'Vencimento',
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
        label: 'Valor',
        sortable: true,
        width: '130px',
        render: (item: ContaPagar) => (
          <span className="text-nowrap">{formatCurrency(item.valor || 0)}</span>
        )
      },
      {
        key: 'valor_pago',
        label: 'Valor Pago',
        sortable: true,
        width: '130px',
        render: (item: ContaPagar) => (
          <span className="text-nowrap">{formatCurrency(item.valor_pago || 0)}</span>
        )
      },
      {
        key: 'saldo_devedor',
        label: 'Saldo Devedor',
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
        label: 'Status',
        sortable: true,
        width: '120px',
        render: (item: ContaPagar) => getStatusBadge(item.status)
      },
      {
        key: 'tipo_pagamento',
        label: 'Tipo Pagamento',
        sortable: true,
        width: '150px',
        render: (item: ContaPagar) => (
          <span className="text-nowrap">{getTipoPagamentoBadge(item.tipo_pagamento)}</span>
        )
      },
      {
        key: 'numero_documento',
        label: 'Nº Documento',
        sortable: true,
        width: '150px',
        render: (item: ContaPagar) => (
          <span className="text-nowrap">{item.numero_documento || '-'}</span>
        )
      },
      {
        key: 'descricao',
        label: 'Descrição',
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
        label: 'Data Pagamento',
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
        label: 'Criado em',
        sortable: true,
        width: '150px',
        render: (item: ContaPagar & { created_at?: string; created_at_formatada?: string | null }) => {
          if (item.created_at_formatada) {
            return item.created_at_formatada;
          }
          return item.created_at ? formatDateTime(item.created_at) : '-';
        }
      }
    ],
    searchPlaceholder: 'Buscar...',
    searchFields: [
      { key: 'numero_documento', label: 'Nº Documento' },
      { key: 'nota_fiscal', label: 'Nota Fiscal' },
      { key: 'fornecedor', label: 'Fornecedor' },
      { key: 'vencimento', label: 'Vencimento' },
      { key: 'valor', label: 'Valor' },
      { key: 'status', label: 'Status' },
      { key: 'tipo', label: 'Tipo' }
    ],
    multiSelect: false
  });

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

  // Hook para buscar contas a pagar usando parâmetros do useTableFilters
  const { data: contasPagarData, isLoading, refetch } = useContasPagar({
    search: tableFilters.debouncedSearch || undefined,
    searchField: searchField || undefined,
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
      label: 'Cancelar',
      variant: 'secondary' as const,
      action: () => {
        clearSelection();
        onClose();
      }
    },
    {
      label: 'Inserir',
      variant: 'primary' as const,
      disabled: (selectedItems: ContaPagar[]) => selectedItems.length === 0 && !selectedItem,
      action: (selectedItems: ContaPagar[]) => handleSelect(selectedItems)
    }
  ] : [
    {
      label: 'Novo',
      variant: 'primary' as const,
      action: () => setShowCreateModal(true)
    },
    {
      label: 'Editar',
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
      label: 'Pagar',
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
      label: 'Duplicar',
      variant: 'secondary' as const,
      disabled: (selectedItems: ContaPagar[]) => selectedItems.length === 0,
      action: (selectedItems: ContaPagar[]) => {
        const item = selectedItems.length > 0 ? selectedItems[0] : selectedItem;
        if (item) {
          handleDuplicar(item.id);
        }
      }
    },
    {
      label: 'Excluir',
      disabled: (selectedItems: ContaPagar[]) => selectedItems.length === 0,
      action: async (selectedItems: ContaPagar[]) => {
        const item = selectedItems.length > 0 ? selectedItems[0] : selectedItem;
        if (!item) return;
        
        const confirmed = await confirm({
          message: 'Tem certeza que deseja excluir esta conta a pagar?',
          variant: 'danger',
          title: 'Excluir conta a pagar',
          confirmText: 'Excluir',
          cancelText: 'Cancelar',
        });
        
        if (confirmed) {
          handleDelete(item.id);
        }
      }
    }
  ];

  const handleSearchChange = useCallback((search: string, field?: string) => {
    // Usar setTimeout para evitar atualização durante render cycle
    setTimeout(() => {
      tableFilters.setSearch(search);
      if (field) setSearchField(field);
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableFilters.setSearch]);

  const modalContent = (
    <div className="row" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', margin: 0 }}>
      <div className="col-12" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 0 }}>
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          <ListModal
            show={show}
            onClose={() => {
              clearSelection();
              onClose();
            }}
            config={modal.config}
            data={(contasPagarData?.data || []).filter(item => item.id != null)}
            loading={isLoading}
            selectedItems={selectedItem ? [selectedItem] : []}
            onSelectionChange={handleSelectionChange}
            search={tableFilters.search}
            onSearchChange={handleSearchChange}
            onSearchFieldChange={setSearchField}
            filters={modal.config.filters}
            filterValues={tableFilters.filters}
            onFilterChange={(key, value) => {
              const convertedValue = Array.isArray(value) ? (value[0] || null) : value;
              tableFilters.setFilter(key as keyof ContaPagarFilters, convertedValue as string | number | boolean | null | undefined);
            }}
            onFiltersChange={(filters) => {
              const convertedFilters: Partial<ContaPagarFilters> = {};
              Object.entries(filters).forEach(([key, value]) => {
                convertedFilters[key as keyof ContaPagarFilters] = Array.isArray(value) ? (value[0] || null) : (value as string | number | boolean | null | undefined);
              });
              tableFilters.setFilters(convertedFilters);
            }}
            onClearFilters={() => {
              tableFilters.resetFilters();
            }}
            pagination={pagination}
            onPageChange={tableFilters.setPage}
            limit={tableFilters.limit}
            onLimitChange={tableFilters.setLimit}
            refreshQueryKeys={['contas-pagar']}
            refreshQueryFn={refetch}
            bulkActions={bulkActions}
            onAudit={handleAudit}
            auditEntity="ContaPagar"
            skipWrapper={true}
            customControlsAfterActions={
              <div className="d-flex align-items-center gap-2">
                <label htmlFor="dataVencimentoInicio" className="form-label mb-0 small">Data Inicial:</label>
                <input
                  type="date"
                  id="dataVencimentoInicio"
                  className="form-control form-control-sm table-pagination-filter"
                  value={dataVencimentoInicio}
                  onChange={(e) => setDataVencimentoInicio(e.target.value)}
                />
                <label htmlFor="dataVencimentoFim" className="form-label mb-0 small">Data Final:</label>
                <input
                  type="date"
                  id="dataVencimentoFim"
                  className="form-control form-control-sm table-pagination-filter"
                  value={dataVencimentoFim}
                  onChange={(e) => setDataVencimentoFim(e.target.value)}
                />
              </div>
            }
          />
        </div>

        {/* Resumo Financeiro - Fora do container com scroll, fixo no final */}
        {show && (contasPagarData?.data || []).filter(item => item.id != null).length > 0 && (
          <div className="d-flex justify-content-end align-items-center p-3 bg-light financeiro-resumo" style={{ flexShrink: 0, marginTop: isMobile ? '0.25rem' : '1rem', marginBottom: isMobile ? '3rem' : '1rem', marginLeft: isMobile ? '0.5rem' : '1rem', marginRight: isMobile ? '0.5rem' : '1rem' }}>
            <div className="d-flex flex-wrap gap-2 gap-md-4 justify-content-end">
              <div className="text-end">
                <div className="small text-muted">Valor:</div>
                <strong>{formatCurrency(resumoFinanceiro.valorTotal)}</strong>
              </div>
              <div className="text-end">
                <div className="small text-muted">Valor baixado:</div>
                <strong>{formatCurrency(resumoFinanceiro.valorBaixado)}</strong>
              </div>
              <div className="text-end">
                <div className="small text-muted">Valor aberto:</div>
                <strong>{formatCurrency(resumoFinanceiro.valorAberto)}</strong>
              </div>
              <div className="text-end">
                <div className="small text-muted">Valor total pago:</div>
                <strong>{formatCurrency(resumoFinanceiro.valorTotalPago)}</strong>
              </div>
              <div className="text-end">
                <div className="small text-muted">Valor cancelado:</div>
                <strong>{formatCurrency(resumoFinanceiro.valorCancelado)}</strong>
              </div>
            </div>
          </div>
        )}
      </div>
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



  if (_skipWrapper) {
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
        title="Relatórios de logs"
        modalId="auditoria-conta-pagar-modal"
      />

      {/* ConfirmModal */}
      {modalProps && <ConfirmModal {...modalProps} />}
    </>
  );
};

export default ContasPagarListModal;
