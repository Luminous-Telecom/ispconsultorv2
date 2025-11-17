import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { useNotificationContext } from '../notifications/NotificationProvider';
import NotificationContainer from '../notifications/NotificationContainer';
import { useTheme } from '../../contexts/ThemeContext';
import DropdownMenu from '../common/DropdownMenu';
import { Button } from '../ui';
import { ClienteListModal } from '../modals/clientes';
import { PlanoListModal } from '../modals/planos';
import { BancoListModal } from '../modals/bancos';
import ContratoListModal from '../modals/contratos/ContratoListModal';
import { DadosEmpresaModal } from '../modals/empresa/empresa';
import RecursosSistemaModal from '../modals/parametros/RecursosSistemaModal';
import { ServidorEmailModal } from '../modals/parametros/servidor-email';
import { ServidorWhatsappModal } from '../modals/parametros/servidor-whatsapp';
import { DocumentosSistemaModal } from '../modals/parametros/documentos-sistema';
import DiasVencimentoModal from '../modals/parametros/DiasVencimentoModal';
import AtualizacoesModal from '../modals/parametros/AtualizacoesModal';
import AgendadorTarefasModal from '../modals/parametros/AgendadorTarefasModal';
import { authService } from '../../services/authService';
import { getAuthToken } from '../../services/core';

const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    notifications,
    removeNotification,
    pauseNotification,
    resumeNotification,
    success,
  } = useNotificationContext();
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

  useEffect(() => {
    const timer = setTimeout(() => {
      const token = getAuthToken();
      if (location.pathname !== '/login' && !token) {
        navigate('/login', { replace: true });
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [navigate, location.pathname]);

  const handleLogout = () => {
    authService.logout();
    success('Sessão encerrada com sucesso.');
    navigate('/login');
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
              {item.isModal ? (
                <button
                  type="button"
                  className={`sidebar-nav-link ${isActive(item.path) ? 'active' : ''}`}
                  onClick={() => {
                    item.modalHandler?.();
                    setSidebarOpen(false);
                  }}
                  style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', padding: '0.5rem 1rem', color: 'inherit' }}
                >
                  <i className={`bi ${item.icon}`}></i>
                  <span>{item.label}</span>
                </button>
              ) : (
                <Link 
                  to={item.path}
                  className={`sidebar-nav-link ${isActive(item.path) ? 'active' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <i className={`bi ${item.icon}`}></i>
                  <span>{item.label}</span>
                </Link>
              )}
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
            <Button
              variant="outline-danger"
              size="sm"
              onClick={handleLogout}
            >
              Sair
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
            position="bottom-right"
            notifications={notifications}
            onRemove={removeNotification}
            onPause={pauseNotification}
            onResume={resumeNotification}
            onActionClick={() => {}}
          />

      {/* Modais renderizados condicionalmente apenas quando necessário */}
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
          title="Contratos"
        />
      )}
      
      {activeModal === 'dados-empresa' && (
        <DadosEmpresaModal
          show={true}
          onClose={closeModal}
        />
      )}
      
      {/* Modais de Parâmetros */}
      {activeModal === 'recursos-sistema' && (
        <RecursosSistemaModal
          show={true}
          onClose={closeModal}
        />
      )}
      
      {activeModal === 'servidor-email' && (
        <ServidorEmailModal
          show={true}
          onClose={closeModal}
        />
      )}
      
      {activeModal === 'servidor-whatsapp' && (
        <ServidorWhatsappModal
          show={true}
          onClose={closeModal}
        />
      )}
      
      {activeModal === 'documentos-sistema' && (
        <DocumentosSistemaModal
          show={true}
          onClose={closeModal}
        />
      )}
      
      {activeModal === 'dias-vencimento' && (
        <DiasVencimentoModal
          show={true}
          onClose={closeModal}
        />
      )}

      {activeModal === 'atualizacoes' && (
        <AtualizacoesModal
          show={true}
          onClose={closeModal}
        />
      )}

      {activeModal === 'agendador-tarefas' && (
        <AgendadorTarefasModal
          show={true}
          onClose={closeModal}
        />
      )}

    </div>
  );
};

export default Layout;