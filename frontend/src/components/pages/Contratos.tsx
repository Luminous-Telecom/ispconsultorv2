import React, { useState } from 'react';
import { useContratos } from '../../hooks/useContratos';
import DataTable from '../common/DataTable';
import { Contrato } from '../../hooks/useContratos';
import ContratoCreateModal from '../modals/contratos/ContratoCreateModal';

const Contratos: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  const { data: contratosData, isLoading, error, refetch } = useContratos({
    search: search || undefined,
    page,
    limit
  });

  const contratos = contratosData?.data || [];

  // Função para ordenação
  const handleSort = (column: string, direction: 'asc' | 'desc') => {
    setSortColumn(column);
    setSortDirection(direction);
  };

  // Função para ordenar dados
  const getSortedData = () => {
    if (!sortColumn) return contratos;
    
    return [...contratos].sort((a, b) => {
      let aVal: any = a[sortColumn as keyof Contrato];
      let bVal: any = b[sortColumn as keyof Contrato];
      
      // Tratamento especial para campos aninhados
      if (sortColumn === 'cliente') {
        aVal = a.cliente?.razao_social || '';
        bVal = b.cliente?.razao_social || '';
      } else if (sortColumn === 'plano') {
        aVal = a.plano?.nome_plano || '';
        bVal = b.plano?.nome_plano || '';
      }
      
      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  };

  // Função para ações em lote
  const handleTopoActions = (action: string, selectedItems: any[]) => {
    if (selectedItems.length === 0) {
      alert('Selecione pelo menos um item');
      return;
    }

    switch (action) {
      case 'editar':
        if (selectedItems.length === 1) {
          // TODO: Implementar edição de contrato
          console.log('Editar contrato:', selectedItems[0].id);
        } else {
          alert('Selecione apenas um contrato para editar');
        }
        break;
      case 'deletar':
        if (window.confirm(`Tem certeza que deseja deletar ${selectedItems.length} contrato(s)?`)) {
          // TODO: Implementar exclusão de contratos
          console.log('Deletar contratos:', selectedItems.map(item => item.id));
        }
        break;
      default:
        console.log('Ação não implementada:', action);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativo':
        return 'bg-success';
      case 'inativo':
        return 'bg-danger';
      case 'suspenso':
        return 'bg-warning';
      default:
        return 'bg-secondary';
    }
  };

  const columns = [
    {
      key: 'id',
      label: 'ID',
      sortable: true
    },
    {
      key: 'cliente',
      label: 'Cliente',
      sortable: true,
      render: (contrato: Contrato) => (
        <div>
          <strong>{contrato.cliente?.razao_social}</strong>
          {contrato.cliente?.nome_fantasia && (
            <div className="text-muted small">{contrato.cliente.nome_fantasia}</div>
          )}
        </div>
      )
    },
    {
      key: 'plano',
      label: 'Plano',
      sortable: true,
      render: (contrato: Contrato) => (
        <div>
          <strong>{contrato.plano?.nome_plano}</strong>
          <div className="text-muted small">R$ {contrato.plano?.valor_mensal}</div>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (contrato: Contrato) => (
        <span className={`badge ${getStatusColor(contrato.status)}`}>
          {contrato.status}
        </span>
      )
    },
    {
      key: 'desconto_percentual',
      label: 'Desconto %',
      sortable: true,
      render: (contrato: Contrato) => (
        contrato.desconto_percentual ? `${contrato.desconto_percentual}%` : '-'
      )
    },
    {
      key: 'desconto_valor',
      label: 'Desconto R$',
      sortable: true,
      render: (contrato: Contrato) => (
        contrato.desconto_valor ? `R$ ${contrato.desconto_valor}` : '-'
      )
    },
    {
      key: 'data_inicio',
      label: 'Data Início',
      sortable: true,
      render: (contrato: Contrato) => (
        contrato.data_inicio ? new Date(contrato.data_inicio).toLocaleDateString('pt-BR') : '-'
      )
    },
    {
      key: 'data_fim',
      label: 'Data Fim',
      sortable: true,
      render: (contrato: Contrato) => (
        contrato.data_fim ? new Date(contrato.data_fim).toLocaleDateString('pt-BR') : '-'
      )
    },
    {
      key: 'isento_mensalidade',
      label: 'Isento',
      sortable: true,
      render: (contrato: Contrato) => (
        <span className={`badge ${contrato.isento_mensalidade ? 'bg-success' : 'bg-secondary'}`}>
          {contrato.isento_mensalidade ? 'Sim' : 'Não'}
        </span>
      )
    },
    {
      key: 'dia_vencimento',
      label: 'Dia Venc.',
      sortable: true,
      render: (contrato: Contrato) => (
        contrato.dia_vencimento ? `Dia ${contrato.dia_vencimento}` : '-'
      )
    },
    {
      key: 'bancoBoleto',
      label: 'Banco Boleto',
      sortable: true,
      render: (contrato: Contrato) => (
        contrato.bancoBoleto?.nome || '-'
      )
    },
    {
      key: 'created_at',
      label: 'Criado em',
      sortable: true,
      render: (contrato: Contrato) => (
        new Date(contrato.created_at).toLocaleDateString('pt-BR')
      )
    }
  ];

  const bulkActions = [
    {
      label: 'Novo',
      action: () => setShowCreateModal(true),
      variant: 'primary' as const
    },
    {
      label: 'Editar',
      action: (selectedItems) => handleTopoActions('editar', selectedItems),
      variant: 'secondary' as const
    },
    {
      label: 'Deletar',
      action: (selectedItems) => handleTopoActions('deletar', selectedItems),
      variant: 'danger' as const
    }
  ];

  if (error) {
    return (
      <div className="container-fluid">
        <div className="row">
          <div className="col-12">
            <div className="alert alert-danger">
              Erro ao carregar contratos: {error.message}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2>Contratos</h2>
          </div>

          <DataTable
            columns={columns}
            data={getSortedData()}
            isLoading={isLoading}
            pagination={contratosData?.pagination}
            limit={limit}
            setLimit={setLimit}
            setPage={setPage}
            emptyMessage="Nenhum contrato encontrado"
            searchPlaceholder="Cliente, plano ou status"
            onSearch={setSearch}
            bulkActions={bulkActions}
            onSort={handleSort}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onRefresh={refetch}
          />
        </div>
      </div>

      {/* Modal de Criação */}
      <ContratoCreateModal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          refetch();
        }}
      />
    </div>
  );
};

export default Contratos;
