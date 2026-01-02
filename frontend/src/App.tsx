import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NotificationProvider } from './components/notifications/NotificationProvider';
import { ThemeProvider } from './contexts/ThemeContext';
import { DashboardFiltersProvider } from './contexts/DashboardFiltersContext';
import { TableHeaderProvider } from './contexts/TableHeaderContext';
import { ModalProvider } from './contexts/ModalContext';
import { LoadingProvider } from './contexts/LoadingContext';
import Loading from './components/common/Loading';
import ProtectionLayer from './components/common/ProtectionLayer';
import Layout from './components/layout/Layout';
import './styles/themes.css';
import './styles/protection.css';

// Pages com lazy loading (code splitting)
const Home = lazy(() => import('./components/pages/Home'));
const Dashboard = lazy(() => import('./components/pages/Dashboard'));
const Login = lazy(() => import('./components/pages/Login'));
const PagamentoPublico = lazy(() => import('./components/pages/PagamentoPublico'));

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

function App() {
  return (
    <ProtectionLayer>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <NotificationProvider>
            <Router>
              <Suspense fallback={<Loading message="Carregando página..." />}>
                <Routes>
                  <Route path="/" element={
                    <Suspense fallback={<Loading message="Carregando página inicial..." />}>
                      <Home />
                    </Suspense>
                  } />
                  <Route path="/login" element={
                    <Suspense fallback={<Loading message="Carregando login..." />}>
                      <Login />
                    </Suspense>
                  } />
                  <Route path="/pagamento/:id/:token" element={
                    <Suspense fallback={<Loading message="Carregando página de pagamento..." />}>
                      <PagamentoPublico />
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
                      <Suspense fallback={<Loading message="Carregando dashboard..." />}>
                        <Dashboard />
                      </Suspense>
                    } />
                    <Route path="dashboard" element={
                      <Suspense fallback={<Loading message="Carregando dashboard..." />}>
                        <Dashboard />
                      </Suspense>
                    } />
                  </Route>
                </Routes>
              </Suspense>
            </Router>
          </NotificationProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ProtectionLayer>
  );
}

export default App;
