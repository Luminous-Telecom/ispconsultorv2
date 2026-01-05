import React, { useState } from 'react';
import { useFornecedores, useDeleteFornecedor } from '@/hooks/useFornecedores';
import { useModalSelect } from '@/hooks/useModalSelect';
import { useListModal } from '@/hooks/useListModal';
import { useTableFilters } from '@/hooks/useTableFilters';
import { formatDateTime } from '@/utils/formatters';
import { Fornecedor } from '@/types';
import ListModal from '@/components/common/ListModal';
import FornecedorModal from './FornecedorModal';
import ImprimirModal from '@/components/common/ImprimirModal';
import { useAuditoria } from '@/hooks/useAuditoria';

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
  title = "Fornecedores",
  skipWrapper: _skipWrapper 
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedFornecedorId, setSelectedFornecedorId] = useState<number | null>(null);
  const [searchField, setSearchField] = useState<string>('nome_razao_social');
  
  // Hook de auditoria
  const auditoria = useAuditoria();
  
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
  } = useModalSelect<Fornecedor>(
    onSelectFornecedor ? (fornecedor) => {
      onSelectFornecedor(fornecedor);
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
        width: '120px',
        render: (item: Fornecedor) => <span className="text-nowrap">{item.id ?? '-'}</span>
      },
      {
        key: 'tipo_pessoa',
        label: 'Tipo',
        sortable: true,
        width: '100px',
        render: (item: Fornecedor) => (
          <span className={`badge ${item.tipo_pessoa === 'JURIDICA' ? 'bg-info' : 'bg-primary'}`}>
            {item.tipo_pessoa === 'JURIDICA' ? 'Jurídica' : 'Física'}
          </span>
        )
      },
      {
        key: 'nome_razao_social',
        label: 'Nome/Razão Social',
        sortable: true,
        render: (item: Fornecedor) => (
          <strong>{item.nome_razao_social}</strong>
        )
      },
      {
        key: 'nome_fantasia',
        label: 'Nome Fantasia',
        sortable: true,
        render: (item: Fornecedor) => (
          <span className="text-muted">{item.nome_fantasia || '-'}</span>
        )
      },
      {
        key: 'cpf_cnpj',
        label: 'CPF/CNPJ',
        sortable: true,
        width: '150px',
        render: (item: Fornecedor) => (
          <span className="text-nowrap">{item.cpf_cnpj}</span>
        )
      },
      {
        key: 'cep',
        label: 'CEP',
        sortable: true,
        width: '120px',
        render: (item: Fornecedor) => (
          <span className="text-nowrap">{item.cep || '-'}</span>
        )
      },
      {
        key: 'logradouro',
        label: 'Logradouro',
        sortable: true,
        render: (item: Fornecedor) => (
          <span>{item.logradouro || '-'}</span>
        )
      },
      {
        key: 'numero',
        label: 'Número',
        sortable: true,
        width: '100px',
        render: (item: Fornecedor) => (
          <span>{item.numero || '-'}</span>
        )
      },
      {
        key: 'complemento',
        label: 'Complemento',
        sortable: true,
        render: (item: Fornecedor) => (
          <span>{item.complemento || '-'}</span>
        )
      },
      {
        key: 'bairro',
        label: 'Bairro',
        sortable: true,
        render: (item: Fornecedor) => (
          <span>{item.bairro || '-'}</span>
        )
      },
      {
        key: 'cidade',
        label: 'Cidade',
        sortable: true,
        render: (item: Fornecedor) => (
          <span>{item.cidade || '-'}</span>
        )
      },
      {
        key: 'estado',
        label: 'Estado',
        sortable: true,
        width: '80px',
        render: (item: Fornecedor) => (
          <span>{item.estado || '-'}</span>
        )
      },
      {
        key: 'pais',
        label: 'País',
        sortable: true,
        width: '100px',
        render: (item: Fornecedor) => (
          <span>{item.pais || '-'}</span>
        )
      },
      {
        key: 'created_at',
        label: 'Criado em',
        sortable: true,
        render: (item: Fornecedor & { created_at?: string; created_at_formatada?: string | null }) => {
          if (item.created_at_formatada) {
            return item.created_at_formatada;
          }
          return item.created_at ? formatDateTime(item.created_at) : '-';
        }
      }
    ],
    searchPlaceholder: 'Buscar...',
    searchFields: [
      { key: 'nome_razao_social', label: 'Nome/Razão Social' },
      { key: 'nome_fantasia', label: 'Nome Fantasia' },
      { key: 'cpf_cnpj', label: 'CPF/CNPJ' },
      { key: 'cep', label: 'CEP' },
      { key: 'logradouro', label: 'Logradouro' },
      { key: 'bairro', label: 'Bairro' },
      { key: 'cidade', label: 'Cidade' },
      { key: 'estado', label: 'Estado' },
      { key: 'pais', label: 'País' }
    ],
    multiSelect: false
  });

  // Hook para buscar fornecedores usando parâmetros do useTableFilters
  const { data: fornecedoresData, isLoading, refetch } = useFornecedores({
    search: tableFilters.debouncedSearch || undefined,
    searchField: searchField || undefined,
    page: tableFilters.page,
    limit: tableFilters.limit
  });

  const deleteFornecedorMutation = useDeleteFornecedor();

  const handleSelect = (selectedItems?: Fornecedor[]) => {
    const item = selectedItems && selectedItems.length > 0 ? selectedItems[0] : selectedItem;
    if (item) {
      clearSelection();
      if (onSelectFornecedor) {
        onSelectFornecedor(item);
        onClose();
      }
    }
  };

  const handleDelete = async (fornecedorId: number) => {
    try {
      await deleteFornecedorMutation.mutateAsync(fornecedorId);
      refetch();
    } catch (error) {
      // Erro já tratado pelo hook
    }
  };

  const handleAudit = (fornecedor: Fornecedor) => {
    auditoria.handleAudit('Fornecedor', fornecedor.id);
  };

  // Paginação do backend
  const pagination = fornecedoresData?.pagination ? {
    current_page: fornecedoresData.pagination.current_page,
    last_page: fornecedoresData.pagination.last_page,
    per_page: fornecedoresData.pagination.per_page,
    total: fornecedoresData.pagination.total,
    from: fornecedoresData.pagination.from,
    to: fornecedoresData.pagination.to
  } : {
    current_page: tableFilters.page,
    last_page: 1,
    per_page: tableFilters.limit,
    total: 0,
    from: 0,
    to: 0
  };

  // Bulk actions
  const bulkActions = onSelectFornecedor ? [
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
      disabled: (selectedItems: Fornecedor[]) => selectedItems.length === 0 && !selectedItem,
      action: (selectedItems: Fornecedor[]) => handleSelect(selectedItems)
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
      disabled: (selectedItems: Fornecedor[]) => selectedItems.length === 0,
      action: (selectedItems: Fornecedor[]) => {
        const item = selectedItems.length > 0 ? selectedItems[0] : selectedItem;
        if (item) {
          setSelectedFornecedorId(item.id);
          setShowEditModal(true);
        }
      }
    },
    {
      label: 'Excluir',
      variant: 'danger' as const,
      disabled: (selectedItems: Fornecedor[]) => selectedItems.length === 0,
      action: (selectedItems: Fornecedor[]) => {
        const item = selectedItems.length > 0 ? selectedItems[0] : selectedItem;
        if (item && window.confirm('Tem certeza que deseja excluir este fornecedor?')) {
          handleDelete(item.id);
        }
      }
    }
  ];

  return (
    <>
      <ListModal
        show={show}
        onClose={() => {
          clearSelection();
          onClose();
        }}
        config={modal.config}
        data={(fornecedoresData?.data || []).filter(item => item.id != null)}
        loading={isLoading}
        selectedItems={selectedItem ? [selectedItem] : []}
        onSelectionChange={handleSelectionChange}
        search={tableFilters.search}
        onSearchChange={(search, field) => {
          tableFilters.setSearch(search);
          setSearchField(field);
        }}
        onSearchFieldChange={setSearchField}
        pagination={pagination}
        onPageChange={tableFilters.setPage}
        limit={tableFilters.limit}
        onLimitChange={tableFilters.setLimit}
        refreshQueryKeys={['fornecedores']}
        refreshQueryFn={refetch}
        bulkActions={bulkActions}
        onAudit={handleAudit}
        auditEntity="Fornecedor"
        skipWrapper={_skipWrapper}
      />

      {showCreateModal && (
        <FornecedorModal
          show={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            refetch();
            // Não fechar o modal automaticamente - permitir múltiplas edições
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
            // Não fechar o modal automaticamente - permitir múltiplas edições
          }}
        />
      )}

      {/* Modal de Visualização de PDF de Auditoria */}
      <ImprimirModal
        show={auditoria.showPreview}
        onClose={auditoria.handleClosePreview}
        pdfUrl={auditoria.pdfUrl}
        isGenerating={auditoria.isGeneratingPdf}
        title="Relatórios de logs"
        modalId="auditoria-fornecedor-modal"
      />
    </>
  );
};

export default FornecedorListModal;
