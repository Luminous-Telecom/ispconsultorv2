import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ClienteService } from '../../services/clienteService';
import { useNotificationContext } from '../../contexts/NotificationContext';

// Importar componentes das abas
import ClienteDadosBasicos from './forms/ClienteDadosBasicos';
import ClienteEndereco from './forms/ClienteEndereco';
import ClienteContato from './forms/ClienteContato';
import ClienteFinanceiro from './forms/ClienteFinanceiro';
import ClienteContratos from './forms/ClienteContratos';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`cliente-tabpanel-${index}`}
      aria-labelledby={`cliente-tab-${index}`}
      {...other}
    >
      {value === index && (
        <div className="p-3">
          {children}
        </div>
      )}
    </div>
  );
}

const ClienteEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addNotification } = useNotificationContext();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState(0);
  const [hasChanges, setHasChanges] = useState(false);
  const [clienteData, setClienteData] = useState<any>(null);

  // Buscar dados do cliente
  const { 
    data: cliente, 
    isLoading, 
    error: clienteError 
  } = useQuery({
    queryKey: ['cliente', id],
    queryFn: () => ClienteService.getById(Number(id)),
    enabled: !!id,
  });

  // Mutation para atualizar cliente
  const updateClienteMutation = useQuery({
    queryKey: ['updateCliente'],
    queryFn: () => ClienteService.update(Number(id), clienteData),
    enabled: false,
  });

  useEffect(() => {
    if (cliente) {
      setClienteData(cliente);
    }
  }, [cliente]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleSave = async () => {
    try {
      await ClienteService.update(Number(id), clienteData);
      addNotification('success', 'Cliente atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['cliente', id] });
      setHasChanges(false);
    } catch (error) {
      addNotification('error', 'Erro ao atualizar cliente');
    }
  };

  const handleCancel = () => {
    setClienteData(cliente);
    setHasChanges(false);
  };

  const handleDataChange = (field: string, value: any) => {
    setClienteData((prev: any) => ({
      ...prev,
      [field]: value
    }));
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Carregando...</span>
        </div>
        <span className="ms-2">Carregando dados do cliente...</span>
      </div>
    );
  }

  if (clienteError || !cliente) {
    return (
      <div className="p-3">
        <div className="alert alert-danger">
          Erro ao carregar dados do cliente
        </div>
      </div>
    );
  }

  return (
    <div className="p-3">
      {/* Cabeçalho com ações globais */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="h4 fw-bold mb-0">
          Editar Cliente - {cliente.razao_social || cliente.nome_fantasia}
        </h1>
        
        <div className="d-flex gap-2">
          <button
            className="btn btn-primary"
            onClick={() => navigate('/clientes/create')}
          >
            <i className="bi bi-plus me-1"></i>
            Novo
          </button>
          <button
            className="btn btn-success"
            disabled={!hasChanges}
            onClick={handleSave}
          >
            <i className="bi bi-check me-1"></i>
            Salvar
          </button>
          <button
            className="btn btn-outline-secondary"
            onClick={handleCancel}
          >
            <i className="bi bi-x me-1"></i>
            Cancelar
          </button>
          <button
            className="btn btn-outline-primary"
            onClick={() => navigate('/clientes')}
          >
            <i className="bi bi-arrow-left me-1"></i>
            Voltar
          </button>
          <button
            className="btn btn-outline-danger"
            title="Deletar Cliente"
          >
            <i className="bi bi-trash"></i>
          </button>
          <button
            className="btn btn-outline-info"
            title="Localização"
          >
            <i className="bi bi-geo-alt"></i>
          </button>
          <button
            className="btn btn-outline-warning"
            title="Enviar notificação push"
          >
            <i className="bi bi-bell"></i>
          </button>
        </div>
      </div>

      <hr className="mb-3" />

      {/* Sistema de abas */}
      <div className="card">
        <div className="card-header">
          <ul className="nav nav-tabs card-header-tabs" role="tablist">
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 0 ? 'active' : ''}`}
                onClick={() => setActiveTab(0)}
                type="button"
                role="tab"
              >
                Cliente
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 1 ? 'active' : ''}`}
                onClick={() => setActiveTab(1)}
                type="button"
                role="tab"
              >
                Endereço
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 2 ? 'active' : ''}`}
                onClick={() => setActiveTab(2)}
                type="button"
                role="tab"
              >
                Contato
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 3 ? 'active' : ''}`}
                onClick={() => setActiveTab(3)}
                type="button"
                role="tab"
              >
                Financeiro
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 4 ? 'active' : ''}`}
                onClick={() => setActiveTab(4)}
                type="button"
                role="tab"
              >
                Contratos
              </button>
            </li>
          </ul>
        </div>

        <div className="card-body">
          <TabPanel value={activeTab} index={0}>
            <ClienteDadosBasicos 
              cliente={clienteData} 
              onDataChange={handleDataChange}
            />
          </TabPanel>
          
          <TabPanel value={activeTab} index={1}>
            <ClienteEndereco 
              cliente={clienteData} 
              onDataChange={handleDataChange}
            />
          </TabPanel>
          
          <TabPanel value={activeTab} index={2}>
            <ClienteContato 
              cliente={clienteData} 
              onDataChange={handleDataChange}
            />
          </TabPanel>
          
          <TabPanel value={activeTab} index={3}>
            <ClienteFinanceiro 
              cliente={clienteData} 
              onDataChange={handleDataChange}
            />
          </TabPanel>
          
          <TabPanel value={activeTab} index={4}>
            <ClienteContratos 
              cliente={clienteData} 
              onDataChange={handleDataChange}
            />
          </TabPanel>
        </div>
      </div>
    </div>
  );
};

export default ClienteEdit;
