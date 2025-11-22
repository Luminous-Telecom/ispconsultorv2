import React, { useEffect, useState, lazy, Suspense } from 'react';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { useNotificationContext } from '../notifications/NotificationProvider';
import NotificationContainer from '../notifications/NotificationContainer';
import { useTheme } from '@/contexts/ThemeContext';
import DropdownMenu from '../common/DropdownMenu';
import { Button } from '../ui';
import { useDashboardFilters } from '@/contexts/DashboardFiltersContext';
import Loading from '../common/Loading';
import { authService, CurrentUser } from '@/services/authService';
import { getAuthToken } from '@/services/core';

// Modais com lazy loading (code splitting) - carregados apenas quando necessário
// Named exports
const ClienteListModal = lazy(() => import('../modals/clientes').then(m => ({ default: m.ClienteListModal })));
const PlanoListModal = lazy(() => import('../modals/planos').then(m => ({ default: m.PlanoListModal })));
const BancoListModal = lazy(() => import('../modals/bancos').then(m => ({ default: m.BancoListModal })));
const DadosEmpresaModal = lazy(() => import('../modals/empresa/empresa').then(m => ({ default: m.DadosEmpresaModal })));
const ServidorEmailModal = lazy(() => import('../modals/parametros/servidor-email').then(m => ({ default: m.ServidorEmailModal })));
const ServidorWhatsappModal = lazy(() => import('../modals/parametros/servidor-whatsapp').then(m => ({ default: m.ServidorWhatsappModal })));
const DocumentosSistemaModal = lazy(() => import('../modals/parametros/documentos-sistema').then(m => ({ default: m.DocumentosSistemaModal })));

// Default exports
const ContratoListModal = lazy(() => import('../modals/contratos/ContratoListModal'));
const FinanceiroModal = lazy(() => import('../modals/financeiro/FinanceiroModal'));
const UsuariosModal = lazy(() => import('../modals/parametros/UsuariosModal'));
const RecursosSistemaModal = lazy(() => import('../modals/parametros/RecursosSistemaModal'));
const DiasVencimentoModal = lazy(() => import('../modals/parametros/DiasVencimentoModal'));
const AtualizacoesModal = lazy(() => import('../modals/parametros/AtualizacoesModal'));
const AgendadorTarefasModal = lazy(() => import('../modals/parametros/AgendadorTarefasModal'));

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
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  
  // Dashboard filters (apenas na rota do dashboard)
  const isDashboard = location.pathname === '/adm' || location.pathname === '/adm/dashboard';
  const dashboardFilters = useDashboardFilters();
  
  // Estado para controlar qual modal está aberto (apenas um por vez)
  const [activeModal, setActiveModal] = useState<string | null>(null);
  
  // Carregar usuário atual da API
  useEffect(() => {
    const loadCurrentUser = async () => {
      const token = getAuthToken();
      if (token) {
        try {
          const response = await authService.getCurrentUser();
          if (response.success && response.data) {
            setCurrentUser(response.data);
          }
        } catch (error) {
          // Silenciosamente falhar se não conseguir carregar o usuário
        }
      }
    };
    
    loadCurrentUser();
  }, []);
  
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
    { path: '/financeiro', icon: 'bi-cash-coin', label: 'Financeiro', isModal: true, modalHandler: () => openModal('financeiro') },
    { path: '/dados-empresa', icon: 'bi-building', label: 'Dados da Empresa', isModal: true, modalHandler: () => openModal('dados-empresa') },
  ];

  const parametrosDropdownItems = [
    { id: 'usuarios', label: 'Usuários', icon: 'bi-people', onClick: () => openModal('usuarios') },
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
          <div className="sidebar-title-wrapper">
            <h1 className="sidebar-title">BackNet</h1>
            {currentUser?.nome && (
              <p className="sidebar-user-name">{currentUser.nome}</p>
            )}
          </div>
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
          <div className="d-flex align-items-center flex-grow-1">
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
            <h2 className="h4 mb-0 me-4">
              Dashboard
            </h2>
            {isDashboard && (
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <span className="text-muted small me-1">Data inicial:</span>
                <input
                  type="date"
                  id="dashboard-start-date"
                  name="dashboard-start-date"
                  value={dashboardFilters.startDate}
                  onChange={(e) => {
                    dashboardFilters.setStartDate(e.target.value);
                    if (dashboardFilters.endDate && new Date(`${e.target.value}T00:00:00`) > new Date(`${dashboardFilters.endDate}T00:00:00`)) {
                      dashboardFilters.setEndDate(e.target.value);
                    }
                  }}
                  className="form-control form-control-sm"
                  style={{ width: '150px' }}
                />
                <span className="text-muted small me-1">Data final:</span>
                <input
                  type="date"
                  id="dashboard-end-date"
                  name="dashboard-end-date"
                  value={dashboardFilters.endDate}
                  onChange={(e) => {
                    if (dashboardFilters.startDate && new Date(`${e.target.value}T00:00:00`) < new Date(`${dashboardFilters.startDate}T00:00:00`)) {
                      dashboardFilters.setEndDate(dashboardFilters.startDate);
                      return;
                    }
                    dashboardFilters.setEndDate(e.target.value);
                  }}
                  className="form-control form-control-sm"
                  style={{ width: '150px' }}
                />
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={dashboardFilters.handleResetPeriod}>
                  Mês atual
                </button>
              </div>
            )}
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

      {/* Modais renderizados condicionalmente apenas quando necessário (com lazy loading) */}
      {activeModal === 'clientes' && (
        <Suspense fallback={<Loading message="Carregando clientes..." />}>
          <ClienteListModal
            show={true}
            onClose={closeModal}
            title="Clientes"
          />
        </Suspense>
      )}
      
      {activeModal === 'planos' && (
        <Suspense fallback={<Loading message="Carregando planos..." />}>
          <PlanoListModal
            show={true}
            onClose={closeModal}
            title="Planos"
          />
        </Suspense>
      )}
      
      {activeModal === 'bancos' && (
        <Suspense fallback={<Loading message="Carregando bancos..." />}>
          <BancoListModal
            show={true}
            onClose={closeModal}
            title="Bancos"
          />
        </Suspense>
      )}
      
      {activeModal === 'contratos' && (
        <Suspense fallback={<Loading message="Carregando contratos..." />}>
          <ContratoListModal
            show={true}
            onClose={closeModal}
            title="Contratos"
          />
        </Suspense>
      )}
      
      {activeModal === 'financeiro' && (
        <Suspense fallback={<Loading message="Carregando financeiro..." />}>
          <FinanceiroModal
            show={true}
            onClose={closeModal}
          />
        </Suspense>
      )}
      
      {activeModal === 'dados-empresa' && (
        <Suspense fallback={<Loading message="Carregando dados da empresa..." />}>
          <DadosEmpresaModal
            show={true}
            onClose={closeModal}
          />
        </Suspense>
      )}
      
      {/* Modais de Parâmetros */}
      {activeModal === 'usuarios' && (
        <Suspense fallback={<Loading message="Carregando usuários..." />}>
          <UsuariosModal
            show={true}
            onClose={closeModal}
          />
        </Suspense>
      )}
      
      {activeModal === 'recursos-sistema' && (
        <Suspense fallback={<Loading message="Carregando recursos do sistema..." />}>
          <RecursosSistemaModal
            show={true}
            onClose={closeModal}
          />
        </Suspense>
      )}
      
      {activeModal === 'servidor-email' && (
        <Suspense fallback={<Loading message="Carregando servidor de e-mail..." />}>
          <ServidorEmailModal
            show={true}
            onClose={closeModal}
          />
        </Suspense>
      )}
      
      {activeModal === 'servidor-whatsapp' && (
        <Suspense fallback={<Loading message="Carregando servidor de WhatsApp..." />}>
          <ServidorWhatsappModal
            show={true}
            onClose={closeModal}
          />
        </Suspense>
      )}
      
      {activeModal === 'documentos-sistema' && (
        <Suspense fallback={<Loading message="Carregando documentos do sistema..." />}>
          <DocumentosSistemaModal
            show={true}
            onClose={closeModal}
          />
        </Suspense>
      )}
      
      {activeModal === 'dias-vencimento' && (
        <Suspense fallback={<Loading message="Carregando dias de vencimento..." />}>
          <DiasVencimentoModal
            show={true}
            onClose={closeModal}
          />
        </Suspense>
      )}

      {activeModal === 'atualizacoes' && (
        <Suspense fallback={<Loading message="Carregando atualizações..." />}>
          <AtualizacoesModal
            show={true}
            onClose={closeModal}
          />
        </Suspense>
      )}

      {activeModal === 'agendador-tarefas' && (
        <Suspense fallback={<Loading message="Carregando agendador de tarefas..." />}>
          <AgendadorTarefasModal
            show={true}
            onClose={closeModal}
          />
        </Suspense>
      )}

    </div>
  );
};

export default Layout;