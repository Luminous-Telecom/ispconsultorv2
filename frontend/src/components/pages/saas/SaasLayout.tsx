import React, { useEffect, useState, useRef } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useTheme } from 'contexts/ThemeContext';
import { useSaasAuth } from 'contexts/SaasAuthContext';
import { useIsMobile } from 'hooks/useMediaQuery';
import { useLoading } from 'contexts/LoadingContext';
import { useApiLoading } from 'hooks/useApiLoading';
import LoadingDots from 'components/common/LoadingDots';
import SearchBar from 'components/ui/SearchBar';
import BackNetLogo from 'components/common/BackNetLogo';
import SingleModalWrapper from 'components/common/SingleModalWrapper';
import { useModal, type ModalType } from 'contexts/ModalContext';
import { useI18n } from 'contexts/I18nContext';
import { useTableHeader } from 'contexts/TableHeaderContext';

const SaasLayout: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const tableHeader = useTableHeader();
  const { currentUser, logout, isAuthenticated, isLoading: authLoading } = useSaasAuth();
  const { success } = useNotificationContext();
  const { theme, toggleTheme } = useTheme();
  const { openModal } = useModal();
  const isMobile = useIsMobile();
  const { isLoading } = useLoading();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  useApiLoading();

  useEffect(() => {
    document.title = 'SuperAdmin — BackNet SaaS';
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/saas/login', { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    if (showUserMenu) {
      const id = setTimeout(() => document.addEventListener('click', handleClickOutside), 0);
      return () => { clearTimeout(id); document.removeEventListener('click', handleClickOutside); };
    }
  }, [showUserMenu]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMobile && sidebarOpen && sidebarRef.current) {
        if (!sidebarRef.current.contains(event.target as Node)) setSidebarOpen(false);
      }
    };
    if (isMobile && sidebarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMobile, sidebarOpen]);

  const handleLogout = async () => {
    await logout();
    success('Sessão encerrada');
    navigate('/saas/login');
  };

  const handleOpenModal = (modalName: string) => {
    openModal(modalName as ModalType);
  };

  const menuItems = [
    {
      id: 'cadastros-saas',
      folder: 'Cadastros SaaS',
      items: [
        { id: 'saas-clientes', label: 'Clientes Tenants', icon: 'bi-people', onClick: () => handleOpenModal('saas-clientes') },
        { id: 'saas-planos', label: 'Planos', icon: 'bi-card-list', onClick: () => handleOpenModal('saas-planos') },
        { id: 'saas-bancos', label: 'Bancos', icon: 'bi-bank', onClick: () => handleOpenModal('saas-bancos') },
        { id: 'saas-tipos-cobranca', label: 'Tipos de Cobrança', icon: 'bi-credit-card', onClick: () => handleOpenModal('saas-tipos-cobranca') },
      ],
    },
    {
      id: 'financeiro-saas',
      folder: 'Financeiro SaaS',
      items: [
        { id: 'saas-titulos', label: 'Contas a Receber', icon: 'bi-cash-coin', onClick: () => handleOpenModal('saas-titulos') },
      ],
    },
    {
      id: 'logs-erp-superadmin',
      folder: t('layout.folderLogsErp'),
      items: [
        { id: 'logs-usuarios', label: t('logs.usuarios'), icon: 'bi-people-fill', onClick: () => handleOpenModal('logs-usuarios') },
        { id: 'logs-webhook', label: t('logs.webhook'), icon: 'bi-link-45deg', onClick: () => handleOpenModal('logs-webhook') },
        { id: 'logs-email', label: t('logs.email'), icon: 'bi-envelope', onClick: () => handleOpenModal('logs-email') },
        { id: 'logs-whatsapp', label: t('logs.whatsapp'), icon: 'bi-whatsapp', onClick: () => handleOpenModal('logs-whatsapp') },
        { id: 'logs-assinatura-digital', label: t('logs.assinaturaDigital'), icon: 'bi-pen', onClick: () => handleOpenModal('logs-assinatura-digital') },
        { id: 'logs-acesso-sistema', label: t('logs.acessoSistema'), icon: 'bi-door-open', onClick: () => handleOpenModal('logs-acesso-sistema') },
        { id: 'logs-equipamentos', label: t('logs.equipamentos'), icon: 'bi-journal-code', onClick: () => handleOpenModal('logs-equipamentos') },
        { id: 'logs-agentes', label: t('logs.agentes'), icon: 'bi-plugin', onClick: () => handleOpenModal('logs-agentes') },
        { id: 'logs-blockdomi-api', label: t('blockdomi.logsApi'), icon: 'bi-journal-text', onClick: () => handleOpenModal('logs-blockdomi-api') },
      ],
    },
    {
      id: 'logs-saas-superadmin',
      folder: t('layout.folderLogsSaas'),
      items: [
        { id: 'saas-logs-usuarios', label: t('logs.usuarios'), icon: 'bi-people-fill', onClick: () => handleOpenModal('saas-logs-usuarios') },
        { id: 'saas-logs-agenda-tarefas', label: t('logs.agendaTarefas'), icon: 'bi-clock-history', onClick: () => handleOpenModal('saas-logs-agenda-tarefas') },
        { id: 'saas-logs-webhook', label: t('logs.webhook'), icon: 'bi-link-45deg', onClick: () => handleOpenModal('saas-logs-webhook') },
        { id: 'saas-logs-email', label: t('logs.email'), icon: 'bi-envelope', onClick: () => handleOpenModal('saas-logs-email') },
        { id: 'saas-logs-whatsapp', label: t('logs.whatsapp'), icon: 'bi-whatsapp', onClick: () => handleOpenModal('saas-logs-whatsapp') },
        { id: 'saas-logs-assinatura-digital', label: t('logs.assinaturaDigital'), icon: 'bi-pen', onClick: () => handleOpenModal('saas-logs-assinatura-digital') },
        { id: 'saas-logs-acesso-sistema', label: t('logs.acessoSistema'), icon: 'bi-door-open', onClick: () => handleOpenModal('saas-logs-acesso-sistema') },
      ],
    },
    {
      id: 'parametros-saas',
      folder: 'Configurações',
      items: [
        { id: 'saas-dados-empresa', label: t('menu.companyData'), icon: 'bi-building', onClick: () => handleOpenModal('saas-dados-empresa') },
        { id: 'saas-usuarios', label: 'Usuários SaaS', icon: 'bi-people-fill', onClick: () => handleOpenModal('saas-usuarios') },
        { id: 'saas-recursos-sistema', label: t('params.systemResources'), icon: 'bi-gear', onClick: () => handleOpenModal('saas-recursos-sistema') },
        { id: 'saas-agendador-tarefas', label: t('params.taskScheduler'), icon: 'bi-clock-history', onClick: () => handleOpenModal('saas-agendador-tarefas') },
        { id: 'saas-nfse', label: t('params.nfse'), icon: 'bi-file-earmark-text', onClick: () => handleOpenModal('saas-nfse') },
        { id: 'saas-dias-vencimento', label: t('params.dueDays'), icon: 'bi-calendar-event', onClick: () => handleOpenModal('saas-dias-vencimento') },
        { id: 'saas-servidores-email', label: 'Servidores Email', icon: 'bi-envelope', onClick: () => handleOpenModal('saas-servidores-email') },
        { id: 'saas-servidores-whatsapp', label: 'Servidores WhatsApp', icon: 'bi-whatsapp', onClick: () => handleOpenModal('saas-servidores-whatsapp') },
        { id: 'saas-historico-whatsapp', label: t('menu.whatsappHistory'), icon: 'bi-chat-dots', onClick: () => handleOpenModal('saas-historico-whatsapp') },
        { id: 'saas-historico-email', label: t('menu.emailHistory'), icon: 'bi-envelope-paper', onClick: () => handleOpenModal('saas-historico-email') },
        { id: 'saas-auditoria', label: 'Auditoria', icon: 'bi-journal-text', onClick: () => handleOpenModal('saas-auditoria') },
        { id: 'saas-atualizacoes', label: t('modal.updates'), icon: 'bi-arrow-clockwise', onClick: () => handleOpenModal('saas-atualizacoes') },
        { id: 'saas-backups', label: 'Backups', icon: 'bi-cloud-arrow-down', onClick: () => handleOpenModal('saas-backups') },
      ],
    },
  ];

  if (authLoading) return null;

  return (
    <div className="app-layout">
      {isMobile && sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <aside ref={sidebarRef} className={`d-flex flex-column flex-shrink-0 sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header-fixed d-flex flex-column align-items-center justify-content-center p-3 mb-0 position-relative">
          <div className="sidebar-logo-wrapper w-100 d-flex flex-column align-items-center">
            <BackNetLogo width={200} height={65} />
            <div className="sidebar-title-wrapper overflow-hidden w-100 d-flex justify-content-center">
              <div className="sidebar-company-name text-truncate d-flex align-items-center justify-content-center gap-1">
                <i className="bi bi-shield-lock-fill text-warning"></i>
                <span className="text-warning fw-semibold">SuperAdmin</span>
              </div>
            </div>
          </div>
          {isMobile && (
            <button
              type="button"
              className="btn btn-link p-0 position-absolute top-0 end-0 m-2 sidebar-header-back-btn"
              onClick={() => setSidebarOpen(false)}
              aria-label="Fechar menu"
            >
              <i className="bi bi-arrow-left fs-4"></i>
            </button>
          )}
        </div>

        <div className="sidebar-nav-scrollable flex-grow-1">
          <nav className="sidebar-nav nav nav-pills flex-column mb-auto px-2">
            {menuItems.map((group) => (
              <div key={group.id} className="accordion sidebar-accordion" id={`${group.id}Accordion`}>
                <div className="accordion-item border-0 bg-transparent">
                  <h2 className="accordion-header">
                    <button
                      className="accordion-button collapsed nav-link text-start w-100 d-flex align-items-center"
                      type="button"
                      data-bs-toggle="collapse"
                      data-bs-target={`#${group.id}Collapse`}
                      aria-expanded="false"
                      onClick={(e) => {
                        const btn = e.currentTarget;
                        const folderIcon = btn.querySelector('.folder-icon');
                        setTimeout(() => {
                          if (folderIcon) {
                            folderIcon.className = btn.classList.contains('collapsed')
                              ? 'bi bi-folder folder-icon me-2'
                              : 'bi bi-folder2-open folder-icon me-2';
                          }
                        }, 10);
                      }}
                    >
                      <i className="bi bi-folder folder-icon me-2"></i>
                      <span>{group.folder}</span>
                    </button>
                  </h2>
                  <div id={`${group.id}Collapse`} className="accordion-collapse collapse">
                    <div className="accordion-body p-0">
                      {group.items.map((item) => (
                        <button
                          key={item.id}
                          className="nav-link text-start w-100 sidebar-folder-item d-flex align-items-center"
                          type="button"
                          onClick={() => {
                            item.onClick();
                            setSidebarOpen(false);
                          }}
                        >
                          <i className={`bi ${item.icon} me-2`}></i>
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </nav>
        </div>
      </aside>

      <div className="main-layout">
        <header className="navbar navbar-expand-md sticky-top main-navbar">
          <div className="container-fluid">
            <div className="d-flex flex-wrap align-items-center justify-content-between w-100">
              <div className="d-flex align-items-center">
                {isMobile && (
                  <button
                    className="navbar-toggler d-block border-0 p-0"
                    type="button"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    aria-label="Abrir menu"
                  >
                    <span className="navbar-toggler-icon"></span>
                  </button>
                )}
              </div>

              <div className="d-flex justify-content-center flex-grow-1">
                {!isMobile && (
                  <SearchBar
                    id="saas-desktop-search"
                    variant="navbar"
                    value={tableHeader.searchValue}
                    onChange={tableHeader.setSearchValue}
                    onSearch={(value) => tableHeader.onSearchClick?.(value)}
                    placeholder={tableHeader.searchPlaceholder || t('layout.searchPlaceholder')}
                    searchField={tableHeader.searchField}
                    onSearchFieldChange={tableHeader.setSearchField}
                    searchFields={tableHeader.availableSearchFields}
                    autoComplete="off"
                  />
                )}
                {isMobile && (
                  <SearchBar
                    id="saas-mobile-search"
                    variant="inline"
                    value={tableHeader.searchValue}
                    onChange={tableHeader.setSearchValue}
                    onSearch={(value) => tableHeader.onSearchClick?.(value)}
                    placeholder={tableHeader.searchPlaceholder || t('layout.searchPlaceholder')}
                    searchField={tableHeader.searchField}
                    onSearchFieldChange={tableHeader.setSearchField}
                    searchFields={tableHeader.availableSearchFields}
                    autoComplete="off"
                  />
                )}
              </div>

              <div className="d-flex align-items-center justify-content-end">
                <div className="dropdown text-end" ref={userMenuRef}>
                  <button
                    className="d-block link-theme-toggle text-decoration-none dropdown-toggle bg-transparent border-0 p-0"
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    aria-expanded={showUserMenu}
                  >
                    <div className="rounded-circle bg-warning d-flex align-items-center justify-content-center text-dark layout-user-avatar">
                      <i className="bi bi-shield-lock"></i>
                    </div>
                  </button>
                  {showUserMenu && (
                    <ul className="table-dropdown-menu table-dropdown-menu-right shadow position-absolute mt-2 layout-table-dropdown">
                      <li className="px-3 py-2 border-bottom border-custom mb-1">
                        <div className="fw-bold text-truncate text-custom-primary layout-user-name">
                          {currentUser?.nome || 'Super Admin'}
                        </div>
                        <small className="text-custom-secondary text-truncate d-block" style={{ maxWidth: '150px' }}>
                          {currentUser?.email}
                        </small>
                        <small className="text-warning">{currentUser?.nivel_acesso?.toUpperCase()}</small>
                      </li>
                      <li
                        className="table-dropdown-item"
                        onClick={(e) => { e.stopPropagation(); toggleTheme(); }}
                      >
                        <i className={`bi bi-${theme === 'light' ? 'moon' : 'sun'}`}></i>
                        <span>{theme === 'light' ? 'Modo escuro' : 'Modo claro'}</span>
                      </li>
                      <li><hr className="dropdown-divider" /></li>
                      <li className="table-dropdown-item text-danger" onClick={handleLogout}>
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

        {isLoading && (
          <div className="layout-loading-bar">
            <LoadingDots />
          </div>
        )}

        <main className="main-content">
          <Outlet />
        </main>

        <SingleModalWrapper />
      </div>
    </div>
  );
};

export default SaasLayout;
