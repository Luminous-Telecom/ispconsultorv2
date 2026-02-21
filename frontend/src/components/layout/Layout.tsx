import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
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
import { DadosEmpresaService } from '@/services/dadosEmpresaService';

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
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [languageDropdownPosition, setLanguageDropdownPosition] = useState({ top: 0, left: 0 });
  const userMenuRef = useRef<HTMLDivElement>(null);
  const tableMenuRef = useRef<HTMLDivElement>(null);
  const languageTriggerRef = useRef<HTMLDivElement>(null);
  const languageDropdownRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  
  // Responsividade: Mobile-First
  const isMobile = useIsMobile();
  
  // Buscar dados públicos da empresa (incluindo logo)
  const { data: dadosEmpresa } = useQuery({
    queryKey: ['dados-empresa-public'],
    queryFn: () => DadosEmpresaService.getPublic(),
  });

  const companyName = useMemo(
    () => dadosEmpresa?.nome_fantasia || dadosEmpresa?.razao_social || '',
    [dadosEmpresa]
  );

  useEffect(() => {
    document.title = companyName || 'BackNet';
  }, [companyName]);

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

  const handleLogout = async () => {
    await authService.logout();
    success(t('layout.logoutSuccess'));
    navigate('/login');
  };

  const cadastrosFolderItems = [
    { id: 'clientes', label: t('menu.clients'), icon: 'bi-people', onClick: () => handleOpenModal('clientes') },
    { id: 'contratos', label: t('menu.contracts'), icon: 'bi-file-earmark-text', onClick: () => handleOpenModal('contratos') },
    { id: 'planos', label: t('menu.plans'), icon: 'bi-card-list', onClick: () => handleOpenModal('planos') },
    { id: 'bancos', label: t('menu.banks'), icon: 'bi-bank', onClick: () => handleOpenModal('bancos') },
    { id: 'tipos-cobranca-contrato', label: t('menu.billingType'), icon: 'bi-credit-card', onClick: () => handleOpenModal('tipos-cobranca-contrato') },
    { id: 'fornecedores', label: t('menu.suppliers'), icon: 'bi-truck', onClick: () => handleOpenModal('fornecedores') },
  ];

  const financeiroFolderItems = [
    { id: 'contas-receber', label: t('menu.accountsReceivable'), icon: 'bi-cash-stack', onClick: () => handleOpenModal('contas-receber') },
    { id: 'contas-pagar', label: t('menu.accountsPayable'), icon: 'bi-arrow-down-circle', onClick: () => handleOpenModal('contas-pagar') },
    { id: 'notas-fiscais', label: t('menu.invoices'), icon: 'bi-receipt', onClick: () => handleOpenModal('notas-fiscais') },
  ];

  const parametrosFolderItems = [
    { id: 'dados-empresa', label: t('menu.companyData'), icon: 'bi-building', onClick: () => handleOpenModal('dados-empresa') },
    { id: 'usuarios', label: t('params.users'), icon: 'bi-people-fill', onClick: () => handleOpenModal('usuarios') },
    { id: 'auditoria', label: t('params.auditLogs'), icon: 'bi-journal-text', onClick: () => handleOpenModal('auditoria') },
    { id: 'recursos-sistema', label: t('params.systemResources'), icon: 'bi-gear', onClick: () => handleOpenModal('recursos-sistema') },
    { id: 'hotsite', label: t('menu.hotsite'), icon: 'bi-globe2', onClick: () => handleOpenModal('hotsite') },
    { id: 'agendador-tarefas', label: t('params.taskScheduler'), icon: 'bi-clock-history', onClick: () => handleOpenModal('agendador-tarefas') },
    { id: 'servidor-email', label: t('params.emailServer'), icon: 'bi-envelope', onClick: () => handleOpenModal('servidor-email') },
    { id: 'servidor-whatsapp', label: t('params.whatsappServer'), icon: 'bi-whatsapp', onClick: () => handleOpenModal('servidor-whatsapp') },
    { id: 'historico-whatsapp', label: t('menu.whatsappHistory'), icon: 'bi-chat-dots', onClick: () => handleOpenModal('historico-whatsapp') },
    { id: 'historico-email', label: t('menu.emailHistory'), icon: 'bi-envelope-paper', onClick: () => handleOpenModal('historico-email') },
    { id: 'nfse', label: t('params.nfse'), icon: 'bi-file-earmark-text', onClick: () => handleOpenModal('nfse') },
    { id: 'documentos-sistema', label: t('params.systemDocuments'), icon: 'bi-folder', onClick: () => handleOpenModal('documentos-sistema') },
    { id: 'assinatura-digital', label: t('params.digitalSignature'), icon: 'bi-pen', onClick: () => handleOpenModal('assinatura-digital') },
    { id: 'dias-vencimento', label: t('params.dueDays'), icon: 'bi-calendar-event', onClick: () => handleOpenModal('dias-vencimento') },
    { id: 'atualizacoes', label: t('params.updates'), icon: 'bi-arrow-down-up', onClick: () => handleOpenModal('atualizacoes') },
    { id: 'backups', label: t('params.manageBackups'), icon: 'bi-cloud-arrow-down', onClick: () => handleOpenModal('backups') },
  ];

  const blockdomiFolderItems = [
    { id: 'dominios', label: t('modal.domains'), icon: 'bi-globe', onClick: () => handleOpenModal('blockdomi-dominios') },
    { id: 'ipv4', label: t('modal.ipv4'), icon: 'bi-router', onClick: () => handleOpenModal('blockdomi-ipv4') },
    { id: 'ipv6', label: t('modal.ipv6'), icon: 'bi-router-fill', onClick: () => handleOpenModal('blockdomi-ipv6') },
    { id: 'importar-lista', label: t('modal.importList'), icon: 'bi-list-ul', onClick: () => handleOpenModal('blockdomi-importar-lista') },
    { id: 'ips-permitidos', label: t('blockdomi.ipsPermitidos'), icon: 'bi-shield-check', onClick: () => handleOpenModal('blockdomi-ips-permitidos') },
    { id: 'logs-acesso', label: t('blockdomi.logsAcesso'), icon: 'bi-journal-text', onClick: () => handleOpenModal('blockdomi-logs-acesso') },
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
        <div className="sidebar-header-fixed d-flex flex-column align-items-center justify-content-center p-3 mb-0 position-relative">
          <div className="sidebar-logo-wrapper w-100 d-flex flex-column align-items-center">
            <BackNetLogo width={200} height={65} />
            {companyName && (
              <div className="sidebar-title-wrapper overflow-hidden w-100 d-flex justify-content-center">
                <div className="sidebar-company-name text-truncate d-flex align-items-center justify-content-center gap-1">
                  <i className="bi bi-building"></i>
                  <span>{companyName}</span>
                </div>
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
            {/* Menu Pasta para Cadastros usando Bootstrap Accordion */}
            <div className="accordion sidebar-accordion" id="cadastrosAccordion">
              <div className="accordion-item border-0 bg-transparent">
                <h2 className="accordion-header">
                  <button
                    className="accordion-button collapsed nav-link text-start w-100 d-flex align-items-center"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#cadastrosCollapse"
                    aria-expanded="false"
                    aria-controls="cadastrosCollapse"
                    onClick={(e) => {
                      const button = e.currentTarget;
                      const folderIcon = button.querySelector('.folder-icon');
                      setTimeout(() => {
                        if (folderIcon && button.classList.contains('collapsed')) {
                          folderIcon.className = 'bi bi-folder folder-icon me-2';
                        } else if (folderIcon) {
                          folderIcon.className = 'bi bi-folder2-open folder-icon me-2';
                        }
                      }, 10);
                    }}
                  >
                    <i className="bi bi-folder folder-icon me-2"></i>
                    <span>{t('layout.folderCadastros')}</span>
                  </button>
                </h2>
                <div
                  id="cadastrosCollapse"
                  className="accordion-collapse collapse"
                  aria-labelledby="cadastrosHeading"
                  data-bs-parent="#cadastrosAccordion"
                >
                  <div className="accordion-body p-0">
                    {cadastrosFolderItems.map((item) => (
                      <button
                        key={item.id}
                        className="nav-link text-start w-100 sidebar-folder-item d-flex align-items-center"
                        onClick={() => {
                          item.onClick();
                          setSidebarOpen(false);
                        }}
                        type="button"
                      >
                        <i className={`bi ${item.icon} me-2`}></i>
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Menu Pasta para Financeiro usando Bootstrap Accordion */}
            <div className="accordion sidebar-accordion" id="financeiroAccordion">
              <div className="accordion-item border-0 bg-transparent">
                <h2 className="accordion-header">
                  <button
                    className="accordion-button collapsed nav-link text-start w-100 d-flex align-items-center"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#financeiroCollapse"
                    aria-expanded="false"
                    aria-controls="financeiroCollapse"
                    onClick={(e) => {
                      const button = e.currentTarget;
                      const folderIcon = button.querySelector('.folder-icon');
                      setTimeout(() => {
                        if (folderIcon && button.classList.contains('collapsed')) {
                          folderIcon.className = 'bi bi-folder folder-icon me-2';
                        } else if (folderIcon) {
                          folderIcon.className = 'bi bi-folder2-open folder-icon me-2';
                        }
                      }, 10);
                    }}
                  >
                    <i className="bi bi-folder folder-icon me-2"></i>
                    <span>{t('layout.folderFinanceiro')}</span>
                  </button>
                </h2>
                <div
                  id="financeiroCollapse"
                  className="accordion-collapse collapse"
                  aria-labelledby="financeiroHeading"
                  data-bs-parent="#financeiroAccordion"
                >
                  <div className="accordion-body p-0">
                    {financeiroFolderItems.map((item) => (
                      <button
                        key={item.id}
                        className="nav-link text-start w-100 sidebar-folder-item d-flex align-items-center"
                        onClick={() => {
                          item.onClick();
                          setSidebarOpen(false);
                        }}
                        type="button"
                      >
                        <i className={`bi ${item.icon} me-2`}></i>
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Menu Pasta para Blockdomi usando Bootstrap Accordion */}
            <div className="accordion sidebar-accordion" id="blockdomiAccordion">
              <div className="accordion-item border-0 bg-transparent">
                <h2 className="accordion-header">
                  <button
                    className="accordion-button collapsed nav-link text-start w-100 d-flex align-items-center"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#blockdomiCollapse"
                    aria-expanded="false"
                    aria-controls="blockdomiCollapse"
                    onClick={(e) => {
                      const button = e.currentTarget;
                      const folderIcon = button.querySelector('.folder-icon');
                      setTimeout(() => {
                        if (folderIcon && button.classList.contains('collapsed')) {
                          folderIcon.className = 'bi bi-folder folder-icon me-2';
                        } else if (folderIcon) {
                          folderIcon.className = 'bi bi-folder2-open folder-icon me-2';
                        }
                      }, 10);
                    }}
                  >
                    <i className="bi bi-folder folder-icon me-2"></i>
                    <span>{t('blockdomi.menuTitle')}</span>
                  </button>
                </h2>
                <div
                  id="blockdomiCollapse"
                  className="accordion-collapse collapse"
                  aria-labelledby="blockdomiHeading"
                  data-bs-parent="#blockdomiAccordion"
                >
                  <div className="accordion-body p-0">
                    {blockdomiFolderItems.map((item) => (
                      <button
                        key={item.id}
                        className="nav-link text-start w-100 sidebar-folder-item d-flex align-items-center"
                        onClick={() => {
                          item.onClick();
                          setSidebarOpen(false);
                        }}
                        type="button"
                      >
                        <i className={`bi ${item.icon} me-2`}></i>
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Menu Pasta para Parâmetros usando Bootstrap Accordion */}
            <div className="accordion sidebar-accordion" id="parametrosAccordion">
              <div className="accordion-item border-0 bg-transparent">
                <h2 className="accordion-header">
                  <button
                    className="accordion-button collapsed nav-link text-start w-100 d-flex align-items-center"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#parametrosCollapse"
                    aria-expanded="false"
                    aria-controls="parametrosCollapse"
                    onClick={(e) => {
                      const button = e.currentTarget;
                      const folderIcon = button.querySelector('.folder-icon');
                      setTimeout(() => {
                        if (folderIcon && button.classList.contains('collapsed')) {
                          folderIcon.className = 'bi bi-folder folder-icon me-2';
                        } else if (folderIcon) {
                          folderIcon.className = 'bi bi-folder2-open folder-icon me-2';
                        }
                      }, 10);
                    }}
                  >
                    <i className="bi bi-folder folder-icon me-2"></i>
                    <span>{t('layout.parameters')}</span>
                  </button>
                </h2>
                <div
                  id="parametrosCollapse"
                  className="accordion-collapse collapse"
                  aria-labelledby="parametrosHeading"
                  data-bs-parent="#parametrosAccordion"
                >
                  <div className="accordion-body p-0">
                    {parametrosFolderItems.map((item) => (
                      <button
                        key={item.id}
                        className="nav-link text-start w-100 sidebar-folder-item d-flex align-items-center"
                        onClick={() => {
                          item.onClick();
                          setSidebarOpen(false);
                        }}
                        type="button"
                      >
                        {item.icon && <i className={`bi ${item.icon} me-2`}></i>}
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
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
                      className={
                        isMobile
                          ? 'layout-language-dropdown-menu--mobile shadow' // mobile fix: P7 — bottom sheet, sem getBoundingClientRect
                          : 'layout-language-dropdown-menu shadow'
                      }
                      style={
                        isMobile
                          ? undefined
                          : {
                              top: `${languageDropdownPosition.top}px`,
                              left: `${languageDropdownPosition.left}px`,
                              minWidth: '160px',
                              zIndex: 10001,
                            }
                      }
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
