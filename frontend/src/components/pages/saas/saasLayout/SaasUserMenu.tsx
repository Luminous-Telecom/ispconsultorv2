import React from 'react';
import type { SaasCurrentUser } from 'services/saas/saasAuthService';
import type { TranslateFn } from 'components/layout/layout/types';

interface SaasUserMenuProps {
  currentUser: SaasCurrentUser | null;
  showUserMenu: boolean;
  theme: string;
  userMenuRef: React.RefObject<HTMLDivElement | null>;
  t: TranslateFn;
  onToggleUserMenu: () => void;
  onToggleTheme: () => void;
  onLogout: () => void;
}

const SaasUserMenu: React.FC<SaasUserMenuProps> = ({
  currentUser,
  showUserMenu,
  theme,
  userMenuRef,
  t,
  onToggleUserMenu,
  onToggleTheme,
  onLogout,
}) => (
  <div className="layout-user-area d-flex align-items-center justify-content-end">
    <div className="layout-user-menu text-end" ref={userMenuRef}>
      <button
        type="button"
        className="layout-user-trigger"
        onClick={onToggleUserMenu}
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
                onToggleTheme();
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
              onClick={onLogout}
            >
              <i className="bi bi-box-arrow-right" aria-hidden />
              <span>{t('nav.logout')}</span>
            </button>
          </li>
        </ul>
      )}
    </div>
  </div>
);

export default SaasUserMenu;
