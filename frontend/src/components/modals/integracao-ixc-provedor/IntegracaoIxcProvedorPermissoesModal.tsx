import React, { useCallback, useEffect, useMemo, useState } from 'react';
import DraggableModal from 'components/common/DraggableModal';
import EmbeddedTablePanel from 'components/common/EmbeddedTablePanel';
import { Spinner, useBulkBtn } from 'components/ui';
import { TableConfig } from 'components/tables/types';
import { useI18n } from 'contexts/I18nContext';
import { useTableFilters } from 'hooks/useTableFilters';
import {
  type IxcApiPermissionsCheckResult,
  type IxcPermissionCellValue,
  type IxcPermissionFormRow,
} from 'services/integracaoIxcProvedorService';
import IntegracaoIxcProvedorPermissoesDadosModal from './IntegracaoIxcProvedorPermissoesDadosModal';

interface IntegracaoIxcProvedorPermissoesModalProps {
  show: boolean;
  onClose: () => void;
  integracaoId?: number | null;
  integracaoNome?: string;
  result: IxcApiPermissionsCheckResult | null;
  isLoading?: boolean;
  error?: string | null;
  onReload?: () => void;
}

function permissionCell(value: IxcPermissionCellValue) {
  if (value === 'liberado') {
    return (
      <span className="badge bg-success d-block w-100 py-1" style={{ fontSize: '0.7rem' }}>
        Liberado
      </span>
    );
  }
  if (value === 'bloqueado') {
    return (
      <span className="badge bg-danger d-block w-100 py-1" style={{ fontSize: '0.7rem' }}>
        Bloqueado
      </span>
    );
  }
  return <span className="small text-muted">—</span>;
}

function permissionColumn(
  key: 'menu' | 'listar',
  label: string
): TableConfig<IxcPermissionFormRow>['columns'][number] {
  return {
    key,
    label,
    sortable: true,
    width: '88px',
    headerAlign: 'center',
    align: 'center',
    badgeLabels: ['Liberado', 'Bloqueado'],
    sortValue: (row) => row[key] ?? '',
    render: (item) => permissionCell(item[key]),
  };
}

const IntegracaoIxcProvedorPermissoesModal: React.FC<IntegracaoIxcProvedorPermissoesModalProps> = ({
  show,
  onClose,
  integracaoId,
  integracaoNome,
  result,
  isLoading = false,
  error = null,
  onReload,
}) => {
  const { t } = useI18n();
  const bulkBtn = useBulkBtn();
  const title = integracaoNome ? `Permissões IXC — ${integracaoNome}` : 'Permissões IXC Provedor';
  const isInitialLoading = isLoading && !result && !error;

  const [dadosModalRow, setDadosModalRow] = useState<IxcPermissionFormRow | null>(null);
  const [showDadosModal, setShowDadosModal] = useState(false);

  const tableFilters = useTableFilters({
    initialPage: 1,
    initialLimit: 20,
    initialSortColumn: 'formulario',
    initialSortDirection: 'asc',
    searchDebounceMs: 300,
    resetPageOnFilterChange: true,
  });

  useEffect(() => {
    if (show) {
      tableFilters.resetAll();
    } else {
      setShowDadosModal(false);
      setDadosModalRow(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset ao abrir/fechar
  }, [show]);

  const rows = useMemo(() => result?.items ?? [], [result?.items]);

  const handleOpenDados = useCallback((selectedItems: IxcPermissionFormRow[]) => {
    const row = selectedItems[0];
    if (!row || integracaoId == null) return;
    setDadosModalRow(row);
    setShowDadosModal(true);
  }, [integracaoId]);

  const handleCloseDadosModal = useCallback(() => {
    setShowDadosModal(false);
    setDadosModalRow(null);
  }, []);

  const bulkActions = useMemo(
    () => [
      {
        key: 'fechar',
        label: bulkBtn.fechar.label,
        variant: bulkBtn.fechar.variant,
        requiresSelection: false,
        onClick: () => onClose(),
      },
      ...(onReload
        ? [
            {
              key: 'recarregar',
              label: bulkBtn.recarregar.label,
              variant: bulkBtn.recarregar.variant,
              requiresSelection: false,
              disabled: () => isLoading,
              onClick: () => onReload(),
            },
          ]
        : []),
      {
        key: 'visualizar',
        label: t('audit.data'),
        variant: bulkBtn.visualizar.variant,
        disabled: (selectedItems: IxcPermissionFormRow[]) =>
          selectedItems.length !== 1 || selectedItems[0].dados == null,
        onClick: handleOpenDados,
      },
    ],
    [
      bulkBtn.fechar.label,
      bulkBtn.fechar.variant,
      bulkBtn.recarregar.label,
      bulkBtn.recarregar.variant,
      bulkBtn.visualizar.variant,
      handleOpenDados,
      isLoading,
      onClose,
      onReload,
      t,
    ]
  );

  const columns = useMemo((): TableConfig<IxcPermissionFormRow>['columns'] => [
    {
      key: 'formulario',
      label: 'Cadastro',
      sortable: true,
      width: '160px',
      render: (item) => <span className="small">{item.formulario}</span>,
    },
    {
      key: 'dados',
      label: 'Dados',
      sortable: true,
      width: '72px',
      headerAlign: 'center',
      align: 'center',
      sortValue: (row) => row.dados ?? -1,
      render: (item) => <span className="small">{item.dados != null ? item.dados : '—'}</span>,
    },
    permissionColumn('menu', 'Menu'),
    permissionColumn('listar', 'Listar'),
  ], []);

  return (
    <>
      <DraggableModal
        show={show}
        onClose={onClose}
        title={title}
        size="xl"
        modalId="integracao-ixc-provedor-permissoes-modal"
        className="no-padding list-modal-no-body-scroll"
      >
        {isInitialLoading ? (
          <div className="d-flex justify-content-center align-items-center py-5">
            <Spinner size="md" />
          </div>
        ) : error && !result ? (
          <div className="alert alert-danger m-3 mb-0">{error}</div>
        ) : result ? (
          <div className="list-modal-table-wrapper">
            {error && <div className="alert alert-danger m-3 mb-0">{error}</div>}
            <div className="list-modal-scroll-wrapper">
              <EmbeddedTablePanel<IxcPermissionFormRow>
                layoutWrapper={false}
                className="no-padding"
                config={{
                  columns,
                  data: rows,
                  loading: isLoading,
                  searchable: true,
                  searchPlaceholder: 'Buscar cadastro...',
                  searchField: tableFilters.searchField || 'formulario',
                  searchFields: [{ key: 'formulario', label: 'Cadastro' }],
                  sortable: true,
                  sortColumn: tableFilters.sortColumn,
                  sortDirection: tableFilters.sortDirection,
                  striped: true,
                  hover: true,
                  responsive: true,
                  selectable: true,
                  multiSelect: false,
                  bulkActions: bulkActions.map((action) => ({
                    key: action.key,
                    label: action.label,
                    onClick: action.onClick,
                    disabled: action.disabled,
                    variant: action.variant,
                    requiresSelection: action.requiresSelection,
                  })),
                  emptyMessage: 'Nenhuma permissão verificada',
                }}
                tableId="integracao-ixc-permissoes"
                onPageChange={(page) => tableFilters.setPage(page)}
                onPageSizeChange={(limit) => tableFilters.setLimit(limit)}
                onSort={(column, direction) => tableFilters.setSort(column, direction)}
                onSearch={(search, field) => {
                  tableFilters.setSearch(search);
                  if (field) tableFilters.setSearchField(field);
                }}
                onSearchFieldChange={(field) => tableFilters.setSearchField(field)}
                search={tableFilters.search}
              />
            </div>
          </div>
        ) : (
          <p className="text-muted mb-0 p-3">Nenhum resultado.</p>
        )}
      </DraggableModal>

      <IntegracaoIxcProvedorPermissoesDadosModal
        show={showDadosModal}
        onClose={handleCloseDadosModal}
        integracaoId={integracaoId}
        row={dadosModalRow}
      />
    </>
  );
};

export default IntegracaoIxcProvedorPermissoesModal;
