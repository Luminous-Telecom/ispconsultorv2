import React, { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useListModal } from '../../../../../hooks/useListModal';
import { useModalSelect } from '../../../../../hooks/useModalSelect';
import ListModal from '../../../../common/ListModal';
import { useModelosTermo } from '../../../../../hooks/useModelosTermo';

interface Termo {
  id: number;
  nome: string;
  ativo: boolean;
}

interface SelecionarTermoModalProps {
  show: boolean;
  onClose: () => void;
  onSelect: (termo: Termo) => void;
}

const SelecionarTermoModal: React.FC<SelecionarTermoModalProps> = ({
  show,
  onClose,
  onSelect
}) => {
  const queryClient = useQueryClient();
  const [searchTermosModal, setSearchTermosModal] = useState('');
  const [limitTermosModal, setLimitTermosModal] = useState(15);
  const [pageTermosModal, setPageTermosModal] = useState(1);
  
  const { data: termosSistema, isLoading: isLoadingTermos } = useModelosTermo();

  // Usar hook customizado para gerenciar seleção
  const {
    selectedItem: termoSelecionado,
    handleSelectionChange,
    clearSelection
  } = useModalSelect<Termo>(
    onSelect ? (termo) => {
      onSelect(termo);
      onClose();
    } : undefined
  );

  // Configurar modal centralizado
  const modal = useListModal({
    title: 'Selecionar Termo Cadastrado',
    columns: [
      {
        key: 'id',
        label: 'ID',
        sortable: true,
        render: (termo: Termo) => <span>{termo.id}</span>
      },
      {
        key: 'nome',
        label: 'Nome',
        sortable: true,
        render: (termo: Termo) => <strong>{termo.nome}</strong>
      },
      {
        key: 'ativo',
        label: 'Status',
        sortable: true,
        render: (termo: Termo) => (
          <span className={`badge ${termo.ativo ? 'bg-success' : 'bg-secondary'}`}>
            {termo.ativo ? 'Ativo' : 'Inativo'}
          </span>
        )
      }
    ],
    searchPlaceholder: 'Buscar termos...',
    multiSelect: false
  });

  // Filtrar e ordenar termos
  const filteredTermos = useMemo(() => {
    if (!termosSistema) return [];
    
    let filtered = [...termosSistema];
    
    if (searchTermosModal) {
      const searchLower = searchTermosModal.toLowerCase();
      filtered = filtered.filter(t => 
        t.nome?.toLowerCase().includes(searchLower) ||
        t.id?.toString().includes(searchLower)
      );
    }
    
    return filtered;
  }, [termosSistema, searchTermosModal]);

  // Paginar termos
  const paginatedTermos = useMemo(() => {
    const startIndex = (pageTermosModal - 1) * limitTermosModal;
    return filteredTermos.slice(startIndex, startIndex + limitTermosModal);
  }, [filteredTermos, pageTermosModal, limitTermosModal]);

  // Criar paginação manual
  const paginationTermos = {
    from: (pageTermosModal - 1) * limitTermosModal + 1,
    to: Math.min(pageTermosModal * limitTermosModal, filteredTermos.length),
    total: filteredTermos.length,
    current_page: pageTermosModal,
    last_page: Math.ceil(filteredTermos.length / limitTermosModal),
    per_page: limitTermosModal
  };

  const handleInsert = () => {
    if (termoSelecionado) {
      onSelect(termoSelecionado);
      clearSelection();
      onClose();
    }
  };

  const bulkActions = [
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
      disabled: () => !termoSelecionado,
      action: handleInsert
    }
  ];

  return (
    <ListModal
      show={show}
      onClose={() => {
        clearSelection();
        onClose();
      }}
      config={modal.config}
      data={paginatedTermos}
      loading={isLoadingTermos}
      selectedItems={termoSelecionado ? [termoSelecionado] : []}
      onSelectionChange={handleSelectionChange}
      search={searchTermosModal}
      onSearchChange={setSearchTermosModal}
      pagination={paginationTermos}
      onPageChange={setPageTermosModal}
      limit={limitTermosModal}
      onLimitChange={setLimitTermosModal}
      onRefresh={() => {
        queryClient.invalidateQueries({ queryKey: ['modelos-termo'] });
      }}
      bulkActions={bulkActions}
    />
  );
};

export default SelecionarTermoModal;
