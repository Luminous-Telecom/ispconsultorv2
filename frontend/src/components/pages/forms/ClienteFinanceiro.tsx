import React, { useState } from 'react';
import DataTable from '../../common/DataTable';

interface ClienteFinanceiroProps {
  cliente: any;
  onDataChange: (field: string, value: any) => void;
}

const ClienteFinanceiro: React.FC<ClienteFinanceiroProps> = ({ 
  cliente, 
  onDataChange 
}) => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (tabIndex: number) => {
    setActiveTab(tabIndex);
  };

  // Mock data para demonstração
  const mockCarnes = [
    {
      id: 1,
      numero_carne: 'CAR2024001',
      status: 'ativo',
      valor_total: 1500.00,
      data_vencimento: '2024-12-15',
      banco: { nome: 'EFI' }
    }
  ];

  const mockParcelas = [
    {
      id: 1,
      numero_parcela: 1,
      status: 'pago',
      valor_parcela: 125.00,
      data_vencimento: '2024-01-15',
      data_pagamento: '2024-01-10'
    }
  ];

  const carnesColumns = [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'numero_carne', label: 'Número', sortable: true },
    { 
      key: 'status', 
      label: 'Status', 
      render: (item: any) => (
        <span className={`badge ${item.status === 'ativo' ? 'bg-success' : item.status === 'pago' ? 'bg-info' : 'bg-secondary'}`}>
          {item.status}
        </span>
      )
    },
    { key: 'valor_total', label: 'Valor Total', render: (item: any) => `R$ ${item.valor_total?.toFixed(2) || '0.00'}` },
    { key: 'data_vencimento', label: 'Vencimento', sortable: true },
    { key: 'banco.nome', label: 'Banco' },
    {
      key: 'actions',
      label: 'Ações',
      render: (item: any) => (
        <div className="btn-group btn-group-sm">
          <button className="btn btn-outline-primary" title="Visualizar">
            <i className="bi bi-eye"></i>
          </button>
          <button className="btn btn-outline-secondary" title="Editar">
            <i className="bi bi-pencil"></i>
          </button>
          <button className="btn btn-outline-info" title="Imprimir">
            <i className="bi bi-printer"></i>
          </button>
        </div>
      )
    }
  ];

  const parcelasColumns = [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'numero_parcela', label: 'Parcela', sortable: true },
    { 
      key: 'status', 
      label: 'Status', 
      render: (item: any) => (
        <span className={`badge ${item.status === 'pago' ? 'bg-success' : item.status === 'vencido' ? 'bg-danger' : 'bg-secondary'}`}>
          {item.status}
        </span>
      )
    },
    { key: 'valor_parcela', label: 'Valor', render: (item: any) => `R$ ${item.valor_parcela?.toFixed(2) || '0.00'}` },
    { key: 'data_vencimento', label: 'Vencimento', sortable: true },
    { key: 'data_pagamento', label: 'Pagamento', sortable: true },
    {
      key: 'actions',
      label: 'Ações',
      render: (item: any) => (
        <div className="btn-group btn-group-sm">
          <button className="btn btn-outline-success" title="Marcar como Pago">
            <i className="bi bi-check"></i>
          </button>
          <button className="btn btn-outline-info" title="Imprimir">
            <i className="bi bi-printer"></i>
          </button>
        </div>
      )
    }
  ];

  if (!cliente) {
    return (
      <div>Carregando dados do cliente...</div>
    );
  }

  return (
    <div className="card">
      <div className="card-body">
        <h5 className="card-title mb-3">
          Financeiro do Cliente
        </h5>

        <ul className="nav nav-tabs" role="tablist">
          <li className="nav-item" role="presentation">
            <button
              className={`nav-link ${activeTab === 0 ? 'active' : ''}`}
              onClick={() => handleTabChange(0)}
              type="button"
              role="tab"
            >
              Carnês ({mockCarnes.length})
            </button>
          </li>
          <li className="nav-item" role="presentation">
            <button
              className={`nav-link ${activeTab === 1 ? 'active' : ''}`}
              onClick={() => handleTabChange(1)}
              type="button"
              role="tab"
            >
              Títulos Individuais ({mockParcelas.length})
            </button>
          </li>
        </ul>

        <div className="tab-content">
          <div className={`tab-pane fade ${activeTab === 0 ? 'show active' : ''}`}>
            <div className="d-flex justify-content-between align-items-center mb-3 mt-3">
              <h6 className="mb-0">Carnês</h6>
              <div className="btn-group">
                <button className="btn btn-primary btn-sm">
                  <i className="bi bi-plus me-1"></i>
                  Novo Carnê
                </button>
                <button className="btn btn-outline-secondary btn-sm">
                  <i className="bi bi-arrow-clockwise"></i>
                </button>
              </div>
            </div>
            
            <DataTable
              data={mockCarnes}
              columns={carnesColumns}
              isLoading={false}
              limit={10}
              setLimit={() => {}}
              setPage={() => {}}
              bulkActions={[
                {
                  label: 'Visualizar',
                  action: (selectedItems) => console.log('Visualizar carnês:', selectedItems)
                },
                {
                  label: 'Editar',
                  action: (selectedItems) => console.log('Editar carnês:', selectedItems)
                },
                {
                  label: 'Imprimir',
                  action: (selectedItems) => console.log('Imprimir carnês:', selectedItems)
                }
              ]}
            />
          </div>

          <div className={`tab-pane fade ${activeTab === 1 ? 'show active' : ''}`}>
            <div className="d-flex justify-content-between align-items-center mb-3 mt-3">
              <h6 className="mb-0">Títulos Individuais</h6>
              <div className="btn-group">
                <button className="btn btn-primary btn-sm">
                  <i className="bi bi-plus me-1"></i>
                  Novo Título
                </button>
                <button className="btn btn-outline-secondary btn-sm">
                  <i className="bi bi-arrow-clockwise"></i>
                </button>
              </div>
            </div>
            
            <DataTable
              data={mockParcelas}
              columns={parcelasColumns}
              isLoading={false}
              limit={10}
              setLimit={() => {}}
              setPage={() => {}}
              bulkActions={[
                {
                  label: 'Marcar como Pago',
                  action: (selectedItems) => console.log('Marcar como pago:', selectedItems),
                  disabled: (selectedItems) => selectedItems.every(item => item.status === 'pago')
                },
                {
                  label: 'Imprimir',
                  action: (selectedItems) => console.log('Imprimir parcelas:', selectedItems)
                }
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClienteFinanceiro;
