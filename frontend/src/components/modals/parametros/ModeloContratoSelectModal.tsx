import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import DraggableModal from '../../common/DraggableModal';
import DocumentoSistemaService, { DocumentoSistema } from '../../../services/documentoSistemaService';
import { Table, TableConfig } from '../../tables';

interface ModeloContratoSelectModalProps {
  show: boolean;
  onClose: () => void;
  onSelectModelo?: (modelo: DocumentoSistema) => void;
  title?: string;
}

const ModeloContratoSelectModal: React.FC<ModeloContratoSelectModalProps> = ({ 
  show, 
  onClose, 
  onSelectModelo,
  title = "Selecionar Modelo de Contrato"
}) => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [sortColumn, setSortColumn] = useState<string>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedItems, setSelectedItems] = useState<DocumentoSistema[]>([]);

  // Query para buscar modelos de contrato
  const { data: modelosData, isLoading, refetch } = useQuery({
    queryKey: ['modelos-contrato', search, page, limit, sortColumn, sortDirection],
    queryFn: () => DocumentoSistemaService.getByType('contrato'),
    enabled: show,
  });

  // Filtrar e ordenar dados localmente
  const filteredData = React.useMemo(() => {
    if (!modelosData?.data) return [];
    
    let filtered = [...modelosData.data];
    
    // Aplicar busca
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(item => 
        item.nome?.toLowerCase().includes(searchLower) ||
        item.id?.toString().includes(searchLower)
      );
    }
    
    // Aplicar ordenação
    filtered.sort((a, b) => {
      let aVal: any = a[sortColumn as keyof DocumentoSistema];
      let bVal: any = b[sortColumn as keyof DocumentoSistema];
      
      if (aVal === bVal) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      
      const comparison = aVal < bVal ? -1 : 1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return filtered;
  }, [modelosData?.data, search, sortColumn, sortDirection]);

  // Paginar dados localmente
  const paginatedData = React.useMemo(() => {
    const startIndex = (page - 1) * limit;
    return filteredData.slice(startIndex, startIndex + limit);
  }, [filteredData, page, limit]);

  // Configuração da tabela
  const tableConfig: TableConfig<DocumentoSistema> = {
    data: paginatedData,
    loading: isLoading,
    columns: [
      {
        key: 'id',
        label: 'ID',
        sortable: true,
        width: '80px',
        render: (item: DocumentoSistema) => <span>{item.id}</span>
      },
      {
        key: 'nome',
        label: 'Nome',
        sortable: true,
        render: (item: DocumentoSistema) => (
          <div className="fw-bold">{item.nome}</div>
        )
      },
      {
        key: 'descricao',
        label: 'Descrição',
        sortable: false,
        render: (item: DocumentoSistema) => (
          <div className="text-truncate" style={{ maxWidth: '300px' }} title={item.descricao || ''}>
            {item.descricao || '-'}
          </div>
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
    pagination: {
      current_page: page,
      last_page: Math.ceil(filteredData.length / limit),
      per_page: limit,
      total: filteredData.length,
      from: (page - 1) * limit + 1,
      to: Math.min(page * limit, filteredData.length)
    },
    bulkActions: [],
    searchable: true,
    searchPlaceholder: 'Buscar por nome do modelo...',
    sortable: true,
    selectable: true,
    multiSelect: false, // Seleção única
    emptyMessage: 'Nenhum modelo de contrato encontrado'
  };

  const handleRowClick = (modelo: DocumentoSistema) => {
    if (onSelectModelo) {
      onSelectModelo(modelo);
      onClose();
    }
  };

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={title}
      size="lg"
      modalId="modelo-contrato-select-modal"
      className="no-padding"
    >
      <div>
        <Table
          config={tableConfig}
          onSort={(column: string, direction: 'asc' | 'desc') => {
            setSortColumn(column);
            setSortDirection(direction);
          }}
          onSelectionChange={(selectedItems) => {
            setSelectedItems(selectedItems);
          }}
          onRefresh={() => refetch()}
          className="modelo-contrato-select-table"
        />
      </div>
    </DraggableModal>
  );
};

export default ModeloContratoSelectModal;
