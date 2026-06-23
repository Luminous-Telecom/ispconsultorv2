import React, { useCallback, useMemo, useState } from 'react';
import { useFornecedores, useDeleteFornecedor } from 'hooks/useFornecedores';
import { useEntityListModal } from 'hooks/useEntityListModal';
import { useI18n } from 'contexts/I18nContext';
import { formatDateTime } from 'utils/formatters';
import { Fornecedor } from 'types';
import ListModal from 'components/common/ListModal';
import { ListModalConfig } from 'types/modal';
import FornecedorModal from './FornecedorModal';
import ImprimirModal from 'components/common/ImprimirModal';

interface FornecedorListModalProps {
  show: boolean;
  onClose: () => void;
  onSelectFornecedor?: (fornecedor: Fornecedor) => void;
  title?: string;
  skipWrapper?: boolean;
}

const FornecedorListModal: React.FC<FornecedorListModalProps> = ({
  show,
  onClose,
  onSelectFornecedor,
  title,
  skipWrapper = false,
}) => {
  const { t } = useI18n();
  const defaultTitle = title || t('menu.suppliers');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedFornecedorId, setSelectedFornecedorId] = useState<number | null>(null);

  const list = useEntityListModal<Fornecedor>({
    onClose,
    onSelect: onSelectFornecedor,
    initialSearchField: 'nome_razao_social',
  });

  const { data: fornecedoresData, isLoading, refetch } = useFornecedores({
    search: list.tableFilters.debouncedSearch || undefined,
    searchField: list.tableFilters.searchField || undefined,
    page: list.tableFilters.page,
    limit: list.tableFilters.limit,
    sortColumn: list.tableFilters.sortColumn,
    sortDirection: list.tableFilters.sortDirection,
  });

  const deleteFornecedorMutation = useDeleteFornecedor();

  const handleDelete = useCallback(
    async (fornecedorId: number) => {
      try {
        await deleteFornecedorMutation.mutateAsync(fornecedorId);
        refetch();
      } catch {
        // Erro já tratado pelo hook
      }
    },
    [deleteFornecedorMutation, refetch]
  );

  const handleAudit = useCallback(
    (fornecedor: Fornecedor) => {
      list.auditoria.handleAudit('Fornecedor', fornecedor.id);
    },
    [list.auditoria]
  );

  const columns = useMemo(
    (): ListModalConfig<Fornecedor>['columns'] => [
      {
        key: 'id',
        label: t('table.id'),
        sortable: true,
        width: '42px',
        render: (item) => <span className="text-nowrap">{item.id ?? '-'}</span>,
      },
      {
        key: 'tipo_pessoa',
        label: t('table.personTypeShort'),
        sortable: true,
        width: '90px',
        render: (item) => (
          <span className={`badge ${item.tipo_pessoa === 'JURIDICA' ? 'bg-info' : 'bg-primary'}`}>
            {item.tipo_pessoa === 'JURIDICA'
              ? t('table.personTypeLegalShort')
              : t('table.personTypePhysicalShort')}
          </span>
        ),
      },
      {
        key: 'nome_razao_social',
        label: t('table.nameCompanyNameShort'),
        sortable: true,
        width: '200px',
        render: (item) => item.nome_razao_social,
      },
      {
        key: 'nome_fantasia',
        label: t('table.tradeNameShort'),
        width: '180px',
        sortable: true,
        render: (item) => <span className="text-muted">{item.nome_fantasia || '-'}</span>,
      },
      {
        key: 'cpf_cnpj',
        label: t('table.cpfCnpj'),
        sortable: true,
        width: '150px',
        render: (item) => <span className="text-nowrap">{item.cpf_cnpj}</span>,
      },
      {
        key: 'cep',
        label: t('table.zipCodeShort'),
        sortable: true,
        width: '120px',
        render: (item) => <span className="text-nowrap">{item.cep || '-'}</span>,
      },
      {
        key: 'logradouro',
        label: t('table.streetShort'),
        sortable: true,
        render: (item) => <span>{item.logradouro || '-'}</span>,
      },
      {
        key: 'numero',
        label: t('table.number'),
        sortable: true,
        width: '100px',
        render: (item) => <span>{item.numero || '-'}</span>,
      },
      {
        key: 'complemento',
        label: t('table.complement'),
        sortable: true,
        render: (item) => <span>{item.complemento || '-'}</span>,
      },
      {
        key: 'bairro',
        label: t('table.neighborhood'),
        sortable: true,
        render: (item) => <span>{item.bairro || '-'}</span>,
      },
      {
        key: 'cidade',
        label: t('table.city'),
        sortable: true,
        render: (item) => <span>{item.cidade || '-'}</span>,
      },
      {
        key: 'estado',
        label: t('table.state'),
        sortable: true,
        width: '80px',
        render: (item) => <span>{item.estado || '-'}</span>,
      },
      {
        key: 'pais',
        label: t('table.country'),
        sortable: true,
        width: '100px',
        render: (item) => <span>{item.pais || '-'}</span>,
      },
      {
        key: 'created_at',
        label: t('table.createdAt'),
        sortable: true,
        width: '130px',
        render: (item) => {
          const row = item as Fornecedor & { created_at_formatada?: string | null; created_at?: string };
          if (row.created_at_formatada) return row.created_at_formatada;
          return row.created_at ? formatDateTime(row.created_at) : '-';
        },
      },
    ],
    [t]
  );

  const searchFields = useMemo(
    () => [
      { key: 'id', label: t('table.id') },
      { key: 'nome_razao_social', label: t('table.nameCompanyNameShort') },
      { key: 'nome_fantasia', label: t('table.tradeNameShort') },
      { key: 'cpf_cnpj', label: t('table.cpfCnpj') },
      { key: 'cep', label: t('table.zipCodeShort') },
      { key: 'logradouro', label: t('table.streetShort') },
      { key: 'bairro', label: t('table.neighborhood') },
      { key: 'cidade', label: t('table.city') },
      { key: 'estado', label: t('table.state') },
      { key: 'pais', label: t('table.country') },
    ],
    [t]
  );

  const bulkActions = useMemo(() => {
    if (onSelectFornecedor) {
      return list.buildSelectBulkActions();
    }
    return list.buildCrudBulkActions({
      onNew: () => setShowCreateModal(true),
      onEdit: (item) => {
        setSelectedFornecedorId(item.id);
        setShowEditModal(true);
      },
      onDelete: handleDelete,
    });
  }, [onSelectFornecedor, list, handleDelete]);

  const pagination = useMemo(
    () => list.buildPagination(fornecedoresData?.pagination),
    [list, fornecedoresData?.pagination]
  );

  const modalData = useMemo(
    () => (fornecedoresData?.data ?? [] as Fornecedor[]).filter((item: Fornecedor) => item.id != null),
    [fornecedoresData?.data]
  );

  const handleRowSelect = useCallback(
    (item: Fornecedor) => {
      onSelectFornecedor?.(item);
      onClose();
    },
    [onSelectFornecedor, onClose]
  );

  const listModal = (
    <ListModal<Fornecedor>
      show={show}
      onClose={list.handleModalClose}
      skipWrapper={skipWrapper}
      config={{
        title: defaultTitle,
        columns,
        searchPlaceholder: t('layout.searchPlaceholder'),
        searchField: 'nome_razao_social',
        searchFields,
        emptyMessage: 'Nenhum fornecedor encontrado',
      }}
      data={modalData}
      loading={isLoading}
      search={list.tableFilters.search}
      onSearchChange={list.handleSearchChange}
      onSearchFieldChange={list.handleSearchFieldChange}
      sortColumn={list.tableFilters.sortColumn}
      sortDirection={list.tableFilters.sortDirection}
      onSortChange={list.tableFilters.setSort}
      pagination={pagination}
      onPageChange={list.tableFilters.setPage}
      onLimitChange={list.tableFilters.setLimit}
      onRefresh={refetch}
      bulkActions={bulkActions}
      onSelectionChange={list.handleSelectionChange}
      onRowDoubleClick={onSelectFornecedor ? handleRowSelect : undefined}
      onAudit={handleAudit}
      auditEntity="Fornecedor"
      tableId="fornecedores-list-modal"
      modalId="fornecedores-list-modal"
    />
  );

  const auxiliaryModals = (
    <>
      {showCreateModal && (
        <FornecedorModal
          show={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            refetch();
          }}
        />
      )}

      {showEditModal && selectedFornecedorId && (
        <FornecedorModal
          show={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedFornecedorId(null);
          }}
          fornecedorId={selectedFornecedorId}
          onSuccess={() => {
            refetch();
          }}
        />
      )}

      <ImprimirModal
        show={list.auditoria.showPreview}
        onClose={list.auditoria.handleClosePreview}
        pdfUrl={list.auditoria.pdfUrl}
        isGenerating={list.auditoria.isGeneratingPdf}
        title={t('financial.executionLogs')}
        modalId="auditoria-fornecedor-modal"
      />
    </>
  );

  if (skipWrapper) {
    return (
      <>
        {listModal}
        {auxiliaryModals}
      </>
    );
  }

  return (
    <>
      {listModal}
      {auxiliaryModals}
    </>
  );
};

export default FornecedorListModal;
