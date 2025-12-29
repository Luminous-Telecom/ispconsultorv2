import React, { useEffect, useState, useRef } from 'react';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { useNotificationContext } from '../notifications/NotificationProvider';
import NotificationContainer from '../notifications/NotificationContainer';
import { useTheme } from '@/contexts/ThemeContext';
import DropdownMenu from '../common/DropdownMenu';
import { Button } from '../ui';
import { useDashboardFilters } from '@/contexts/DashboardFiltersContext';
import { authService, CurrentUser } from '@/services/authService';
import { getAuthToken } from '@/services/core';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useTableHeader } from '@/contexts/TableHeaderContext';
import { useModal, type ModalType } from '@/contexts/ModalContext';
import SingleModalWrapper from '../common/SingleModalWrapper';
import DocumentosSistemaModal from '../modals/parametros/documentos-sistema/DocumentosSistemaModal';

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
  const [showTableMenu, setShowTableMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const tableMenuRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  
  // Responsividade: Mobile-First
  const isMobile = useIsMobile();
  
  // Dashboard filters (apenas na rota do dashboard)
  const isDashboard = location.pathname === '/adm' || location.pathname === '/adm/dashboard';
  const dashboardFilters = useDashboardFilters();
  
  // Table header context (para botões de busca e reload)
  const tableHeader = useTableHeader();
  
  // Usar o contexto de modais (gerenciado pelo ModalProvider)
  const { openModal, activeModal, closeModal } = useModal();

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

  // Fechar menu da tabela ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tableMenuRef.current && !tableMenuRef.current.contains(event.target as Node)) {
        setShowTableMenu(false);
      }
    };

    if (showTableMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showTableMenu]);

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
  
  // Funções helper para abrir modais (usando o contexto)
  const handleOpenModal = (modalName: string) => {
    openModal(modalName as ModalType);
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
    { path: '/clientes', icon: 'bi-people', label: 'Clientes', isModal: true, modalHandler: () => handleOpenModal('clientes') },
    { path: '/planos', icon: 'bi-wifi', label: 'Planos', isModal: true, modalHandler: () => handleOpenModal('planos') },
    { path: '/bancos', icon: 'bi-bank', label: 'Bancos', isModal: true, modalHandler: () => handleOpenModal('bancos') },
    { path: '/contratos', icon: 'bi-file-earmark-text', label: 'Contratos', isModal: true, modalHandler: () => handleOpenModal('contratos') },
    { path: '/financeiro', icon: 'bi-cash-coin', label: 'Financeiro', isModal: true, modalHandler: () => handleOpenModal('financeiro') },
    { path: '/fornecedores', icon: 'bi-truck', label: 'Fornecedores', isModal: true, modalHandler: () => handleOpenModal('fornecedores') },
    { path: '/contas-pagar', icon: 'bi-receipt-cutoff', label: 'Contas a Pagar', isModal: true, modalHandler: () => handleOpenModal('contas-pagar') },
    { path: '/dados-empresa', icon: 'bi-building', label: 'Dados da Empresa', isModal: true, modalHandler: () => handleOpenModal('dados-empresa') },
  ];

  const parametrosDropdownItems = [
    { id: 'usuarios', label: 'Usuários', icon: 'bi-people', onClick: () => handleOpenModal('usuarios') },
    { id: 'auditoria', label: 'Logs de Auditoria', icon: 'bi-shield-check', onClick: () => handleOpenModal('auditoria') },
    { id: 'recursos-sistema', label: 'Recursos do Sistema', icon: 'bi-gear', onClick: () => handleOpenModal('recursos-sistema') },
    { id: 'agendador-tarefas', label: 'Agendador de Tarefas', icon: 'bi-clock-history', onClick: () => handleOpenModal('agendador-tarefas') },
    { id: 'servidor-email', label: 'Servidor de E-Mail', icon: 'bi-envelope', onClick: () => handleOpenModal('servidor-email') },
    { id: 'servidor-whatsapp', label: 'Servidor de WhatsApp', icon: 'bi-whatsapp', onClick: () => handleOpenModal('servidor-whatsapp') },
    { id: 'documentos-sistema', label: 'Documentos do Sistema', icon: 'bi-file-earmark-text', onClick: () => handleOpenModal('documentos-sistema') },
    { id: 'assinatura-digital', label: 'Assinatura Digital', icon: 'bi-pen', onClick: () => handleOpenModal('assinatura-digital') },
    { id: 'dias-vencimento', label: 'Dias de Vencimento', icon: 'bi-calendar', onClick: () => handleOpenModal('dias-vencimento') },
    { id: 'atualizacoes', label: 'Atualizações', icon: 'bi-arrow-up-circle', onClick: () => handleOpenModal('atualizacoes') },
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
                    {/* Menu de 3 pontos da tabela (busca e reload) */}
                    {(tableHeader.showSearch || tableHeader.showReload) && (
                      <div className="mobile-menu-dropdown" ref={tableMenuRef}>
                        <button
                          className="btn btn-outline-secondary mobile-menu-btn"
                          type="button"
                          onClick={() => setShowTableMenu(!showTableMenu)}
                          title="Menu de ações"
                          aria-label="Menu de ações da tabela"
                          aria-expanded={showTableMenu}
                        >
                          <span aria-hidden="true">⋮</span>
                        </button>
                        {showTableMenu && (
                          <div className="dropdown-menu show mobile-dropdown-menu">
                            {/* Ação de Busca */}
                            {tableHeader.showSearch && (
                              <button
                                className="dropdown-item d-flex align-items-center gap-2"
                                onClick={() => {
                                  tableHeader.setShowMobileSearch(!tableHeader.showMobileSearch);
                                  setShowTableMenu(false);
                                }}
                                type="button"
                              >
                                <i className="bi bi-search"></i>
                                <span>Buscar</span>
                              </button>
                            )}
                            
                            {/* Ação de Reload */}
                            {tableHeader.showReload && (
                              <button
                                className="dropdown-item d-flex align-items-center gap-2"
                                onClick={() => {
                                  if (tableHeader.onReloadClick) {
                                    tableHeader.onReloadClick();
                                  }
                                  setShowTableMenu(false);
                                }}
                                disabled={tableHeader.loading}
                                type="button"
                              >
                                <i className="bi bi-arrow-clockwise"></i>
                                <span>Atualizar</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Menu de 3 pontos do usuário */}
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

      {/* Single Modal Wrapper - Mantém o shell do modal sempre montado */}
      {/* Elimina flickering ao trocar entre modais, pois apenas o conteúdo interno muda */}
      <SingleModalWrapper />

      {/* DocumentosSistemaModal - Renderizado diretamente (não usa SingleModalWrapper) */}
      <DocumentosSistemaModal
        show={activeModal === 'documentos-sistema'}
        onClose={closeModal}
      />

    </div>
  );
};

export default Layout;
