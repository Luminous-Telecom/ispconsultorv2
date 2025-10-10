import React, { useState } from 'react';
import DataTable from '../../common/DataTable';
import { ContratoCreateModal } from '../../modals/contratos';

interface ClienteContratosProps {
  cliente: any;
  onDataChange: (field: string, value: any) => void;
}

const ClienteContratos: React.FC<ClienteContratosProps> = ({ 
  cliente, 
  onDataChange 
}) => {
  const [sortColumn, setSortColumn] = useState<string>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showContratoCreateModal, setShowContratoCreateModal] = useState(false);

  // Mock data para contratos
  const mockContratos = [
    {
      id: 12,
      plano: 'Plano Full Core',
      valor_plano: 1518.00,
      status: 'ativo',
      desconto_percentual: '0.00',
      desconto_valor: '0.00',
      valor_final: 89.90,
      data_inicio: '29/09/2025',
      data_fim: '-',
      isento: 'Não',
      dia_vencimento: 20,
      banco: 'EFI-PJ-TESTE'
    }
  ];


  const handleBulkAction = (action: string) => {
  };

  // Funções de ordenação
  const handleSort = (column: string, direction: 'asc' | 'desc') => {
    setSortColumn(column);
    setSortDirection(direction);
  };

  const getSortedContratos = () => {
    if (!mockContratos || !sortColumn) {
      return mockContratos;
    }

    return [...mockContratos].sort((a, b) => {
      let aValue = (a as any)[sortColumn];
      let bValue = (b as any)[sortColumn];

      // Tratar campos especiais
      if (sortColumn === 'valor') {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
      }

      // Converter para string se necessário para comparação
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
      }
      if (typeof bValue === 'string') {
        bValue = bValue.toLowerCase();
      }

      // Tratar valores null/undefined
      if (aValue == null) aValue = '';
      if (bValue == null) bValue = '';

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'ativo':
        return 'success';
      case 'suspenso':
        return 'warning';
      case 'cancelado':
        return 'danger';
      case 'inativo':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  const contratosColumns = [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'plano', label: 'Plano', sortable: true },
    { key: 'valor_plano', label: 'Valor Plano', sortable: true },
    { 
      key: 'status', 
      label: 'Status',
      render: (item: any) => (
        <span className={`badge bg-${getStatusColor(item.status)}`}>
          {item.status}
        </span>
      )
    },
    { key: 'desconto_percentual', label: 'Desconto %', sortable: true },
    { key: 'desconto_valor', label: 'Desconto R$', sortable: true },
    { key: 'valor_final', label: 'Valor Final', sortable: true },
    { key: 'data_inicio', label: 'Data Início', sortable: true },
    { key: 'data_fim', label: 'Data Fim', sortable: true },
    { key: 'isento', label: 'Isento', sortable: true },
    { key: 'dia_vencimento', label: 'Dia Venc.', sortable: true },
    { key: 'banco', label: 'Banco', sortable: true }
  ];

  if (!cliente) {
    return (
      <div>Carregando dados do cliente...</div>
    );
  }

  return (
    <div>
      <small className="mb-1 fw-bold">
        Contratos do Cliente
      </small>

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="mb-0">Contratos ({mockContratos.length})</h6>
      </div>

      <DataTable
        data={getSortedContratos()}
        columns={contratosColumns}
        isLoading={false}
        pagination={{
          from: 1,
          to: mockContratos.length,
          total: mockContratos.length,
          current_page: 1,
          last_page: 1
        }}
        limit={10}
        setLimit={() => {}}
        setPage={() => {}}
        emptyMessage="Nenhum contrato encontrado"
        searchPlaceholder="Buscar contratos..."
        onSearch={() => {}}
        bulkActions={[
          {
            label: 'Novo Contrato',
            action: () => setShowContratoCreateModal(true)
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
        onSort={handleSort}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onRefresh={() => {}}
        onSelectionChange={() => {}}
      />

         {/* Modal de criação de contrato */}
         <ContratoCreateModal
           show={showContratoCreateModal}
           onClose={() => setShowContratoCreateModal(false)}
           onSuccess={() => {
             // Atualizar lista de contratos
           }}
           clienteId={cliente?.id}
         />
       </div>
     );
   };
   
   export default ClienteContratos;
