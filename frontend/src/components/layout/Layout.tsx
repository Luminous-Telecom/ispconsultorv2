import React, { useState } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import NotificationContainer from '../common/NotificationContainer';
import { useNotificationContext } from '../../contexts/NotificationContext';
import { useTheme } from '../../contexts/ThemeContext';

const Layout: React.FC = () => {
  const location = useLocation();
  const { notifications, removeNotification } = useNotificationContext();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const menuItems = [
    { path: '/dashboard', icon: 'bi-house', label: 'Dashboard' },
    { path: '/clientes', icon: 'bi-people', label: 'Clientes' },
    { path: '/planos', icon: 'bi-wifi', label: 'Planos' },
    { path: '/bancos', icon: 'bi-bank', label: 'Bancos' },
    { path: '/carnes', icon: 'bi-receipt', label: 'Carnês' },
    { path: '/carne-parcelas', icon: 'bi-calendar-check', label: 'Parcelas' },
    { path: '/dados-empresa', icon: 'bi-building', label: 'Dados da Empresa' },
  ];

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <i className="bi bi-broadcast"></i>
          </div>
          <h1 className="sidebar-title">CTM Telecom</h1>
        </div>
        
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <div key={item.path} className="sidebar-nav-item">
              <Link 
                to={item.path}
                className={`sidebar-nav-link ${isActive(item.path) ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <i className={item.icon}></i>
                {item.label}
              </Link>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Layout */}
      <div className="main-layout">
        {/* Header */}
        <header className="main-header">
          <div className="d-flex align-items-center">
            <button 
              className="btn btn-link d-md-none me-3"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{ color: 'var(--text-primary)' }}
            >
              <i className="bi bi-list"></i>
            </button>
            <h2 className="h4 mb-0">
              {menuItems.find(item => isActive(item.path))?.label || 'Dashboard'}
            </h2>
          </div>
          
          <div className="d-flex align-items-center gap-3">
            <button 
              className="theme-toggle"
              onClick={toggleTheme}
              title={`Alternar para tema ${theme === 'light' ? 'escuro' : 'claro'}`}
            >
              <i className={`bi ${theme === 'light' ? 'bi-moon' : 'bi-sun'}`}></i>
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="main-content">
          <Outlet />
        </main>
      </div>

      {/* Notifications */}
      <NotificationContainer
        notifications={notifications}
        onRemove={removeNotification}
      />
    </div>
  );
};

export default Layout;