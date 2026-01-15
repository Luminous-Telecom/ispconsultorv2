import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useNotificationContext } from '../notifications/NotificationProvider';
import NotificationContainer from '../notifications/NotificationContainer';
import { useTheme } from '@/contexts/ThemeContext';
import { useI18n } from '@/contexts/I18nContext';
import { authService, CurrentUser } from '@/services/authService';
import { getAuthToken } from '@/services/core';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useTableHeader } from '@/contexts/TableHeaderContext';
import { useModal, type ModalType } from '@/contexts/ModalContext';
import { useLoading } from '@/contexts/LoadingContext';
import { useApiLoading } from '@/hooks/useApiLoading';
import LoadingDots from '../common/LoadingDots';
import SingleModalWrapper from '../common/SingleModalWrapper';
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
  const { t, language, setLanguage, availableLanguages } = useI18n();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showTableMenu, setShowTableMenu] = useState(false);
  const [showParametrosDropdown, setShowParametrosDropdown] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [languageDropdownPosition, setLanguageDropdownPosition] = useState({ top: 0, left: 0 });
  const userMenuRef = useRef<HTMLDivElement>(null);
  const tableMenuRef = useRef<HTMLDivElement>(null);
  const parametrosDropdownRef = useRef<HTMLDivElement>(null);
  const languageTriggerRef = useRef<HTMLDivElement>(null);
  const languageDropdownRef = useRef<HTMLDivElement>(null);
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

      // Não fechar se clicou em um dropdown de idioma
      const languageDropdown = document.querySelector('[data-language-dropdown]');
      if (languageDropdown?.contains(target)) {
        return;
      }

      // Fechar ambos os dropdowns quando clicar fora
      setShowUserMenu(false);
      setShowLanguageDropdown(false);
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
  }, [showUserMenu, showLanguageDropdown]);

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

  // Calcular posição do dropdown de idioma
  useEffect(() => {
    if (showLanguageDropdown && languageTriggerRef.current) {
      const triggerRect = languageTriggerRef.current.getBoundingClientRect();
      setLanguageDropdownPosition({
        top: triggerRect.bottom + 2,
        left: triggerRect.left
      });
    }
  }, [showLanguageDropdown]);

  // Fechar dropdown de idioma ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (languageTriggerRef.current?.contains(target)) {
        return;
      }
      if (languageDropdownRef.current?.contains(target)) {
        return;
      }
      setShowLanguageDropdown(false);
    };

    if (showLanguageDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showLanguageDropdown]);

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
    success(t('layout.logoutSuccess'));
    navigate('/login');
  };


  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const menuItems = [
    { path: '/clientes', label: t('menu.clients'), isModal: true, modalHandler: () => handleOpenModal('clientes') },
    { path: '/planos', label: t('menu.plans'), isModal: true, modalHandler: () => handleOpenModal('planos') },
    { path: '/bancos', label: t('menu.banks'), isModal: true, modalHandler: () => handleOpenModal('bancos') },
    { path: '/contratos', label: t('menu.contracts'), isModal: true, modalHandler: () => handleOpenModal('contratos') },
    { path: '/financeiro', label: t('menu.financial'), isModal: true, modalHandler: () => handleOpenModal('financeiro') },
    { path: '/fornecedores', label: t('menu.suppliers'), isModal: true, modalHandler: () => handleOpenModal('fornecedores') },
    { path: '/contas-pagar', label: t('menu.accountsPayable'), isModal: true, modalHandler: () => handleOpenModal('contas-pagar') },
    { path: '/notas-fiscais', label: t('menu.invoices'), isModal: true, modalHandler: () => handleOpenModal('notas-fiscais') },
    { path: '/dados-empresa', label: t('menu.companyData'), isModal: true, modalHandler: () => handleOpenModal('dados-empresa') },
  ];

  const parametrosDropdownItems = [
    { id: 'usuarios', label: t('params.users'), onClick: () => handleOpenModal('usuarios') },
    { id: 'auditoria', label: t('params.auditLogs'), onClick: () => handleOpenModal('auditoria') },
    { id: 'recursos-sistema', label: t('params.systemResources'), onClick: () => handleOpenModal('recursos-sistema') },
    { id: 'agendador-tarefas', label: t('params.taskScheduler'), onClick: () => handleOpenModal('agendador-tarefas') },
    { id: 'servidor-email', label: t('params.emailServer'), onClick: () => handleOpenModal('servidor-email') },
    { id: 'servidor-whatsapp', label: t('params.whatsappServer'), onClick: () => handleOpenModal('servidor-whatsapp') },
    { id: 'nfse', label: t('params.nfse'), onClick: () => handleOpenModal('nfse') },
    { id: 'documentos-sistema', label: t('params.systemDocuments'), onClick: () => handleOpenModal('documentos-sistema') },
    { id: 'assinatura-digital', label: t('params.digitalSignature'), onClick: () => handleOpenModal('assinatura-digital') },
    { id: 'dias-vencimento', label: t('params.dueDays'), onClick: () => handleOpenModal('dias-vencimento') },
    { id: 'atualizacoes', label: t('params.updates'), onClick: () => handleOpenModal('atualizacoes') },
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
                    title={t('layout.closeMenu')}
                    aria-label={t('layout.closeMenu')}
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
                <span>{t('layout.parameters')}</span>
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
                    aria-label={t('layout.openMenu')}
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
                      id="desktop-search-field"
                      name="searchField"
                      className="navbar-search-field"
                      value={tableHeader.searchField}
                      onChange={(e) => tableHeader.setSearchField(e.target.value)}
                      aria-label={t('layout.search')}
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
                        id="desktop-search-input"
                        name="search"
                        type="search"
                        className="navbar-search-input"
                        placeholder={tableHeader.searchPlaceholder || t('layout.searchPlaceholder')}
                        aria-label={t('layout.search')}
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
                    aria-label={t('layout.search')}
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
                        <div className="fw-bold text-truncate text-custom-primary layout-user-name">{currentUser?.nome || t('layout.user')}</div>
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
                        <span>{theme === 'light' ? t('layout.darkMode') : t('layout.lightMode')}</span>
                      </li>
                      <li>
                        <div
                          ref={languageTriggerRef}
                          className="table-dropdown-item"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowLanguageDropdown(!showLanguageDropdown);
                          }}
                        >
                          <i className="bi bi-translate"></i>
                          <span>{t('layout.language')}</span>
                          <i className="bi bi-chevron-down ms-auto" style={{ fontSize: '0.75rem', opacity: 0.6 }}></i>
                        </div>
                      </li>
                      <li><hr className="dropdown-divider" /></li>
                      <li
                        className="table-dropdown-item text-danger"
                        onClick={handleLogout}
                      >
                        <i className="bi bi-box-arrow-right"></i>
                        <span>{t('nav.logout')}</span>
                      </li>
                    </ul>
                  )}
                  {showLanguageDropdown && (
                    <div
                      ref={languageDropdownRef}
                      data-language-dropdown
                      className="layout-language-dropdown-menu shadow"
                      style={{
                        top: `${languageDropdownPosition.top}px`,
                        left: `${languageDropdownPosition.left}px`,
                        minWidth: '160px',
                        zIndex: 10001
                      }}
                    >
                      {availableLanguages.map((lang) => (
                        <div key={lang.code}>
                          <button
                            className={`table-dropdown-item d-flex align-items-center w-100 ${
                              language === lang.code ? 'active' : ''
                            }`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (language !== lang.code) {
                                setLanguage(lang.code);
                              }
                              setShowLanguageDropdown(false);
                            }}
                            style={{ border: 'none', background: 'none' }}
                          >
                            <span className="me-2">{lang.flag}</span>
                            <span>{lang.name}</span>
                            {language === lang.code && (
                              <i className="bi bi-check-lg ms-auto text-primary"></i>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
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
                id="mobile-search-field"
                name="mobileSearchField"
                className="navbar-mobile-search-field"
                value={tableHeader.searchField}
                onChange={(e) => tableHeader.setSearchField(e.target.value)}
                aria-label={t('layout.search')}
              >
                {tableHeader.availableSearchFields.map(field => (
                  <option key={field.id} value={field.id}>{field.label}</option>
                ))}
              </select>

              <input
                id="mobile-search-input"
                name="mobileSearch"
                type="text"
                className="navbar-mobile-search-input"
                placeholder={tableHeader.searchPlaceholder || t('layout.searchPlaceholder')}
                value={tableHeader.searchValue}
                onChange={(e) => tableHeader.setSearchValue(e.target.value)}
                autoFocus
                aria-label={t('layout.search')}
              />

              <button
                type="button"
                className="navbar-mobile-search-close"
                onClick={() => tableHeader.setShowMobileSearch(false)}
                aria-label={t('layout.closeSearch')}
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
