import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NotificationProvider } from './components/notifications/NotificationProvider';
import { ThemeProvider } from './contexts/ThemeContext';
import { I18nProvider, useI18n } from './contexts/I18nContext';
import { DashboardFiltersProvider } from './contexts/DashboardFiltersContext';
import { TableHeaderProvider } from './contexts/TableHeaderContext';
import { ModalProvider } from './contexts/ModalContext';
import { LoadingProvider } from './contexts/LoadingContext';
import { SaasAuthProvider } from './contexts/SaasAuthContext';
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
const Privacidade = lazy(() => import('./components/pages/Privacidade'));
const Termos = lazy(() => import('./components/pages/Termos'));
const Cookies = lazy(() => import('./components/pages/Cookies'));

// SaaS Admin Pages
const SaasLogin = lazy(() => import('./components/pages/saas/SaasLogin'));
const SaasLayout = lazy(() => import('./components/pages/saas/SaasLayout'));
const SaasDashboard = lazy(() => import('./components/pages/saas/SaasDashboard'));

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

/** Define data-app no body para isolar estilos site vs sistema */
function RouteAppContext() {
  const location = useLocation();
  useEffect(() => {
    const isSystem = location.pathname.startsWith('/adm') || location.pathname.startsWith('/saas') || location.pathname === '/login';
    document.body.setAttribute('data-app', isSystem ? 'system' : 'site');
  }, [location.pathname]);
  return null;
}

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
              <SaasAuthProvider>
              <Router>
                <RouteAppContext />
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
                    <Route path="/pagamento/:id/:token?" element={
                      <Suspense fallback={<Loading message={t('ui.loadingPayment')} />}>
                        <PagamentoPublico />
                      </Suspense>
                    } />
                    <Route path="/central-assinante/:slug" element={
                      <Suspense fallback={<Loading message={t('ui.loadingSubscriberCenter')} />}>
                        <CentralAssinante />
                      </Suspense>
                    } />
                    <Route path="/privacidade" element={
                      <Suspense fallback={<Loading message={t('ui.loadingPage')} />}>
                        <Privacidade />
                      </Suspense>
                    } />
                    <Route path="/termos" element={
                      <Suspense fallback={<Loading message={t('ui.loadingPage')} />}>
                        <Termos />
                      </Suspense>
                    } />
                    <Route path="/cookies" element={
                      <Suspense fallback={<Loading message={t('ui.loadingPage')} />}>
                        <Cookies />
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
                    {/* Rotas SaaS Super Admin */}
                    <Route path="/saas/login" element={
                      <Suspense fallback={<Loading message="Carregando..." />}>
                        <SaasLogin />
                      </Suspense>
                    } />
                    <Route path="/saas" element={
                      <DashboardFiltersProvider>
                        <TableHeaderProvider>
                          <ModalProvider>
                            <LoadingProvider>
                              <Suspense fallback={<Loading message="Carregando painel SaaS..." />}>
                                <SaasLayout />
                              </Suspense>
                            </LoadingProvider>
                          </ModalProvider>
                        </TableHeaderProvider>
                      </DashboardFiltersProvider>
                    }>
                      <Route index element={
                        <Suspense fallback={<Loading message="Carregando..." />}>
                          <SaasDashboard />
                        </Suspense>
                      } />
                    </Route>

                    {/* Fallback: evitar ficar em rotas inválidas (ex: /undefined) */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </Router>
              </SaasAuthProvider>
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
