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
import SidebarFolderItemBullet from 'components/layout/SidebarFolderItemBullet';
import SidebarMobileCloseButton from 'components/layout/SidebarMobileCloseButton';

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

  const logsErpRootItems = [
    { id: 'logs-usuarios', label: t('logs.usuarios'), onClick: () => handleOpenModal('logs-usuarios') },
    { id: 'logs-assinatura-digital', label: t('logs.assinaturaDigital'), onClick: () => handleOpenModal('logs-assinatura-digital') },
    { id: 'logs-acesso-sistema', label: t('logs.acessoSistema'), onClick: () => handleOpenModal('logs-acesso-sistema') },
    { id: 'logs-blockdomi-api', label: t('blockdomi.logsApi'), onClick: () => handleOpenModal('logs-blockdomi-api') },
  ];

  const logsErpComunicacaoItems = [
    { id: 'logs-whatsapp', label: t('logs.whatsapp'), onClick: () => handleOpenModal('logs-whatsapp') },
    { id: 'logs-email', label: t('logs.email'), onClick: () => handleOpenModal('logs-email') },
  ];

  const logsErpEquipamentosItems = [
    { id: 'logs-equipamentos', label: t('logs.equipamentos'), onClick: () => handleOpenModal('logs-equipamentos') },
    { id: 'logs-agentes', label: t('logs.agentes'), onClick: () => handleOpenModal('logs-agentes') },
  ];

  const logsErpRpkiItems = [
    { id: 'rpki-logs-validacao', label: t('logs.rpkiSincronizacao'), onClick: () => handleOpenModal('rpki-logs-validacao') },
    { id: 'rpki-logs-ca-pai', label: t('logs.rpkiCaPai'), onClick: () => handleOpenModal('rpki-logs-ca-pai') },
    { id: 'rpki-logs-repositorios', label: t('logs.rpkiRepositorios'), onClick: () => handleOpenModal('rpki-logs-repositorios') },
  ];

  const sidebarGroupsHead = [
    {
      id: 'cadastros-saas',
      folder: 'Cadastros SaaS',
      items: [
        { id: 'saas-clientes', label: 'Clientes Tenants', onClick: () => handleOpenModal('saas-clientes') },
        { id: 'saas-planos', label: 'Planos', onClick: () => handleOpenModal('saas-planos') },
        { id: 'saas-bancos', label: 'Bancos', onClick: () => handleOpenModal('saas-bancos') },
        { id: 'saas-tipos-cobranca', label: 'Tipos de Cobrança', onClick: () => handleOpenModal('saas-tipos-cobranca') },
      ],
    },
    {
      id: 'financeiro-saas',
      folder: 'Financeiro SaaS',
      items: [
        { id: 'saas-titulos', label: 'Contas a Receber', onClick: () => handleOpenModal('saas-titulos') },
      ],
    },
  ];

  const sidebarGroupsTail = [
    {
      id: 'logs-saas-superadmin',
      folder: t('layout.folderLogsSaas'),
      items: [
        { id: 'saas-logs-usuarios', label: t('logs.usuarios'), onClick: () => handleOpenModal('saas-logs-usuarios') },
        { id: 'saas-logs-agenda-tarefas', label: t('logs.agendaTarefas'), onClick: () => handleOpenModal('saas-logs-agenda-tarefas') },
        { id: 'saas-logs-email', label: t('logs.email'), onClick: () => handleOpenModal('saas-logs-email') },
        { id: 'saas-logs-whatsapp', label: t('logs.whatsapp'), onClick: () => handleOpenModal('saas-logs-whatsapp') },
        { id: 'saas-logs-assinatura-digital', label: t('logs.assinaturaDigital'), onClick: () => handleOpenModal('saas-logs-assinatura-digital') },
        { id: 'saas-logs-acesso-sistema', label: t('logs.acessoSistema'), onClick: () => handleOpenModal('saas-logs-acesso-sistema') },
      ],
    },
    {
      id: 'parametros-saas',
      folder: 'Configurações',
      items: [
        { id: 'saas-dados-empresa', label: t('menu.companyData'), onClick: () => handleOpenModal('saas-dados-empresa') },
        { id: 'saas-usuarios', label: 'Usuários SaaS', onClick: () => handleOpenModal('saas-usuarios') },
        { id: 'saas-recursos-sistema', label: t('params.systemResources'), onClick: () => handleOpenModal('saas-recursos-sistema') },
        { id: 'saas-agendador-tarefas', label: t('params.taskScheduler'), onClick: () => handleOpenModal('saas-agendador-tarefas') },
        { id: 'saas-nfse', label: t('params.nfse'), onClick: () => handleOpenModal('saas-nfse') },
        { id: 'saas-dias-vencimento', label: t('params.dueDays'), onClick: () => handleOpenModal('saas-dias-vencimento') },
        { id: 'saas-servidores-email', label: 'Servidores Email', onClick: () => handleOpenModal('saas-servidores-email') },
        { id: 'saas-servidores-whatsapp', label: 'Servidores WhatsApp', onClick: () => handleOpenModal('saas-servidores-whatsapp') },
        { id: 'saas-historico-whatsapp', label: t('menu.whatsappHistory'), onClick: () => handleOpenModal('saas-historico-whatsapp') },
        { id: 'saas-historico-email', label: t('menu.emailHistory'), onClick: () => handleOpenModal('saas-historico-email') },
        { id: 'saas-auditoria', label: 'Auditoria', onClick: () => handleOpenModal('saas-auditoria') },
        { id: 'saas-atualizacoes', label: t('modal.updates'), onClick: () => handleOpenModal('saas-atualizacoes') },
        { id: 'saas-backups', label: 'Backups', onClick: () => handleOpenModal('saas-backups') },
      ],
    },
  ];

  const renderSidebarAccordionGroup = (group: (typeof sidebarGroupsHead)[number]) => (
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
                <SidebarFolderItemBullet />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

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
            <SidebarMobileCloseButton onClose={() => setSidebarOpen(false)} />
          )}
        </div>

        <div className="sidebar-nav-scrollable flex-grow-1">
          <nav className="sidebar-nav nav nav-pills flex-column mb-auto px-2">
            {sidebarGroupsHead.map(renderSidebarAccordionGroup)}
            <div className="accordion sidebar-accordion" id="logs-erp-superadminAccordion">
              <div className="accordion-item border-0 bg-transparent">
                <h2 className="accordion-header">
                  <button
                    className="accordion-button collapsed nav-link text-start w-100 d-flex align-items-center"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#logs-erp-superadminCollapse"
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
                    <span>{t('layout.folderLogsErp')}</span>
                  </button>
                </h2>
                <div id="logs-erp-superadminCollapse" className="accordion-collapse collapse">
                  <div className="accordion-body p-0">
                    {logsErpRootItems.map((item) => (
                      <button
                        key={item.id}
                        className="nav-link text-start w-100 sidebar-folder-item d-flex align-items-center"
                        type="button"
                        onClick={() => {
                          item.onClick();
                          setSidebarOpen(false);
                        }}
                      >
                        <SidebarFolderItemBullet />
                        <span>{item.label}</span>
                      </button>
                    ))}
                    <div className="accordion sidebar-accordion border-0" id="saasLogsComunicacaoAccordion">
                      <div className="accordion-item border-0 bg-transparent">
                        <h2 className="accordion-header" id="saasLogsComunicacaoHeading">
                          <button
                            className="accordion-button collapsed nav-link text-start w-100 d-flex align-items-center"
                            type="button"
                            data-bs-toggle="collapse"
                            data-bs-target="#saasLogsComunicacaoCollapse"
                            aria-expanded="false"
                            aria-controls="saasLogsComunicacaoCollapse"
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
                            <span>{t('layout.folderLogsComunicacao')}</span>
                          </button>
                        </h2>
                        <div
                          id="saasLogsComunicacaoCollapse"
                          className="accordion-collapse collapse"
                          aria-labelledby="saasLogsComunicacaoHeading"
                          data-bs-parent="#saasLogsComunicacaoAccordion"
                        >
                          <div className="accordion-body p-0">
                            {logsErpComunicacaoItems.map((item) => (
                              <button
                                key={item.id}
                                className="nav-link text-start w-100 sidebar-folder-item d-flex align-items-center"
                                type="button"
                                onClick={() => {
                                  item.onClick();
                                  setSidebarOpen(false);
                                }}
                              >
                                <SidebarFolderItemBullet />
                                <span>{item.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="accordion sidebar-accordion border-0" id="saasLogsEquipamentosAccordion">
                      <div className="accordion-item border-0 bg-transparent">
                        <h2 className="accordion-header" id="saasLogsEquipamentosHeading">
                          <button
                            className="accordion-button collapsed nav-link text-start w-100 d-flex align-items-center"
                            type="button"
                            data-bs-toggle="collapse"
                            data-bs-target="#saasLogsEquipamentosCollapse"
                            aria-expanded="false"
                            aria-controls="saasLogsEquipamentosCollapse"
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
                            <span>{t('layout.folderLogsEquipamentos')}</span>
                          </button>
                        </h2>
                        <div
                          id="saasLogsEquipamentosCollapse"
                          className="accordion-collapse collapse"
                          aria-labelledby="saasLogsEquipamentosHeading"
                          data-bs-parent="#saasLogsEquipamentosAccordion"
                        >
                          <div className="accordion-body p-0">
                            {logsErpEquipamentosItems.map((item) => (
                              <button
                                key={item.id}
                                className="nav-link text-start w-100 sidebar-folder-item d-flex align-items-center"
                                type="button"
                                onClick={() => {
                                  item.onClick();
                                  setSidebarOpen(false);
                                }}
                              >
                                <SidebarFolderItemBullet />
                                <span>{item.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="accordion sidebar-accordion border-0" id="saasLogsRpkiAccordion">
                      <div className="accordion-item border-0 bg-transparent">
                        <h2 className="accordion-header" id="saasLogsRpkiHeading">
                          <button
                            className="accordion-button collapsed nav-link text-start w-100 d-flex align-items-center"
                            type="button"
                            data-bs-toggle="collapse"
                            data-bs-target="#saasLogsRpkiCollapse"
                            aria-expanded="false"
                            aria-controls="saasLogsRpkiCollapse"
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
                            <span>{t('layout.folderLogsRpki')}</span>
                          </button>
                        </h2>
                        <div
                          id="saasLogsRpkiCollapse"
                          className="accordion-collapse collapse"
                          aria-labelledby="saasLogsRpkiHeading"
                          data-bs-parent="#saasLogsRpkiAccordion"
                        >
                          <div className="accordion-body p-0">
                            {logsErpRpkiItems.map((item) => (
                              <button
                                key={item.id}
                                className="nav-link text-start w-100 sidebar-folder-item d-flex align-items-center"
                                type="button"
                                onClick={() => {
                                  item.onClick();
                                  setSidebarOpen(false);
                                }}
                              >
                                <SidebarFolderItemBullet />
                                <span>{item.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {sidebarGroupsTail.map(renderSidebarAccordionGroup)}
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

              <div className="layout-user-area d-flex align-items-center justify-content-end">
                <div className="layout-user-menu text-end" ref={userMenuRef}>
                  <button
                    type="button"
                    className="layout-user-trigger"
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    aria-expanded={showUserMenu}
                    aria-haspopup="true"
                    title={currentUser?.nome || 'SaaS'}
                  >
                    <span className="layout-user-trigger__avatar" aria-hidden>
                      <i className="bi bi-person" />
                    </span>
                  </button>
                  {showUserMenu && (
                    <ul className="layout-user-dropdown layout-table-dropdown">
                      <li className="layout-user-dropdown__header">
                        <div className="layout-user-dropdown__name text-truncate">
                          {currentUser?.nome || 'Super Admin'}
                        </div>
                        <small className="layout-user-dropdown__email text-truncate">{currentUser?.email}</small>
                        {currentUser?.nivel_acesso && (
                          <small className="d-block mt-1 text-warning text-uppercase" style={{ fontSize: '0.65rem' }}>
                            {currentUser.nivel_acesso}
                          </small>
                        )}
                      </li>
                      <li>
                        <button
                          type="button"
                          className="layout-user-dropdown__row"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTheme();
                          }}
                        >
                          <i className="bi bi-circle-half" aria-hidden />
                          <span>{theme === 'light' ? t('layout.darkMode') : t('layout.lightMode')}</span>
                        </button>
                      </li>
                      <li>
                        <button
                          type="button"
                          className="layout-user-dropdown__row layout-user-dropdown__row--danger layout-user-dropdown__row--last"
                          onClick={handleLogout}
                        >
                          <i className="bi bi-box-arrow-right" aria-hidden />
                          <span>{t('nav.logout')}</span>
                        </button>
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
