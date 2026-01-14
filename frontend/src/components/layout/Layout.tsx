import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useNotificationContext } from '../notifications/NotificationProvider';
import NotificationContainer from '../notifications/NotificationContainer';
import { useTheme } from '@/contexts/ThemeContext';
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
import BackNetLogo from '../common/BackNetLogo';
import { DadosEmpresaService, type DadosEmpresa } from '@/services/dadosEmpresaService';

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
  const [showParametrosDropdown, setShowParametrosDropdown] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const tableMenuRef = useRef<HTMLDivElement>(null);
  const parametrosDropdownRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  
  // Responsividade: Mobile-First
  const isMobile = useIsMobile();
  
  // Buscar dados da empresa
  const { data: dadosEmpresa } = useQuery<DadosEmpresa>({
    queryKey: ['dados-empresa'],
    queryFn: () => DadosEmpresaService.get(),
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
    retry: false,
    throwOnError: false,
  });

  const companyName = useMemo(
    () => dadosEmpresa?.nome_fantasia || dadosEmpresa?.razao_social || '',
    [dadosEmpresa]
  );
  
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
      const target = event.target as Node;
      
      // Não fechar se clicou no menu ou em elementos relacionados (como o dropdown de idioma)
      if (userMenuRef.current?.contains(target)) {
        return;
      }
      
      // Não fechar se clicou em um dropdown de idioma (que está em um portal)
      const languageDropdown = document.querySelector('[data-language-dropdown]');
      if (languageDropdown?.contains(target)) {
        return;
      }

      setShowUserMenu(false);
    };

    if (showUserMenu) {
      // Usar click ao invés de mousedown para não interferir com outros eventos
      const timeoutId = setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);
      
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('click', handleClickOutside);
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

  // Fechar dropdown de parâmetros ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (parametrosDropdownRef.current && !parametrosDropdownRef.current.contains(event.target as Node)) {
        setShowParametrosDropdown(false);
      }
    };

    if (showParametrosDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showParametrosDropdown]);

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
    { path: '/clientes', label: 'Clientes', isModal: true, modalHandler: () => handleOpenModal('clientes') },
    { path: '/planos', label: 'Planos', isModal: true, modalHandler: () => handleOpenModal('planos') },
    { path: '/bancos', label: 'Bancos', isModal: true, modalHandler: () => handleOpenModal('bancos') },
    { path: '/contratos', label: 'Contratos', isModal: true, modalHandler: () => handleOpenModal('contratos') },
    { path: '/financeiro', label: 'Financeiro', isModal: true, modalHandler: () => handleOpenModal('financeiro') },
    { path: '/fornecedores', label: 'Fornecedores', isModal: true, modalHandler: () => handleOpenModal('fornecedores') },
    { path: '/contas-pagar', label: 'Contas a Pagar', isModal: true, modalHandler: () => handleOpenModal('contas-pagar') },
    { path: '/notas-fiscais', label: 'Notas Fiscais', isModal: true, modalHandler: () => handleOpenModal('notas-fiscais') },
    { path: '/dados-empresa', label: 'Dados da Empresa', isModal: true, modalHandler: () => handleOpenModal('dados-empresa') },
  ];

  const parametrosDropdownItems = [
    { id: 'usuarios', label: 'Usuários', onClick: () => handleOpenModal('usuarios') },
    { id: 'auditoria', label: 'Logs de Auditoria', onClick: () => handleOpenModal('auditoria') },
    { id: 'recursos-sistema', label: 'Recursos do Sistema', onClick: () => handleOpenModal('recursos-sistema') },
    { id: 'agendador-tarefas', label: 'Agendador de Tarefas', onClick: () => handleOpenModal('agendador-tarefas') },
    { id: 'servidor-email', label: 'Servidor de E-Mail', onClick: () => handleOpenModal('servidor-email') },
    { id: 'servidor-whatsapp', label: 'Servidor de WhatsApp', onClick: () => handleOpenModal('servidor-whatsapp') },
    { id: 'nfse', label: 'NFS-e', onClick: () => handleOpenModal('nfse') },
    { id: 'documentos-sistema', label: 'Documentos do Sistema', onClick: () => handleOpenModal('documentos-sistema') },
    { id: 'assinatura-digital', label: 'Assinatura Digital', onClick: () => handleOpenModal('assinatura-digital') },
    { id: 'dias-vencimento', label: 'Dias de Vencimento', onClick: () => handleOpenModal('dias-vencimento') },
    { id: 'atualizacoes', label: 'Atualizações', onClick: () => handleOpenModal('atualizacoes') },
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
        {/* Header fixo no topo */}
        <div className="sidebar-header-fixed d-flex flex-column align-items-center justify-content-center p-3 mb-0 border-bottom position-relative">
          <div className="sidebar-logo-wrapper w-100 d-flex flex-column align-items-center">
            <BackNetLogo width={480} height={140} />
            {companyName && (
              <div className="sidebar-title-wrapper overflow-hidden w-100 text-center" style={{ marginTop: 0 }}>
                <small className="sidebar-user-name text-muted text-truncate d-block">{companyName}</small>
              </div>
            )}
          </div>
          {/* Botão Voltar - Recolher menu (apenas mobile) */}
          {isMobile && (
            <button
              type="button"
              className="btn btn-link p-0 position-absolute top-0 end-0 m-2 sidebar-header-back-btn"
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

        {/* Área rolável com a navegação */}
        <div className="sidebar-nav-scrollable flex-grow-1">
          <nav className="sidebar-nav nav nav-pills flex-column mb-auto px-2">
            {menuItems.map((item) => (
              <div key={item.path} className="nav-item mb-1">
                {item.isModal ? (
                  <button
                    type="button"
                    className={`nav-link text-start w-100 ${isActive(item.path) ? 'active' : ''}`}
                    onClick={() => {
                      item.modalHandler?.();
                      setSidebarOpen(false);
                    }}
                  >
                    <span>{item.label}</span>
                  </button>
                ) : (
                  <Link
                    to={item.path}
                    className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <span>{item.label}</span>
                  </Link>
                )}
              </div>
            ))}

            <div className="nav-divider my-2 border-top mx-2"></div>

            {/* Menu Dropdown para Parâmetros */}
            <div className="nav-item mb-1" ref={parametrosDropdownRef}>
              <button
                className="nav-link text-start w-100"
                onClick={() => setShowParametrosDropdown(!showParametrosDropdown)}
                type="button"
              >
                <span>Parâmetros</span>
              </button>
              {showParametrosDropdown && (
                <div className="dropdown-menu show">
                  {parametrosDropdownItems.map((item) => (
                    <div key={item.id} className="nav-item mb-1">
                      <button
                        className="nav-link text-start w-100"
                        onClick={() => {
                          item.onClick();
                          setShowParametrosDropdown(false);
                        }}
                      >
                        <span>{item.label}</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </nav>
        </div>
      </aside>

      {/* Main Layout */}
      <div className="main-layout">
        {/* Header - Bootstrap Navbar Style */}
        <header className="navbar navbar-expand-md sticky-top main-navbar">
          <div className="container-fluid">
            <div className="d-flex flex-wrap align-items-center justify-content-between w-100">

              {/* Esquerda: Toggle Sidebar */}
              <div className="d-flex align-items-center">
                {isMobile && (
                  <button
                    className="navbar-toggler d-block border-0 p-0"
                    type="button"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    aria-label="Abrir menu lateral"
                  >
                    <span className="navbar-toggler-icon"></span>
                  </button>
                )}
              </div>

              {/* Centro: Search Bar */}
              <div className="d-flex justify-content-center flex-grow-1">
                {/* Search Bar Elegante Centralizada */}
                {!isMobile && (
                  <div className="navbar-search-container">
                    <select
                      className="navbar-search-field"
                      value={tableHeader.searchField}
                      onChange={(e) => tableHeader.setSearchField(e.target.value)}
                    >
                      {tableHeader.availableSearchFields.map(field => (
                        <option key={field.id} value={field.id}>{field.label}</option>
                      ))}
                    </select>

                    <form
                      className="mb-0 flex-grow-1"
                      role="search"
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (tableHeader.onSearchClick) {
                          tableHeader.onSearchClick();
                        } else if (location.pathname !== '/adm' && location.pathname !== '/adm/dashboard') {
                          // Se não estiver no dashboard e não houver callback, abre o modal de clientes
                          handleOpenModal('clientes');
                        }
                        // No Dashboard, o próprio componente Dashboard.tsx reage ao searchValue
                      }}
                    >
                      <input
                        type="search"
                        className="navbar-search-input"
                        placeholder={tableHeader.searchPlaceholder || "Buscar..."}
                        aria-label="Search"
                        value={tableHeader.searchValue}
                        onChange={(e) => tableHeader.setSearchValue(e.target.value)}
                      />
                    </form>

                    <i className="bi bi-search navbar-search-icon"></i>
                  </div>
                )}

                {/* Mobile: Botão de busca centralizado */}
                {isMobile && !tableHeader.showMobileSearch && (
                  <button
                    className="navbar-mobile-search-btn"
                    onClick={() => tableHeader.setShowMobileSearch(true)}
                    aria-label="Abrir busca"
                  >
                    <i className="bi bi-search"></i>
                  </button>
                )}
              </div>

              {/* Direita: User Profile */}
              <div className="d-flex align-items-center justify-content-end">
                {/* User Dropdown */}
                <div className="dropdown text-end" ref={userMenuRef}>
                  <button
                    className="d-block link-theme-toggle text-decoration-none dropdown-toggle bg-transparent border-0 p-0"
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    aria-expanded={showUserMenu}
                  >
                    <div className="rounded-circle bg-primary d-flex align-items-center justify-content-center text-white layout-user-avatar">
                      <i className="bi bi-person"></i>
                    </div>
                  </button>
                  {showUserMenu && (
                    <ul className="table-dropdown-menu table-dropdown-menu-right shadow position-absolute mt-2 layout-table-dropdown">
                      <li className="px-3 py-2 border-bottom border-custom mb-1">
                        <div className="fw-bold text-truncate text-custom-primary layout-user-name">{currentUser?.nome || 'Usuário'}</div>
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
                      <li 
                        className="table-dropdown-item"
                        onClick={(e) => {
                          // Não fechar o menu do usuário quando clicar no LanguageSelector
                          e.stopPropagation();
                        }}
                      >
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

        {/* Campo de busca mobile elegante */}
        {isMobile && tableHeader.showMobileSearch && tableHeader.showSearch && (
          <div className="navbar-mobile-search-container">
            <div className="navbar-mobile-search-wrapper">
              <select
                className="navbar-mobile-search-field"
                value={tableHeader.searchField}
                onChange={(e) => tableHeader.setSearchField(e.target.value)}
              >
                {tableHeader.availableSearchFields.map(field => (
                  <option key={field.id} value={field.id}>{field.label}</option>
                ))}
              </select>

              <input
                type="text"
                className="navbar-mobile-search-input"
                placeholder={tableHeader.searchPlaceholder || "Buscar..."}
                value={tableHeader.searchValue}
                onChange={(e) => tableHeader.setSearchValue(e.target.value)}
                autoFocus
              />

              <button
                type="button"
                className="navbar-mobile-search-close"
                onClick={() => tableHeader.setShowMobileSearch(false)}
                aria-label="Fechar busca"
              >
                <i className="bi bi-x"></i>
              </button>
            </div>
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
