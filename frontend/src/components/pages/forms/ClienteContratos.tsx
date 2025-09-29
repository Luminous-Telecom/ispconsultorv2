import React, { useState } from 'react';
import DataTable from '../../common/DataTable';

interface ClienteContratosProps {
  cliente: any;
  onDataChange: (field: string, value: any) => void;
}

const ClienteContratos: React.FC<ClienteContratosProps> = ({ 
  cliente, 
  onDataChange 
}) => {

  // Mock data para contratos
  const mockContratos = [
    {
      id: 1,
      filial: 'Matriz',
      status_contrato: 'Ativo',
      status_acesso: 'Liberado',
      plano_vendas: 'Plano Premium',
      data_ativacao: '2024-01-15',
      data_vencimento: '2024-12-15',
      valor: 150.00,
      observacoes: 'Contrato principal'
    },
    {
      id: 2,
      filial: 'Filial 1',
      status_contrato: 'Suspenso',
      status_acesso: 'Bloqueado',
      plano_vendas: 'Plano Básico',
      data_ativacao: '2024-02-01',
      data_vencimento: '2024-11-01',
      valor: 99.90,
      observacoes: 'Contrato suspenso por inadimplência'
    }
  ];


  const handleBulkAction = (action: string) => {
    console.log(`${action} contratos`);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'ativo':
        return 'success';
      case 'suspenso':
        return 'warning';
      case 'cancelado':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  const contratosColumns = [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'filial', label: 'Filial', sortable: true },
    { 
      key: 'status_contrato', 
      label: 'Status Contrato',
      render: (item: any) => (
        <span className={`badge bg-${getStatusColor(item.status_contrato)}`}>
          {item.status_contrato}
        </span>
      )
    },
    { 
      key: 'status_acesso', 
      label: 'Status Acesso',
      render: (item: any) => (
        <span className={`badge ${item.status_acesso === 'Liberado' ? 'bg-success' : 'bg-danger'}`}>
          {item.status_acesso}
        </span>
      )
    },
    { key: 'plano_vendas', label: 'Plano de Vendas', sortable: true },
    { key: 'data_ativacao', label: 'Data Ativação', sortable: true },
    { key: 'data_vencimento', label: 'Data Vencimento', sortable: true },
    { 
      key: 'valor', 
      label: 'Valor',
      render: (item: any) => `R$ ${item.valor.toFixed(2)}`
    },
    { key: 'observacoes', label: 'Observações' }
  ];

  if (!cliente) {
    return (
      <div>Carregando dados do cliente...</div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-2 mt-2">
        <small className="mb-0">Contratos do Cliente</small>
      </div>
      
      <DataTable
        data={mockContratos}
        columns={contratosColumns}
        isLoading={false}
        limit={10}
        setLimit={() => {}}
        setPage={() => {}}
        emptyMessage="Nenhum contrato encontrado"
        searchPlaceholder="Buscar contratos..."
        onSearch={() => {}}
        bulkActions={[
          {
            label: 'Novo Contrato',
            action: () => handleBulkAction('novo')
          },
          {
            label: 'Editar',
            action: (selectedItems) => handleBulkAction('editar')
          },
          {
            label: 'Deletar',
            action: (selectedItems) => handleBulkAction('deletar')
          },
          {
            label: 'Alteração Wizard',
            action: (selectedItems) => handleBulkAction('alteracao_wizard')
          },
          {
            label: 'Imprimir',
            action: (selectedItems) => handleBulkAction('imprimir')
          },
          {
            label: 'Detalhamento Financeiro',
            action: (selectedItems) => handleBulkAction('detalhamento_financeiro')
          }
        ]}
        onSort={() => {}}
        sortColumn=""
        sortDirection="asc"
        onRefresh={() => {}}
      />
    </div>
  );
};

export default ClienteContratos;
