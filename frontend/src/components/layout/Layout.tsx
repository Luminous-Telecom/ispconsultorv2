import React, { useEffect, useState, useRef, lazy, Suspense } from 'react';
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
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useTableHeader } from '@/contexts/TableHeaderContext';

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
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  
  // Responsividade: Mobile-First
  const isMobile = useIsMobile();
  
  // Dashboard filters (apenas na rota do dashboard)
  const isDashboard = location.pathname === '/adm' || location.pathname === '/adm/dashboard';
  const dashboardFilters = useDashboardFilters();
  
  // Table header context (para botões de busca e reload)
  const tableHeader = useTableHeader();
  
  // Estado para controlar qual modal está aberto (apenas um por vez)
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Fechar menu de usuário ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showUserMenu]);

  // Fechar sidebar ao clicar fora (apenas no mobile)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMobile && sidebarOpen && sidebarRef.current) {
        const target = event.target as Node;
        if (!sidebarRef.current.contains(target)) {
          setSidebarOpen(false);
        }
      }
    };

    if (isMobile && sidebarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isMobile, sidebarOpen]);
  
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
      {/* Overlay para fechar sidebar no mobile */}
      {isMobile && sidebarOpen && (
        <div 
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside ref={sidebarRef} className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
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
          {/* Botão Voltar - Recolher menu (apenas mobile) */}
          {isMobile && (
            <button
              type="button"
              className="sidebar-header-back-btn"
              onClick={() => {
                setSidebarOpen(false);
              }}
              title="Recolher menu"
              aria-label="Recolher menu"
            >
              <i className="bi bi-arrow-left"></i>
            </button>
          )}
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
        {/* Header - Mobile-First Responsive */}
        <header className="main-header">
          <div className="header-container">
            {/* Linha 1: Controles principais - Layout: Esquerda | Centro | Direita */}
            <div className="header-row-1">
              {/* Esquerda: Hamburger Menu */}
              {isMobile && (
                <div className="header-left">
            <Button 
              variant="outline-secondary"
              size="sm"
              icon="list"
              onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="hamburger-btn"
              tooltip="Abrir/Fechar menu"
                    aria-label="Abrir menu lateral"
                  >
                    {''}
                  </Button>
                </div>
              )}
              
              {/* Título - Dashboard ou título da tabela */}
              <div className="header-center">
                <h1 className="header-title">{isMobile && tableHeader.title ? tableHeader.title : 'Dashboard'}</h1>
              </div>
              
              {/* Desktop: Filtros de data depois do Dashboard */}
              {isDashboard && !isMobile && (
                <div className="header-dates-desktop">
                  <div className="date-filter-group">
                    <label htmlFor="dashboard-start-date-desktop" className="date-label">
                      Data inicial:
                    </label>
                    <input
                      type="date"
                      id="dashboard-start-date-desktop"
                      name="dashboard-start-date-desktop"
                      value={dashboardFilters.startDate}
                      onChange={(e) => {
                        dashboardFilters.setStartDate(e.target.value);
                        if (dashboardFilters.endDate && new Date(`${e.target.value}T00:00:00`) > new Date(`${dashboardFilters.endDate}T00:00:00`)) {
                          dashboardFilters.setEndDate(e.target.value);
                        }
                      }}
                      className="form-control form-control-sm dashboard-date-input"
                      aria-label="Data inicial do período"
                    />
                  </div>
                  <div className="date-filter-group">
                    <label htmlFor="dashboard-end-date-desktop" className="date-label">
                      Data final:
                    </label>
                    <input
                      type="date"
                      id="dashboard-end-date-desktop"
                      name="dashboard-end-date-desktop"
                      value={dashboardFilters.endDate}
                      onChange={(e) => {
                        if (dashboardFilters.startDate && new Date(`${e.target.value}T00:00:00`) < new Date(`${dashboardFilters.startDate}T00:00:00`)) {
                          dashboardFilters.setEndDate(dashboardFilters.startDate);
                          return;
                        }
                        dashboardFilters.setEndDate(e.target.value);
                      }}
                      className="form-control form-control-sm dashboard-date-input"
                      aria-label="Data final do período"
                    />
                  </div>
                </div>
              )}
              
              {/* Direita: Menu de ações */}
              <div className="header-right">
                {isMobile ? (
                  <>
                    {/* Botões da tabela (busca e reload) */}
                    {tableHeader.showSearch && (
                      <button
                        type="button"
                        className="btn btn-link p-0"
                        onClick={() => tableHeader.setShowMobileSearch(!tableHeader.showMobileSearch)}
                        style={{
                          color: 'var(--text-primary)',
                          border: 'none',
                          background: 'none',
                          fontSize: '1.25rem',
                          minWidth: '36px',
                          minHeight: '36px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0.5rem',
                        }}
                      >
                        <i className="bi bi-search"></i>
                      </button>
                    )}
                    
                    {tableHeader.showReload && (
                      <button
                        type="button"
                        className="btn btn-link p-0"
                        onClick={() => {
                          if (tableHeader.onReloadClick) {
                            tableHeader.onReloadClick();
                          }
                        }}
                        disabled={tableHeader.loading}
                        style={{
                          color: 'var(--text-primary)',
                          border: 'none',
                          background: 'none',
                          fontSize: '1.25rem',
                          minWidth: '36px',
                          minHeight: '36px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0.5rem',
                          opacity: tableHeader.loading ? 0.5 : 1,
                        }}
                      >
                        <i className="bi bi-arrow-clockwise"></i>
                      </button>
                    )}
                    
                    {/* Menu de 3 pontos com dropdown */}
                    <div className="mobile-menu-dropdown" ref={userMenuRef}>
                      <button
                        className="btn btn-outline-secondary mobile-menu-btn"
                        type="button"
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        title="Menu"
                        aria-label="Menu de opções"
                        aria-expanded={showUserMenu}
                      >
                        <span aria-hidden="true">⋮</span>
                      </button>
                      {showUserMenu && (
                        <div className="dropdown-menu show mobile-dropdown-menu">
                          <button
                            className="dropdown-item d-flex align-items-center gap-2"
                            onClick={() => {
                              toggleTheme();
                              setShowUserMenu(false);
                            }}
                            type="button"
                          >
                            <i className={`bi bi-${theme === 'light' ? 'moon' : 'sun'}`}></i>
                            <span>{theme === 'light' ? 'Tema escuro' : 'Tema claro'}</span>
                          </button>
                          <button
                            className="dropdown-item d-flex align-items-center gap-2 text-danger"
                            onClick={() => {
                              handleLogout();
                              setShowUserMenu(false);
                            }}
                            type="button"
                          >
                            <i className="bi bi-box-arrow-right"></i>
                            <span>Sair</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  /* Desktop: Botões separados */
                  <div className="desktop-buttons">
                    <Button 
                      variant="outline-secondary"
                      size="sm"
                      icon={theme === 'light' ? 'moon' : 'sun'}
                      onClick={toggleTheme}
                      tooltip={`Alternar para tema ${theme === 'light' ? 'escuro' : 'claro'}`}
                      aria-label={`Alternar para tema ${theme === 'light' ? 'escuro' : 'claro'}`}
            >
              {''}
            </Button>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      icon="box-arrow-right"
                      onClick={handleLogout}
                      aria-label="Sair do sistema"
                    >
                      Sair
                    </Button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Linha 2: Filtros de data (apenas no mobile) */}
            {isDashboard && isMobile && (
              <div className="header-row-2">
                <div className="date-filter-group">
                  <label htmlFor="dashboard-start-date" className="date-label">
                    {isMobile ? 'Inicial:' : 'Data inicial:'}
                  </label>
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
                    className="form-control form-control-sm dashboard-date-input"
                    aria-label="Data inicial do período"
                />
                </div>
                <div className="date-filter-group">
                  <label htmlFor="dashboard-end-date" className="date-label">
                    {isMobile ? 'Final:' : 'Data final:'}
                  </label>
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
                    className="form-control form-control-sm dashboard-date-input"
                    aria-label="Data final do período"
                />
                </div>
              </div>
            )}
          </div>
        </header>
        
        {/* Campo de busca mobile - aparece quando showMobileSearch é true */}
        {isMobile && tableHeader.showMobileSearch && tableHeader.showSearch && (
          <div className="table-mobile-search-container">
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder={tableHeader.searchPlaceholder}
              value={tableHeader.searchValue}
              onChange={(e) => {
                tableHeader.setSearchValue(e.target.value);
              }}
              autoFocus
              style={{ flex: 1 }}
            />
            <button
              type="button"
              className="btn btn-link p-0"
              onClick={() => tableHeader.setShowMobileSearch(false)}
              style={{
                color: 'var(--text-primary)',
                border: 'none',
                background: 'none',
                fontSize: '1rem',
                padding: '0.25rem',
                minWidth: '32px',
                minHeight: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <i className="bi bi-x"></i>
            </button>
          </div>
        )}

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