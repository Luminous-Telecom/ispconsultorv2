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

  // Configuração da tabela
  const tableConfig: TableConfig<DocumentoSistema> = {
    data: modelosData?.data || [],
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
      last_page: modelosData?.pagination?.last_page || 1,
      per_page: limit,
      total: modelosData?.pagination?.total || 0,
      from: modelosData?.pagination?.from || (page - 1) * limit + 1,
      to: modelosData?.pagination?.to || Math.min(page * limit, modelosData?.pagination?.total || 0)
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
