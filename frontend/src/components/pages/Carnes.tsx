import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCarnes, useDeleteCarne } from '../../hooks/useCarnes';
import { API_CONFIG } from '../../config/api';
import DataTable from '../common/DataTable';
import TableFilters from '../common/TableFilters';

const Carnes: React.FC = () => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  const { data: carnesData, isLoading, refetch } = useCarnes({
    search: search || undefined,
    status: status || undefined,
    page,
    limit
  });

  const deleteCarneMutation = useDeleteCarne();

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'em-dias': return 'bg-success';
      case 'atrasado': return 'bg-warning';
      case 'cancelado': return 'bg-danger';
      case 'pago': return 'bg-primary';
      default: return 'bg-secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'em-dias': return 'Em dias';
      case 'atrasado': return 'Atrasado';
      case 'cancelado': return 'Cancelado';
      case 'pago': return 'Pago';
      default: return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Desconhecido';
    }
  };

  const determinarStatusCarne = (carne: any) => {
    // Se o carnê está cancelado, retorna cancelado
    if (carne.status === 'cancelado') {
      return 'cancelado';
    }
    
    // Se todas as parcelas foram pagas, retorna pago
    if (carne.parcelas_pagas && carne.quantidade_parcelas && 
        carne.parcelas_pagas >= carne.quantidade_parcelas) {
      return 'pago';
    }
    
    // Se há parcelas pagas mas não todas, verifica se há parcelas atrasadas
    // Por enquanto, vamos considerar como "em-dias" se não está cancelado nem totalmente pago
    // TODO: Implementar lógica para verificar parcelas vencidas
    return 'em-dias';
  };

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    refetch();
  };

  const handleReset = () => {
    setSearch('');
    setStatus('');
    setPage(1);
    refetch();
  };

  const handleDelete = async (carneId: number) => {
    if (window.confirm('Tem certeza que deseja excluir este carnê?')) {
      deleteCarneMutation.mutate(carneId);
    }
  };

  const handleImprimir = (carneId: number) => {
    // Abrir boleto em nova guia com URL normal
    window.open(`${API_CONFIG.BASE_URL}/carnes/${carneId}/imprimir`, '_blank');
  };


  // Definição das colunas da tabela
  const columns = [
    {
      key: 'id',
      label: 'ID',
      render: (carne: any) => <code className="text-primary">#{carne.id}</code>
    },
    {
      key: 'carnet_id',
      label: 'Carnet ID',
      render: (carne: any) => (
        <code className="text-info">
          {carne.carnet_id || 'Não gerado'}
        </code>
      )
    },
    {
      key: 'numero_carne',
      label: 'Número do Carnê',
      render: (carne: any) => <strong>{carne.numero_carne}</strong>
    },
    {
      key: 'cliente',
      label: 'Cliente',
      render: (carne: any) => carne.cliente?.razao_social || 'N/A'
    },
    {
      key: 'valor_total',
      label: 'Valor Total',
      render: (carne: any) => (
        <strong>R$ {carne.valor_total ? Number(carne.valor_total).toFixed(2).replace('.', ',') : '0,00'}</strong>
      )
    },
    {
      key: 'parcelas',
      label: 'Parcelas Pagas',
      render: (carne: any) => (
        <>
          <span className="badge bg-success">{carne.parcelas_pagas || 0}</span>
          <span className="text-muted"> / </span>
          <span className="badge bg-secondary">{carne.quantidade_parcelas}</span>
        </>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (carne: any) => {
        const statusCalculado = determinarStatusCarne(carne);
        return (
          <span className={`badge ${getStatusBadgeClass(statusCalculado)}`}>
            {getStatusLabel(statusCalculado)}
          </span>
        );
      }
    },
    {
      key: 'created_at',
      label: 'Data de Criação',
      render: (carne: any) => new Date(carne.created_at).toLocaleDateString('pt-BR')
    }
  ];

  // Renderizar ações da tabela
  // Funções para os botões do topo
  const handleTopoActions = (action: string, selectedItems: any[]) => {
    if (selectedItems.length === 0) return;
    
    switch (action) {
      case 'editar':
        if (selectedItems.length === 1) {
          window.location.href = `/carnes/${selectedItems[0].id}/edit`;
        }
        break;
      case 'deletar':
        if (selectedItems.length === 1) {
          const carne = selectedItems[0];
          const temParcelasPagas = carne.parcelas_pagas && carne.parcelas_pagas > 0;
          if (!temParcelasPagas) {
            handleDelete(carne.id);
          }
        }
        break;
      case 'imprimir':
        if (selectedItems.length === 1) {
          handleImprimir(selectedItems[0].id);
        }
        break;
    }
  };

  return (
    <>
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <h1 className="h2">Carnês</h1>
      </div>

      {/* Tabela de Carnês com controles integrados */}
      <DataTable
        columns={columns}
        data={carnesData?.data || []}
        isLoading={isLoading}
        pagination={carnesData?.pagination}
        limit={limit}
        setLimit={setLimit}
        setPage={setPage}
        emptyMessage="Nenhum carnê encontrado"
        searchPlaceholder="Número do carnê ou cliente"
        onSearch={setSearch}
        bulkActions={[
          {
            label: "Novo",
            action: () => window.location.href = "/carnes/create",
            variant: 'primary'
          },
          {
            label: "Editar",
            action: (selectedItems) => handleTopoActions('editar', selectedItems),
            variant: 'warning'
          },
          {
            label: "Deletar",
            action: (selectedItems) => handleTopoActions('deletar', selectedItems),
            variant: 'danger'
          },
          {
            label: "Imprimir",
            action: (selectedItems) => handleTopoActions('imprimir', selectedItems),
            variant: 'info'
          }
        ]}
      />
    </>
  );
};

export default Carnes;