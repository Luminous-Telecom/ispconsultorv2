import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBancos, useDeleteBanco } from '../../hooks/useBancos';
import DataTable from '../common/DataTable';
import TableFilters from '../common/TableFilters';
import { Banco } from '../../types';
import BancoCreateModal from '../modals/bancos/BancoCreateModal';
import BancoEditModal from '../modals/bancos/BancoEditModal';
import { useNotificationContext } from '../../contexts/NotificationContext';

const Bancos: React.FC = () => {
  const [search, setSearch] = useState('');
  const [tipo, setTipo] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [sortColumn, setSortColumn] = useState<string>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedBancoId, setSelectedBancoId] = useState<number | null>(null);

  // Query para buscar bancos
  const { data: bancosData, isLoading, refetch } = useBancos({
    search: search || undefined,
    tipo_banco: tipo || undefined,
    page,
    limit
  });

  const deleteBancoMutation = useDeleteBanco();
  const { success, error } = useNotificationContext();

  const getTipoBadgeClass = (tipo: string) => {
    switch (tipo) {
      case 'efi': return 'bg-primary';
      case 'asaas': return 'bg-info';
      case 'tradicional': return 'bg-secondary';
      default: return 'bg-secondary';
    }
  };

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    refetch();
  };

  const handleReset = () => {
    setSearch('');
    setTipo('');
    setPage(1);
    refetch();
  };

  const handleDelete = async (bancoId: number) => {
    if (window.confirm('Tem certeza que deseja excluir este banco?')) {
      try {
        await deleteBancoMutation.mutateAsync(bancoId);
        success('Banco excluído com sucesso!');
        refetch();
      } catch (error: any) {
        const errorMessage = error?.response?.data?.message || 
                           error?.response?.data?.error || 
                           'Erro ao excluir banco';
        error(errorMessage);
      }
    }
  };

  const handleSort = (column: string, direction: 'asc' | 'desc') => {
    setSortColumn(column);
    setSortDirection(direction);
    setPage(1); // Voltar para primeira página ao ordenar
  };

  // Função para ordenar os dados localmente
  const getSortedData = () => {
    if (!bancosData?.data || !sortColumn) {
      return bancosData?.data || [];
    }

    return [...bancosData.data].sort((a, b) => {
      let aValue = (a as any)[sortColumn];
      let bValue = (b as any)[sortColumn];

      // Converter para string se necessário para comparação
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
      }
      if (typeof bValue === 'string') {
        bValue = bValue.toLowerCase();
      }

      // Converter datas se necessário
      if (sortColumn.includes('data') || sortColumn.includes('created_at')) {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      // Converter números se necessário
      if (sortColumn.includes('valor') || sortColumn.includes('total')) {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
      }

      // Tratar valores nulos/undefined
      if (aValue == null) aValue = '';
      if (bValue == null) bValue = '';

      if (aValue < bValue) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  const handleTopoActions = (action: string, selectedItems: any[]) => {
    if (selectedItems.length === 0) return;
    
    switch (action) {
      case 'editar':
        if (selectedItems.length === 1) {
          setSelectedBancoId(selectedItems[0].id);
          setShowEditModal(true);
        }
        break;
      case 'deletar':
        if (selectedItems.length > 0) {
          if (window.confirm(`Tem certeza que deseja excluir ${selectedItems.length} banco(s)?`)) {
            selectedItems.forEach(async (item) => {
              await handleDelete(item.id);
            });
          }
        }
        break;
    }
  };

  // Helper para exibir tipo do banco formatado
  const getTipoBancoLabel = (tipo: string) => {
    const tipos: Record<string, string> = {
      'efi': 'EFI',
      'asaas': 'Asaas'
    };
    return tipos[tipo] || tipo;
  };

  // Helper para obter código do banco baseado no tipo
  const getCodigoBanco = (tipo: string) => {
    const codigos: Record<string, string> = {
      'efi': '364',
      'asaas': '461'
    };
    return codigos[tipo] || '-';
  };

  // Definição das colunas da tabela
  const columns = [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
      render: (banco: Banco) => <code className="text-primary">#{banco.id}</code>
    },
    {
      key: 'nome',
      label: 'Nome',
      sortable: true,
      render: (banco: Banco) => <strong>{banco.nome}</strong>
    },
    {
      key: 'codigo',
      label: 'Código',
      sortable: true,
      render: (banco: Banco) => <span className="text-muted">{getCodigoBanco(banco.tipo_banco)}</span>
    },
    {
      key: 'tipo_banco',
      label: 'Tipo',
      sortable: true,
      render: (banco: Banco) => (
        <span className="badge bg-primary">
          {getTipoBancoLabel(banco.tipo_banco)}
        </span>
      )
    },
    {
      key: 'descricao',
      label: 'Descrição',
      sortable: false,
      render: (banco: Banco) => (
        <div className="text-truncate" style={{ maxWidth: '200px' }} title={banco.descricao || ''}>
          {banco.descricao || '-'}
        </div>
      )
    },
    {
      key: 'sandbox',
      label: 'Ambiente',
      sortable: true,
      render: (banco: Banco) => (
        <span className={`badge ${banco.sandbox ? 'bg-warning text-dark' : 'bg-success'}`}>
          {banco.sandbox ? 'Sandbox' : 'Produção'}
        </span>
      )
    },
    {
      key: 'ativo',
      label: 'Status',
      sortable: true,
      render: (banco: Banco) => (
        <span className={`badge ${banco.ativo ? 'bg-success' : 'bg-danger'}`}>
          {banco.ativo ? 'Ativo' : 'Inativo'}
        </span>
      )
    }
  ];

  return (
    <>
      {/* Tabela de Bancos com controles integrados */}
      <DataTable
        columns={columns}
        data={getSortedData()}
        isLoading={isLoading}
        pagination={bancosData?.pagination}
        limit={limit}
        setLimit={setLimit}
        setPage={setPage}
        emptyMessage="Nenhum banco encontrado"
        searchPlaceholder="Nome do banco"
        onSearch={setSearch}
        bulkActions={[
          {
            label: "Novo",
            action: () => setShowCreateModal(true)
          },
          {
            label: "Editar",
            action: (selectedItems) => handleTopoActions('editar', selectedItems),
            disabled: (selectedItems) => selectedItems.length !== 1
          },
          {
            label: "Deletar",
            action: (selectedItems) => handleTopoActions('deletar', selectedItems),
            disabled: (selectedItems) => selectedItems.length === 0
          }
        ]}
        onSort={handleSort}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onRefresh={refetch}
      />

      {/* Modal de Criação */}
      <BancoCreateModal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          refetch();
        }}
      />

      {/* Modal de Edição */}
      <BancoEditModal
        show={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedBancoId(null);
        }}
        bancoId={selectedBancoId}
        onSuccess={() => {
          setShowEditModal(false);
          setSelectedBancoId(null);
          refetch();
        }}
      />
    </>
  );
};

export default Bancos;