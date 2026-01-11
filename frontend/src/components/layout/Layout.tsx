import React, { useEffect, useState, useRef } from 'react';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { useNotificationContext } from '../notifications/NotificationProvider';
import NotificationContainer from '../notifications/NotificationContainer';
import { useTheme } from '@/contexts/ThemeContext';
import DropdownMenu from '../common/DropdownMenu';
import { authService, CurrentUser } from '@/services/authService';
import { getAuthToken } from '@/services/core';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useTableHeader } from '@/contexts/TableHeaderContext';
import { useModal, type ModalType } from '@/contexts/ModalContext';
import { useLoading } from '@/contexts/LoadingContext';
import { useApiLoading } from '@/hooks/useApiLoading';
import LoadingDots from '../common/LoadingDots';
import SingleModalWrapper from '../common/SingleModalWrapper';
import LanguageSelector from '../common/LanguageSelector';

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
  
  // Table header context (para botões de busca e reload)
  const tableHeader = useTableHeader();
  
  // Usar o contexto de modais (gerenciado pelo ModalProvider)
  const { openModal } = useModal();
  
  // Contexto de loading global
  const { isLoading } = useLoading();
  
  // Registrar o loading automático para requisições HTTP
  useApiLoading();

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

  // Proteção de rotas: verificar autenticação imediatamente
  useEffect(() => {
    const token = getAuthToken();
    // Rotas públicas que não precisam de autenticação
    const publicRoutes = ['/login', '/', '/pagamento'];
    const isPublicRoute = publicRoutes.some(route => 
      location.pathname === route || location.pathname.startsWith(route + '/')
    );
    
    // Se não está em rota pública e não tem token, redirecionar para login
    if (!isPublicRoute && !token) {
      navigate('/login', { replace: true });
    }
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
    { path: '/notas-fiscais', icon: 'bi-file-earmark-text', label: 'Notas Fiscais', isModal: true, modalHandler: () => handleOpenModal('notas-fiscais') },
    { path: '/dados-empresa', icon: 'bi-building', label: 'Dados da Empresa', isModal: true, modalHandler: () => handleOpenModal('dados-empresa') },
  ];

  const parametrosDropdownItems = [
    { id: 'usuarios', label: 'Usuários', icon: 'bi-people', onClick: () => handleOpenModal('usuarios') },
    { id: 'auditoria', label: 'Logs de Auditoria', icon: 'bi-shield-check', onClick: () => handleOpenModal('auditoria') },
    { id: 'recursos-sistema', label: 'Recursos do Sistema', icon: 'bi-gear', onClick: () => handleOpenModal('recursos-sistema') },
    { id: 'agendador-tarefas', label: 'Agendador de Tarefas', icon: 'bi-clock-history', onClick: () => handleOpenModal('agendador-tarefas') },
    { id: 'servidor-email', label: 'Servidor de E-Mail', icon: 'bi-envelope', onClick: () => handleOpenModal('servidor-email') },
    { id: 'servidor-whatsapp', label: 'Servidor de WhatsApp', icon: 'bi-whatsapp', onClick: () => handleOpenModal('servidor-whatsapp') },
    { id: 'nfse', label: 'NFS-e', icon: 'bi-receipt', onClick: () => handleOpenModal('nfse') },
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
      <aside 
        ref={sidebarRef} 
        className={`d-flex flex-column flex-shrink-0 sidebar ${sidebarOpen ? 'open' : ''}`}
      >
        <div className="sidebar-header d-flex align-items-center p-3 mb-2 border-bottom">
          <div className="sidebar-logo me-2">
            <i className="bi bi-broadcast"></i>
          </div>
          <div className="sidebar-title-wrapper overflow-hidden">
            <span className="fs-5 fw-semibold sidebar-title text-nowrap">BackNet</span>
            {currentUser?.nome && (
              <small className="sidebar-user-name text-muted text-truncate d-block">{currentUser.nome}</small>
            )}
          </div>
          {/* Botão Voltar - Recolher menu (apenas mobile) */}
          {isMobile && (
            <button
              type="button"
              className="btn btn-link p-0 ms-auto sidebar-header-back-btn"
              onClick={() => {
                setSidebarOpen(false);
              }}
              title="Recolher menu"
              aria-label="Recolher menu"
            >
              <i className="bi bi-arrow-left fs-4"></i>
            </button>
          )}
        </div>
        
        <nav className="sidebar-nav nav nav-pills flex-column mb-auto px-2">
          {menuItems.map((item) => (
            <div key={item.path} className="nav-item mb-1">
              {item.isModal ? (
                <button
                  type="button"
                  className={`nav-link text-start w-100 d-flex align-items-center gap-2 ${isActive(item.path) ? 'active' : ''}`}
                  onClick={() => {
                    item.modalHandler?.();
                    setSidebarOpen(false);
                  }}
                >
                  <i className={`bi ${item.icon}`}></i>
                  <span>{item.label}</span>
                </button>
              ) : (
                <Link 
                  to={item.path}
                  className={`nav-link d-flex align-items-center gap-2 ${isActive(item.path) ? 'active' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <i className={`bi ${item.icon}`}></i>
                  <span>{item.label}</span>
                </Link>
              )}
            </div>
          ))}
          
          <div className="nav-divider my-2 border-top mx-2"></div>

          {/* Menu Dropdown para Parâmetros */}
          <div className="nav-item">
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
        {/* Header - Bootstrap Navbar Style */}
        <header className="navbar navbar-expand-md sticky-top main-navbar">
          <div className="container-fluid">
            <div className="d-flex flex-wrap align-items-center justify-content-between w-100">
              
              {/* Esquerda: Toggle Sidebar (Mobile) */}
              <div className="d-flex align-items-center">
                {isMobile && (
                  <button 
                    className="navbar-toggler d-block border-0 p-0 me-3" 
                    type="button" 
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    aria-label="Abrir menu lateral"
                  >
                    <span className="navbar-toggler-icon"></span>
                  </button>
                )}
              </div>

              {/* Direita: Search e User Profile */}
              <div className="d-flex align-items-center gap-3">
                {/* Search Bar - Sempre visível se não estiver no dashboard ou conforme configuração */}
                {(!isMobile || tableHeader.showMobileSearch) && (
                  <div className="d-flex align-items-center gap-0">
                    {/* Seletor de Campo de Pesquisa */}
                    {!isMobile && (
                      <select 
                        className="form-select form-select-sm bg-custom-secondary border-custom text-custom-primary rounded-end-0"
                        style={{ width: 'auto', minWidth: '120px', borderRight: 'none' }}
                        value={tableHeader.searchField}
                        onChange={(e) => tableHeader.setSearchField(e.target.value)}
                      >
                        {tableHeader.availableSearchFields.map(field => (
                          <option key={field.id} value={field.id}>{field.label}</option>
                        ))}
                      </select>
                    )}
                    
                    <div className="position-relative">
                      <form className="mb-0" role="search" onSubmit={(e) => {
                        e.preventDefault();
                        if (tableHeader.onSearchClick) {
                          tableHeader.onSearchClick();
                        } else if (location.pathname !== '/adm' && location.pathname !== '/adm/dashboard') {
                          // Se não estiver no dashboard e não houver callback, abre o modal de clientes
                          handleOpenModal('clientes');
                        }
                        // No Dashboard, o próprio componente Dashboard.tsx reage ao searchValue
                      }}>
                        <input 
                          type="search" 
                          className={`form-control form-control-navbar ${!isMobile ? 'rounded-start-0' : ''}`} 
                          placeholder={tableHeader.searchPlaceholder || "Buscar..."} 
                          aria-label="Search"
                          value={tableHeader.searchValue}
                          onChange={(e) => tableHeader.setSearchValue(e.target.value)}
                          style={{ width: isMobile ? '100%' : '200px' }}
                        />
                      </form>
                      {isMobile && (
                        <button
                          type="button"
                          className="btn btn-link position-absolute end-0 top-50 translate-middle-y text-secondary p-2"
                          onClick={() => tableHeader.setShowMobileSearch(false)}
                        >
                          <i className="bi bi-x-lg"></i>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Mobile: Botão de busca se o input estiver escondido */}
                {isMobile && !tableHeader.showMobileSearch && (
                  <button 
                    className="btn btn-link text-custom-primary p-0" 
                    onClick={() => tableHeader.setShowMobileSearch(true)}
                  >
                    <i className="bi bi-search fs-5"></i>
                  </button>
                )}

                {/* User Dropdown */}
                <div className="dropdown text-end" ref={userMenuRef}>
                  <button 
                    className="d-block link-theme-toggle text-decoration-none dropdown-toggle bg-transparent border-0 p-0" 
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    aria-expanded={showUserMenu}
                  >
                    <div className="rounded-circle bg-primary d-flex align-items-center justify-content-center text-white" style={{ width: '32px', height: '32px' }}>
                      <i className="bi bi-person"></i>
                    </div>
                  </button>
                  {showUserMenu && (
                    <ul className="table-dropdown-menu table-dropdown-menu-right shadow position-absolute mt-2" style={{ overflow: 'visible' }}>
                      <li className="px-3 py-2 border-bottom border-custom mb-1">
                        <div className="fw-bold text-truncate text-custom-primary" style={{ maxWidth: '150px', fontSize: '0.625rem' }}>{currentUser?.nome || 'Usuário'}</div>
                        <small className="text-custom-secondary text-truncate d-block" style={{ maxWidth: '150px' }}>{currentUser?.email}</small>
                      </li>
                      <li
                        className="table-dropdown-item"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTheme();
                        }}
                      >
                        <i className={`bi bi-${theme === 'light' ? 'moon' : 'sun'}`}></i>
                        <span>{theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}</span>
                      </li>
                      <li className="table-dropdown-item">
                        <LanguageSelector />
                      </li>
                      <li><hr className="dropdown-divider" /></li>
                      <li
                        className="table-dropdown-item text-danger"
                        onClick={handleLogout}
                      >
                        <i className="bi bi-box-arrow-right"></i>
                        <span>Sair</span>
                      </li>
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Loading dots no topo da tela */}
        {isLoading && (
          <div className="layout-loading-bar">
            <LoadingDots />
          </div>
        )}

        {/* Campo de busca mobile - aparece quando showMobileSearch é true */}
        {isMobile && tableHeader.showMobileSearch && tableHeader.showSearch && (
          <div className="table-mobile-search-container d-flex align-items-center gap-2 px-2 py-2 border-bottom bg-custom-primary" style={{ position: 'fixed', top: '64px', left: 0, right: 0, zIndex: 1040 }}>
            {/* Seletor de Campo de Pesquisa no Mobile */}
            <select 
              className="form-select form-select-sm bg-custom-secondary border-custom text-custom-primary"
              style={{ width: 'auto', minWidth: '100px' }}
              value={tableHeader.searchField}
              onChange={(e) => tableHeader.setSearchField(e.target.value)}
            >
              {tableHeader.availableSearchFields.map(field => (
                <option key={field.id} value={field.id}>{field.label}</option>
              ))}
            </select>

            <div className="flex-grow-1 position-relative">
              <input
                type="text"
                className="form-control form-control-sm layout-mobile-search-input"
                placeholder={tableHeader.searchPlaceholder}
                value={tableHeader.searchValue}
                onChange={(e) => {
                  tableHeader.setSearchValue(e.target.value);
                }}
                autoFocus
              />
            </div>
            <button
              type="button"
              className="btn btn-link p-0 layout-mobile-search-close text-custom-primary"
              onClick={() => tableHeader.setShowMobileSearch(false)}
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
        )}

        {/* Main Content */}
        <main className="main-content">
          <Outlet />
        </main>

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

    </div>
  </div>
  );
};

export default Layout;
