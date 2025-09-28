import React, { useState } from 'react';

interface ClienteContratosProps {
  cliente: any;
  onDataChange: (field: string, value: any) => void;
}

const ClienteContratos: React.FC<ClienteContratosProps> = ({ 
  cliente, 
  onDataChange 
}) => {
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [showCancelados, setShowCancelados] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelected = mockContratos.map((contrato) => contrato.id);
      setSelectedItems(newSelected);
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (id: number) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const handleBulkAction = (action: string) => {
    console.log(`${action} contratos:`, selectedItems);
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

  const filteredContratos = mockContratos.filter(contrato =>
    contrato.filial.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contrato.plano_vendas.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!cliente) {
    return (
      <div>Carregando dados do cliente...</div>
    );
  }

  return (
    <div className="card">
      <div className="card-body p-2">
        <div className="d-flex justify-content-between align-items-center mb-1">
          <small className="card-title mb-0 fw-bold">
            Contratos do Cliente
          </small>
          <button
            className="btn btn-primary"
            onClick={() => handleBulkAction('novo')}
          >
            <i className="bi bi-plus me-1"></i>
            Novo Contrato
          </button>
        </div>

        {/* Filtros e ações */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="d-flex gap-2 align-items-center">
            <div className="input-group" style={{ width: '300px' }}>
              <span className="input-group-text">
                <i className="bi bi-search"></i>
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Buscar contratos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                checked={showCancelados}
                onChange={(e) => setShowCancelados(e.target.checked)}
              />
              <label className="form-check-label">
                Mostrar cancelados
              </label>
            </div>
          </div>

          <div className="btn-group">
            <button
              className="btn btn-outline-secondary btn-sm"
              disabled={selectedItems.length === 0}
              onClick={() => handleBulkAction('editar')}
            >
              <i className="bi bi-pencil me-1"></i>
              Editar
            </button>
            <button
              className="btn btn-outline-danger btn-sm"
              disabled={selectedItems.length === 0}
              onClick={() => handleBulkAction('deletar')}
            >
              <i className="bi bi-trash me-1"></i>
              Deletar
            </button>
            <button
              className="btn btn-outline-info btn-sm"
              disabled={selectedItems.length === 0}
              onClick={() => handleBulkAction('alteracao_wizard')}
            >
              <i className="bi bi-magic me-1"></i>
              Alteração Wizard
            </button>
            <button
              className="btn btn-outline-primary btn-sm"
              disabled={selectedItems.length === 0}
              onClick={() => handleBulkAction('imprimir')}
            >
              <i className="bi bi-printer me-1"></i>
              Imprimir
            </button>
            <button
              className="btn btn-outline-success btn-sm"
              disabled={selectedItems.length === 0}
              onClick={() => handleBulkAction('detalhamento_financeiro')}
            >
              <i className="bi bi-graph-up me-1"></i>
              Detalhamento Financeiro
            </button>
          </div>
        </div>

        {/* Tabela de contratos */}
        <div className="table-responsive">
          <table className="table table-striped table-hover">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={filteredContratos.length > 0 && selectedItems.length === filteredContratos.length}
                    onChange={handleSelectAll}
                  />
                </th>
                <th>ID</th>
                <th>Filial</th>
                <th>Status Contrato</th>
                <th>Status Acesso</th>
                <th>Plano de Vendas</th>
                <th>Data Ativação</th>
                <th>Data Vencimento</th>
                <th>Valor</th>
                <th>Observações</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredContratos.map((contrato) => (
                <tr key={contrato.id}>
                  <td>
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={selectedItems.includes(contrato.id)}
                      onChange={() => handleSelectItem(contrato.id)}
                    />
                  </td>
                  <td>{contrato.id}</td>
                  <td>{contrato.filial}</td>
                  <td>
                    <span className={`badge bg-${getStatusColor(contrato.status_contrato)}`}>
                      {contrato.status_contrato}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${contrato.status_acesso === 'Liberado' ? 'bg-success' : 'bg-danger'}`}>
                      {contrato.status_acesso}
                    </span>
                  </td>
                  <td>{contrato.plano_vendas}</td>
                  <td>{contrato.data_ativacao}</td>
                  <td>{contrato.data_vencimento}</td>
                  <td>R$ {contrato.valor.toFixed(2)}</td>
                  <td>{contrato.observacoes}</td>
                  <td>
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        <div className="d-flex justify-content-between align-items-center mt-3">
          <div className="btn-group">
            <button className="btn btn-outline-secondary btn-sm">Primeira</button>
            <button className="btn btn-outline-secondary btn-sm">Anterior</button>
            <button className="btn btn-outline-secondary btn-sm">
              <i className="bi bi-arrow-clockwise"></i>
            </button>
            <button className="btn btn-outline-secondary btn-sm">Próxima</button>
            <button className="btn btn-outline-secondary btn-sm">Última</button>
          </div>
          
          <button className="btn btn-outline-primary btn-sm">
            <i className="bi bi-download"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClienteContratos;
