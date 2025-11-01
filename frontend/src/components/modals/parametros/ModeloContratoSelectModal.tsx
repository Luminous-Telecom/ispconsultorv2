import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useListModal } from '../../../hooks/useListModal';
import { useModalSelect } from '../../../hooks/useModalSelect';
import ListModal from '../../common/ListModal';
import DocumentoSistemaService, { DocumentoSistema } from '../../../services/documentoSistemaService';

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
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

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
        sortable: false,
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
          <span>{new Date(item.created_at).toLocaleDateString('pt-BR')}</span>
        )
      }
    ],
    searchPlaceholder: 'Buscar por nome do modelo...',
    multiSelect: false
  });

  // Query para buscar modelos de contrato
  const { data: modelosData, isLoading, refetch } = useQuery({
    queryKey: ['modelos-contrato', search, page, limit],
    queryFn: () => DocumentoSistemaService.getByType('contrato'),
    enabled: show,
  });

  // Filtrar dados localmente
  const filteredData = useMemo(() => {
    if (!modelosData?.data) return [];
    
    let filtered = [...modelosData.data];
    
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(item => 
        item.nome?.toLowerCase().includes(searchLower) ||
        item.id?.toString().includes(searchLower)
      );
    }
    
    return filtered;
  }, [modelosData?.data, search]);

  // Paginar dados localmente
  const paginatedData = useMemo(() => {
    const startIndex = (page - 1) * limit;
    return filteredData.slice(startIndex, startIndex + limit);
  }, [filteredData, page, limit]);

  // Paginação
  const pagination = {
    from: (page - 1) * limit + 1,
    to: Math.min(page * limit, filteredData.length),
    total: filteredData.length,
    current_page: page,
    last_page: Math.ceil(filteredData.length / limit),
    per_page: limit
  };

  const handleSelect = () => {
    if (selectedItem) {
      clearSelection();
      if (onSelect) {
        onSelect(selectedItem);
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
      disabled: () => !selectedItem,
      action: handleSelect
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
      data={paginatedData}
      loading={isLoading}
      selectedItems={selectedItem ? [selectedItem] : []}
      onSelectionChange={handleSelectionChange}
      search={search}
      onSearchChange={setSearch}
      pagination={pagination}
      onPageChange={setPage}
      limit={limit}
      onLimitChange={setLimit}
      onRefresh={refetch}
      bulkActions={bulkActions}
    />
  );
};

export default ModeloContratoSelectModal;
