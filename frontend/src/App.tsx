import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NotificationProvider } from './components/notifications/NotificationProvider';
import { ThemeProvider } from './contexts/ThemeContext';
import { DashboardFiltersProvider } from './contexts/DashboardFiltersContext';
import './styles/themes.css';
import './styles/protection.css';

// Layout
import Layout from './components/layout/Layout';
//
// Pages
import Home from './components/pages/Home';
import Dashboard from './components/pages/Dashboard';
import Login from './components/pages/Login';

// Protection
import ProtectionLayer from './components/common/ProtectionLayer';
// teste
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
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/adm" element={
                  <DashboardFiltersProvider>
                    <Layout />
                  </DashboardFiltersProvider>
                }>
                  <Route index element={<Dashboard />} />
                  <Route path="dashboard" element={<Dashboard />} />
                </Route>
              </Routes>
            </Router>
          </NotificationProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ProtectionLayer>
  );
}

export default App;
