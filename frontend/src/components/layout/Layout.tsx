import React, { useState } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import NotificationContainer from '../common/NotificationContainer';
import { useNotificationContext } from '../../contexts/NotificationContext';
import { useTheme } from '../../contexts/ThemeContext';
import DropdownMenu from '../common/DropdownMenu';
import { Button } from '../ui';
import { ClienteListModal } from '../modals/clientes';
import { PlanoListModal } from '../modals/planos';
import { BancoListModal } from '../modals/bancos';
import ContratoListModal from '../modals/contratos/ContratoListModal';
import DadosEmpresaModal from '../modals/empresa/DadosEmpresaModal';
import RecursosSistemaModal from '../modals/parametros/RecursosSistemaModal';
import ServidorEmailModal from '../modals/parametros/ServidorEmailModal';
import ServidorWhatsappModal from '../modals/parametros/ServidorWhatsappModal';
import DocumentosSistemaModal from '../modals/parametros/DocumentosSistemaModal';
import DiasVencimentoModal from '../modals/parametros/DiasVencimentoModal';
import AtualizacoesModal from '../modals/parametros/AtualizacoesModal';
import AgendadorTarefasModal from '../modals/parametros/AgendadorTarefasModal';

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
    { path: '/dados-empresa', icon: 'bi-building', label: 'Dados da Empresa', isModal: true, modalHandler: () => openModal('dados-empresa') },
  ];

  const parametrosDropdownItems = [
    { id: 'recursos-sistema', label: 'Recursos do Sistema', icon: 'bi-gear', onClick: () => openModal('recursos-sistema') },
    { id: 'agendador-tarefas', label: 'Agendador de Tarefas', icon: 'bi-clock-history', onClick: () => openModal('agendador-tarefas') },
    { id: 'servidor-email', label: 'Servidor de E-Mail', icon: 'bi-envelope', onClick: () => openModal('servidor-email') },
    { id: 'servidor-whatsapp', label: 'Servidor de WhatsApp', icon: 'bi-whatsapp', onClick: () => openModal('servidor-whatsapp') },
    { id: 'documentos-sistema', label: 'Documentos do Sistema', icon: 'bi-file-earmark-text', onClick: () => openModal('documentos-sistema') },
    { id: 'dias-vencimento', label: 'Dias de Vencimento', icon: 'bi-calendar', onClick: () => openModal('dias-vencimento') },
    { id: 'atualizacoes', label: 'Atualizações', icon: 'bi-arrow-up-circle', onClick: () => openModal('atualizacoes') },
  ];

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <i className="bi bi-broadcast"></i>
          </div>
          <h1 className="sidebar-title">BackNet</h1>
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
                <i className={`bi ${item.icon}`}></i>
                <span>{item.label}</span>
              </Link>
            </div>
          ))}
          
          {/* Menu Dropdown para Parâmetros */}
          <div className="sidebar-nav-item">
            <DropdownMenu
              label="Parâmetros"
              icon="bi-gear"
              items={parametrosDropdownItems}
              className="w-100"
            />
          </div>
        </nav>
      </aside>

      {/* Main Layout */}
      <div className="main-layout">
        {/* Header */}
        <header className="main-header">
          <div className="d-flex align-items-center">
            <Button 
              variant="outline-secondary"
              size="sm"
              icon="list"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="d-md-none me-3"
              style={{ color: 'var(--text-primary)' }}
              tooltip="Abrir/Fechar menu"
            >
              {''}
            </Button>
            <h2 className="h4 mb-0">
              Dashboard
            </h2>
          </div>
          
          <div className="d-flex align-items-center gap-3">
            <Button 
              variant="outline-secondary"
              size="sm"
              icon={theme === 'light' ? 'moon' : 'sun'}
              onClick={toggleTheme}
              tooltip={`Alternar para tema ${theme === 'light' ? 'escuro' : 'claro'}`}
              className="theme-toggle"
            >
              {''}
            </Button>
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

      {/* Modais sempre renderizados, apenas mudando show */}
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
        title="Contratos"
      />
      
      <DadosEmpresaModal
        show={activeModal === 'dados-empresa'}
        onClose={closeModal}
      />
      
      {/* Modais de Parâmetros */}
      <RecursosSistemaModal
        show={activeModal === 'recursos-sistema'}
        onClose={closeModal}
      />
      
      <ServidorEmailModal
        show={activeModal === 'servidor-email'}
        onClose={closeModal}
      />
      
      <ServidorWhatsappModal
        show={activeModal === 'servidor-whatsapp'}
        onClose={closeModal}
      />
      
      <DocumentosSistemaModal
        show={activeModal === 'documentos-sistema'}
        onClose={closeModal}
      />
      
      <DiasVencimentoModal
        show={activeModal === 'dias-vencimento'}
        onClose={closeModal}
      />

      <AtualizacoesModal
        show={activeModal === 'atualizacoes'}
        onClose={closeModal}
      />

      <AgendadorTarefasModal
        show={activeModal === 'agendador-tarefas'}
        onClose={closeModal}
      />

    </div>
  );
};

export default Layout;