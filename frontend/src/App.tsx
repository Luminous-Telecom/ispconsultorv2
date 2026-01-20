import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NotificationProvider } from './components/notifications/NotificationProvider';
import { ThemeProvider } from './contexts/ThemeContext';
import { I18nProvider, useI18n } from './contexts/I18nContext';
import { DashboardFiltersProvider } from './contexts/DashboardFiltersContext';
import { TableHeaderProvider } from './contexts/TableHeaderContext';
import { ModalProvider } from './contexts/ModalContext';
import { LoadingProvider } from './contexts/LoadingContext';
import Loading from './components/common/Loading';
import ErrorBoundary from './components/common/ErrorBoundary';
import ProtectionLayer from './components/common/ProtectionLayer';
import Layout from './components/layout/Layout';

// Pages com lazy loading (code splitting)
const Home = lazy(() => import('./components/pages/Home'));
const Dashboard = lazy(() => import('./components/pages/Dashboard'));
const Login = lazy(() => import('./components/pages/Login'));
const PagamentoPublico = lazy(() => import('./components/pages/PagamentoPublico'));
const CentralAssinante = lazy(() => import('./components/pages/CentralAssinante'));

// Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Não tentar novamente se for erro 401 (autenticação)
        if (error && typeof error === 'object' && 'response' in error) {
          const axiosError = error as { response?: { status?: number } };
          if (axiosError.response?.status === 401) {
            return false;
          }
        }
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
      // Não lançar erros não tratados que podem causar reload
      throwOnError: false,
    },
    mutations: {
      // Não lançar erros não tratados que podem causar reload
      throwOnError: false,
    },
  },
});

function AppContent() {
  const { t } = useI18n();
  
  return (
    <ErrorBoundary
      fallback={
        <div className="container-fluid d-flex align-items-center justify-content-center min-vh-100">
          <div className="text-center">
            <i className="bi bi-exclamation-triangle text-danger app-error-icon"></i>
            <h2 className="mt-3 text-danger">{t('ui.appError')}</h2>
            <p className="text-muted">{t('ui.criticalError')}</p>
            <button
              className="btn btn-primary mt-3"
              onClick={() => window.location.reload()}
            >
              {t('ui.reloadPage')}
            </button>
          </div>
        </div>
      }
    >
      <ProtectionLayer>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <NotificationProvider>
              <Router>
                <Suspense fallback={<Loading message={t('ui.loadingApplication')} />}>
                  <Routes>
                    <Route path="/" element={
                      <Suspense fallback={<Loading message={t('ui.loadingPage')} />}>
                        <Home />
                      </Suspense>
                    } />
                    <Route path="/login" element={
                      <Suspense fallback={<Loading message={t('ui.loadingLogin')} />}>
                        <Login />
                      </Suspense>
                    } />
                    <Route path="/pagamento/:id/:token" element={
                      <Suspense fallback={<Loading message={t('ui.loadingPayment')} />}>
                        <PagamentoPublico />
                      </Suspense>
                    } />
                    <Route path="/central-assinante" element={
                      <Suspense fallback={<Loading message="Carregando central do assinante..." />}>
                        <CentralAssinante />
                      </Suspense>
                    } />
                    <Route path="/central-assinante/:id/:token" element={
                      <Suspense fallback={<Loading message="Carregando central do assinante..." />}>
                        <CentralAssinante />
                      </Suspense>
                    } />
                    <Route path="/adm" element={
                      <DashboardFiltersProvider>
                        <TableHeaderProvider>
                          <ModalProvider>
                            <LoadingProvider>
                              <Layout />
                            </LoadingProvider>
                          </ModalProvider>
                        </TableHeaderProvider>
                      </DashboardFiltersProvider>
                    }>
                      <Route index element={
                        <Suspense fallback={<Loading message={t('ui.loadingDashboard')} />}>
                          <Dashboard />
                        </Suspense>
                      } />
                      <Route path="dashboard" element={
                        <Suspense fallback={<Loading message={t('ui.loadingDashboard')} />}>
                          <Dashboard />
                        </Suspense>
                      } />
                    </Route>
                    {/* Fallback: evitar ficar em rotas inválidas (ex: /undefined) */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </Router>
            </NotificationProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </ProtectionLayer>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  );
}

export default App;
