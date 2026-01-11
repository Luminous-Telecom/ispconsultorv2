import React, { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useListModal } from '@/hooks/useListModal';
import { useModalSelect } from '@/hooks/useModalSelect';
import { useTableFilters } from '@/hooks/useTableFilters';
import { formatDate } from '@/utils/formatters';
import DocumentoSistemaService, { DocumentoSistema } from '@/services/documentoSistemaService';
import ListModal from '@/components/common/ListModal';

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
  title = "Selecionar Modelo de Contrato"
}) => {
  // Hook unificado para filtros, busca e paginação
  const tableFilters = useTableFilters({
    initialSearch: '',
    initialPage: 1,
    initialLimit: 15,
    searchDebounceMs: 300,
    resetPageOnFilterChange: true,
  });

  const handleSearchChange = useCallback((search: string) => {
    // Usar setTimeout para evitar atualização durante render cycle
    setTimeout(() => {
      tableFilters.setSearch(search);
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableFilters.setSearch]);

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

  // Configurar modal centralizado
  const modal = useListModal({
    title,
    columns: [
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
        render: (item: DocumentoSistema) => <strong>{item.nome}</strong>
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
    ],
    searchPlaceholder: '',
    multiSelect: false
  });

  // Query para buscar modelos de contrato
  const { data: modelosData, isLoading, refetch } = useQuery({
    queryKey: ['modelos-documento', 'contrato'],
    queryFn: () => DocumentoSistemaService.getByType('contrato'),
    enabled: show,
  });

  // Dados prontos para busca (não precisa filtrar/paginar manualmente - o Table faz isso)

  const handleSelect = (selectedItems?: DocumentoSistema[]) => {
    const item = selectedItems && selectedItems.length > 0 ? selectedItems[0] : selectedItem;
    if (item) {
      clearSelection();
      if (onSelect) {
        onSelect(item);
        onClose();
      }
    }
  };

  const bulkActions = onSelect ? [
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
      disabled: (selectedItems: DocumentoSistema[]) => selectedItems.length === 0 && !selectedItem,
      action: (selectedItems: DocumentoSistema[]) => handleSelect(selectedItems)
    }
  ] : [];

  return (
    <ListModal
      show={show}
      onClose={() => {
        clearSelection();
        onClose();
      }}
        config={modal.config}
        data={modelosData?.data || []}
        loading={isLoading}
        selectedItems={selectedItem ? [selectedItem] : []}
        onSelectionChange={handleSelectionChange}
        search={tableFilters.search}
        onSearchChange={handleSearchChange}
        limit={tableFilters.limit}
        onLimitChange={tableFilters.setLimit}
      onRefresh={refetch}
      bulkActions={bulkActions}
    />
  );
};

export default ModeloContratoSelectModal;
