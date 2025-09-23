import React from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import NotificationContainer from '../common/NotificationContainer';
import { useNotification } from '../../hooks/useNotification';

const Layout: React.FC = () => {
  const location = useLocation();
  const { notifications, removeNotification } = useNotification();

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <div className="container-fluid">
      <div className="row">
        {/* Sidebar */}
        <nav className="col-md-3 col-lg-2 d-md-block sidebar collapse" style={{ 
          minHeight: '100vh', 
          backgroundColor: '#343a40' 
        }}>
          <div className="position-sticky pt-3">
            <div className="text-center mb-4">
              <h4 className="text-white">ERP Assessoria</h4>
            </div>
            
            <ul className="nav flex-column">
              <li className="nav-item">
                <Link 
                  className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}
                  to="/dashboard"
                  style={{ 
                    color: isActive('/dashboard') ? '#fff' : '#adb5bd',
                    backgroundColor: isActive('/dashboard') ? '#495057' : 'transparent'
                  }}
                >
                  <i className="bi bi-house-door"></i> Dashboard
                </Link>
              </li>
              <li className="nav-item">
                <Link 
                  className={`nav-link ${isActive('/clientes') ? 'active' : ''}`}
                  to="/clientes"
                  style={{ 
                    color: isActive('/clientes') ? '#fff' : '#adb5bd',
                    backgroundColor: isActive('/clientes') ? '#495057' : 'transparent'
                  }}
                >
                  <i className="bi bi-people"></i> Clientes
                </Link>
              </li>
              <li className="nav-item">
                <Link 
                  className={`nav-link ${isActive('/planos') ? 'active' : ''}`}
                  to="/planos"
                  style={{ 
                    color: isActive('/planos') ? '#fff' : '#adb5bd',
                    backgroundColor: isActive('/planos') ? '#495057' : 'transparent'
                  }}
                >
                  <i className="bi bi-wifi"></i> Planos
                </Link>
              </li>
              <li className="nav-item">
                <Link 
                  className={`nav-link ${isActive('/bancos') ? 'active' : ''}`}
                  to="/bancos"
                  style={{ 
                    color: isActive('/bancos') ? '#fff' : '#adb5bd',
                    backgroundColor: isActive('/bancos') ? '#495057' : 'transparent'
                  }}
                >
                  <i className="bi bi-bank"></i> Bancos
                </Link>
              </li>
              <li className="nav-item">
                <Link 
                  className={`nav-link ${isActive('/carnes') ? 'active' : ''}`}
                  to="/carnes"
                  style={{ 
                    color: isActive('/carnes') ? '#fff' : '#adb5bd',
                    backgroundColor: isActive('/carnes') ? '#495057' : 'transparent'
                  }}
                >
                  <i className="bi bi-receipt"></i> Carnês
                </Link>
              </li>
              <li className="nav-item">
                <Link 
                  className={`nav-link ${isActive('/dados-empresa') ? 'active' : ''}`}
                  to="/dados-empresa"
                  style={{ 
                    color: isActive('/dados-empresa') ? '#fff' : '#adb5bd',
                    backgroundColor: isActive('/dados-empresa') ? '#495057' : 'transparent'
                  }}
                >
                  <i className="bi bi-building"></i> Dados da Empresa
                </Link>
              </li>
            </ul>
          </div>
        </nav>

        {/* Main content */}
        <main className="col-md-9 ms-sm-auto col-lg-10 px-md-4 main-content" style={{ 
          backgroundColor: '#f8f9fa', 
          minHeight: '100vh' 
        }}>
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