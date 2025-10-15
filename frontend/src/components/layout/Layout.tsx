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

      {/* Modal Único com Conteúdo Dinâmico */}
      {activeModal && (
        <DraggableModal
          show={true}
          onClose={closeModal}
          title={
            activeModal === 'clientes' ? 'Clientes' :
            activeModal === 'planos' ? 'Planos' :
            activeModal === 'bancos' ? 'Bancos' :
            activeModal === 'contratos' ? 'Contratos' :
            activeModal === 'dados-empresa' ? 'Empresa' :
            activeModal === 'parametros' ? 'Parâmetros' :
            ''
          }
          size="xl"
          modalId="layout-unified-modal"
        >
          {/* Renderizar apenas o conteúdo do modal ativo */}
          <div style={{ height: '100%', overflow: 'auto' }} className="unified-modal-content">
            <style>{`
              /* Reset completo para modais aninhados */
              .unified-modal-content .modal-backdrop {
                display: none !important;
              }
              
              .unified-modal-content .draggable-modal-container {
                position: static !important;
                width: 100% !important;
                height: auto !important;
                max-height: none !important;
                border: none !important;
                border-radius: 0 !important;
                box-shadow: none !important;
                background: transparent !important;
                padding: 0 !important;
                margin: 0 !important;
                transform: none !important;
                opacity: 1 !important;
                transition: none !important;
                display: block !important;
              }
              
              /* Ocultar apenas o header duplicado */
              .unified-modal-content .modal-header-draggable {
                display: none !important;
              }
              
              /* Garantir que todo conteúdo seja visível */
              .unified-modal-content * {
                visibility: visible !important;
                display: inherit !important;
              }
              
              /* Forçar visibilidade de elementos específicos */
              .unified-modal-content .btn,
              .unified-modal-content .table,
              .unified-modal-content .form-control,
              .unified-modal-content .form-select,
              .unified-modal-content .pagination,
              .unified-modal-content .card,
              .unified-modal-content .row,
              .unified-modal-content .col {
                display: inherit !important;
                visibility: visible !important;
              }
            `}</style>
            
            {activeModal === 'clientes' && (
              <ClienteListModal
                show={true}
                onClose={closeModal}
                title="Clientes"
              />
            )}

            {activeModal === 'planos' && (
              <PlanoListModal
                show={true}
                onClose={closeModal}
                title="Planos"
              />
            )}

            {activeModal === 'bancos' && (
              <BancoListModal
                show={true}
                onClose={closeModal}
                title="Bancos"
              />
            )}

            {activeModal === 'contratos' && (
              <ContratoListModal
                show={true}
                onClose={closeModal}
              />
            )}

            {activeModal === 'dados-empresa' && (
              <DadosEmpresaModal
                show={true}
                onClose={closeModal}
              />
            )}

            {activeModal === 'parametros' && (
              <ParametrosModal
                show={true}
                onClose={closeModal}
              />
            )}
          </div>
        </DraggableModal>
      )}

    </div>
  );
};

export default Layout;