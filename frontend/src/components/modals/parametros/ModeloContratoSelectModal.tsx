import React, { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useModalSelect } from 'hooks/useModalSelect';
import { useTableFilters } from 'hooks/useTableFilters';
import { formatDate } from 'utils/formatters';
import DocumentoSistemaService, { DocumentoSistema } from 'services/documentoSistemaService';
import DraggableModal from 'components/common/DraggableModal';
import EmbeddedTablePanel from 'components/common/EmbeddedTablePanel';
import { TableConfig } from 'components/tables/types';
import { useI18n } from 'contexts/I18nContext';

interface ModeloContratoSelectModalProps {
  show: boolean;
  onClose: () => void;
  onSelect?: (modelo: DocumentoSistema) => void;
  title?: string;
}

const ModeloContratoSelectModal: React.FC<ModeloContratoSelectModalProps> = ({ 
  show, 
  onClose, 
  onSelect,
  title
}) => {
  const { t } = useI18n();
  const defaultTitle = title || t('modal.selectContractModel');
  // Hook unificado para filtros, busca e paginação
  const tableFilters = useTableFilters({
    initialSearch: '',
    initialPage: 1,
    initialLimit: 15,
    searchDebounceMs: 300,
    resetPageOnFilterChange: true,
  });

  // Usar hook customizado para gerenciar seleção
  const {
    selectedItem,
    handleSelectionChange,
    clearSelection
  } = useModalSelect<DocumentoSistema>(
    onSelect ? (modelo) => {
      onSelect(modelo);
      onClose();
    } : undefined
  );

  const tableColumns: TableConfig<DocumentoSistema>['columns'] = useMemo(() => [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
      width: '42px',
      render: (item: DocumentoSistema) => <span>{item.id}</span>
    },
    {
      key: 'nome',
      label: 'Nome',
      sortable: true,
      render: (item: DocumentoSistema) => item.nome
    },
    {
      key: 'descricao',
      label: 'Descrição',
      sortable: true,
      render: (item: DocumentoSistema) => (
        <span className="text-truncate" style={{ maxWidth: '300px' }} title={item.descricao || ''}>
          {item.descricao || '-'}
        </span>
      )
    },
    {
      key: 'created_at',
      label: 'Criado em',
      sortable: true,
      width: '150px',
      render: (item: DocumentoSistema) => (
        <span>{formatDate(item.created_at)}</span>
      )
    }
  ], []);

  // Query para buscar modelos de contrato
  const { data: modelosData, isLoading, refetch } = useQuery({
    queryKey: ['modelos-documento', 'contrato'],
    queryFn: () => DocumentoSistemaService.getByType('contrato'),
    enabled: show,
  });

  const handleSelect = useCallback((selectedItems?: DocumentoSistema[]) => {
    const item = selectedItems && selectedItems.length > 0 ? selectedItems[0] : selectedItem;
    if (item) {
      clearSelection();
      if (onSelect) {
        onSelect(item);
        onClose();
      }
    }
  }, [selectedItem, clearSelection, onSelect, onClose]);

  const bulkActions = useMemo(() => onSelect ? [
    {
      label: 'Cancelar',
      variant: 'primary' as const,
      action: () => {
        clearSelection();
        onClose();
      }
    },
    {
      label: 'Inserir',
      variant: 'primary' as const,
      disabled: (selectedItems: DocumentoSistema[]) => selectedItems.length === 0 && !selectedItem,
      action: (selectedItems: DocumentoSistema[]) => handleSelect(selectedItems)
    }
  ] : [], [onSelect, selectedItem, clearSelection, onClose, handleSelect]);

  const modalData = useMemo(() => modelosData?.data || [], [modelosData?.data]);

  const handleSearchChange = useCallback((search: string, field?: string) => {
    setTimeout(() => {
      tableFilters.setSearch(search);
      if (field) tableFilters.setSearchField(field);
    }, 0);
  }, [tableFilters]);

  return (
    <DraggableModal
      show={show}
      onClose={() => {
        clearSelection();
        onClose();
      }}
      title={defaultTitle}
      size="lg"
      modalId="modelo-contrato-select-modal"
      className="no-padding"
    >
      <EmbeddedTablePanel
            title={defaultTitle}
            config={{
              columns: tableColumns,
              data: modalData,
              loading: isLoading,
              searchable: true,
              searchPlaceholder: '',
              sortable: true,
              sortColumn: tableFilters.sortColumn,
              sortDirection: tableFilters.sortDirection,
              striped: true,
              hover: true,
              responsive: true,
              selectable: true,
              multiSelect: false,
              bulkActions: bulkActions.map(action => ({
                key: action.label.toLowerCase().replace(/\s+/g, '-'),
                label: action.label,
                onClick: action.action,
                disabled: action.disabled,
                variant: action.variant
              })),
              emptyMessage: 'Nenhum modelo encontrado',
              pagination: undefined
            }}
            tableId="modelo-contrato-select-table"
            onSelectionChange={(items) => {
              handleSelectionChange(items);
            }}
            onRowClick={onSelect ? (item) => {
              onSelect(item);
              onClose();
            } : undefined}
            onRefresh={refetch}
            onPageChange={(page) => {
              setTimeout(() => {
                tableFilters.setPage(page);
              }, 0);
            }}
            onPageSizeChange={(limit) => {
              setTimeout(() => {
                tableFilters.setLimit(limit);
              }, 0);
            }}
            onSort={(column, direction) => {
              setTimeout(() => {
                tableFilters.setSort(column, direction);
              }, 0);
            }}
            onSearch={(search, field) => handleSearchChange(search, field)}
            search={tableFilters.search}
          />
    </DraggableModal>
  );
};

export default ModeloContratoSelectModal;
