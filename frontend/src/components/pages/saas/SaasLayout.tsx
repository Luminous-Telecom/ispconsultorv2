import React, { useEffect, useState, useRef } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';
import { useTheme } from '@/contexts/ThemeContext';
import { useSaasAuth } from '@/contexts/SaasAuthContext';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useLoading } from '@/contexts/LoadingContext';
import { useApiLoading } from '@/hooks/useApiLoading';
import LoadingDots from '@/components/common/LoadingDots';
import BackNetLogo from '@/components/common/BackNetLogo';
import SingleModalWrapper from '@/components/common/SingleModalWrapper';
import { useModal, type ModalType } from '@/contexts/ModalContext';
import { useI18n } from '@/contexts/I18nContext';
import { useTableHeader } from '@/contexts/TableHeaderContext';

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
        { id: 'historico-whatsapp', label: t('menu.whatsappHistory'), icon: 'bi-chat-dots', onClick: () => handleOpenModal('historico-whatsapp') },
        { id: 'historico-email', label: t('menu.emailHistory'), icon: 'bi-envelope-paper', onClick: () => handleOpenModal('historico-email') },
        { id: 'auditoria', label: 'Auditoria', icon: 'bi-journal-text', onClick: () => handleOpenModal('auditoria') },
        { id: 'atualizacoes', label: t('modal.updates'), icon: 'bi-arrow-clockwise', onClick: () => handleOpenModal('atualizacoes') },
        { id: 'backups', label: 'Backups', icon: 'bi-cloud-arrow-down', onClick: () => handleOpenModal('backups') },
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
                  <div className="navbar-search-container">
                    <select
                      id="saas-desktop-search-field"
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
                        if (tableHeader.onSearchClick) tableHeader.onSearchClick();
                      }}
                    >
                      <input
                        id="saas-desktop-search-input"
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
                {isMobile && (
                  <div className="navbar-inline-search">
                    <i className="bi bi-search navbar-inline-search-icon"></i>
                    <input
                      type="search"
                      className="navbar-inline-search-input"
                      placeholder={tableHeader.searchPlaceholder || t('layout.searchPlaceholder')}
                      value={tableHeader.searchValue}
                      onChange={(e) => tableHeader.setSearchValue(e.target.value)}
                      aria-label={t('layout.search')}
                    />
                  </div>
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
