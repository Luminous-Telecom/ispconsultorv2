import React, { useState } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import NotificationContainer from '../common/NotificationContainer';
import DraggableModal from '../common/DraggableModal';
import { useNotificationContext } from '../../contexts/NotificationContext';
import { useTheme } from '../../contexts/ThemeContext';
import { ClienteListModal } from '../modals/clientes';
import { PlanoListModal } from '../modals/planos';
import { BancoListModal } from '../modals/bancos';
import ContratoListModal from '../modals/contratos/ContratoListModal';
import DadosEmpresaModal from '../modals/empresa/DadosEmpresaModal';
import ParametrosModal from '../modals/parametros/ParametrosModal';

const Layout: React.FC = () => {
  const location = useLocation();
  const { notifications, removeNotification } = useNotificationContext();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Estado para controlar qual modal está aberto (apenas um por vez)
  const [activeModal, setActiveModal] = useState<string | null>(null);
  
  // Funções helper para abrir/fechar modais
  const openModal = (modalName: string) => {
    setActiveModal(modalName);
  };
  
  const closeModal = () => {
    setActiveModal(null);
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const menuItems = [
    { path: '/clientes', icon: 'bi-people', label: 'Clientes', isModal: true, modalHandler: () => openModal('clientes') },
    { path: '/planos', icon: 'bi-wifi', label: 'Planos', isModal: true, modalHandler: () => openModal('planos') },
    { path: '/bancos', icon: 'bi-bank', label: 'Bancos', isModal: true, modalHandler: () => openModal('bancos') },
    { path: '/contratos', icon: 'bi-file-earmark-text', label: 'Contratos', isModal: true, modalHandler: () => openModal('contratos') },
    { path: '/parametros', icon: 'bi-gear', label: 'Parâmetros', isModal: true, modalHandler: () => openModal('parametros') },
    { path: '/dados-empresa', icon: 'bi-building', label: 'Dados da Empresa', isModal: true, modalHandler: () => openModal('dados-empresa') },
  ];

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <i className="bi bi-broadcast"></i>
          </div>
          <h1 className="sidebar-title">CTM Telecom</h1>
        </div>
        
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <div key={item.path} className="sidebar-nav-item">
              <Link 
                to={item.path}
                className={`sidebar-nav-link ${isActive(item.path) ? 'active' : ''}`}
                onClick={(e) => {
                  if (item.isModal) {
                    e.preventDefault();
                    item.modalHandler?.();
                  }
                  setSidebarOpen(false);
                }}
              >
                {item.label}
              </Link>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Layout */}
      <div className="main-layout">
        {/* Header */}
        <header className="main-header">
          <div className="d-flex align-items-center">
            <button 
              className="btn btn-link d-md-none me-3"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{ color: 'var(--text-primary)' }}
            >
              <i className="bi bi-list"></i>
            </button>
            <h2 className="h4 mb-0">
              Dashboard
            </h2>
          </div>
          
          <div className="d-flex align-items-center gap-3">
            <button 
              className="theme-toggle"
              onClick={toggleTheme}
              title={`Alternar para tema ${theme === 'light' ? 'escuro' : 'claro'}`}
            >
              <i className={`bi ${theme === 'light' ? 'bi-moon' : 'bi-sun'}`}></i>
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="main-content">
          <Outlet />
        </main>
      </div>

          {/* Notifications */}
          <NotificationContainer
            notifications={notifications}
            onRemove={removeNotification}
          />

      {/* Renderizar todos os modais, mas mostrar apenas o ativo */}
      <ClienteListModal
        show={activeModal === 'clientes'}
        onClose={closeModal}
        title="Clientes"
      />

      <PlanoListModal
        show={activeModal === 'planos'}
        onClose={closeModal}
        title="Planos"
      />

      <BancoListModal
        show={activeModal === 'bancos'}
        onClose={closeModal}
        title="Bancos"
      />

      <ContratoListModal
        show={activeModal === 'contratos'}
        onClose={closeModal}
      />

      <DadosEmpresaModal
        show={activeModal === 'dados-empresa'}
        onClose={closeModal}
      />

      <ParametrosModal
        show={activeModal === 'parametros'}
        onClose={closeModal}
      />

    </div>
  );
};

export default Layout;