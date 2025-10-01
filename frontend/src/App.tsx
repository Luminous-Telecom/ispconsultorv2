import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NotificationProvider } from './contexts/NotificationContext';
import { ThemeProvider } from './contexts/ThemeContext';
import './styles/themes.css';

// Layout
import Layout from './components/layout/Layout';

// Pages
import Dashboard from './components/pages/Dashboard';
import Clientes from './components/pages/Clientes';
import ClientesCreate from './components/pages/ClientesCreate';
import ClientesEdit from './components/pages/ClientesEdit';
import ClienteShow from './components/pages/ClienteShow';
import ClienteEdit from './components/pages/ClienteEdit';
import Planos from './components/pages/Planos';
import PlanosCreate from './components/pages/PlanosCreate';
import PlanosEdit from './components/pages/PlanosEdit';
import Bancos from './components/pages/Bancos';
import BancosCreate from './components/pages/BancosCreate';
import BancosEdit from './components/pages/BancosEdit';
import Titulos from './components/pages/Titulos';
import TitulosEdit from './components/pages/TitulosEdit';
import BoletoView from './components/pages/BoletoView';
import DadosEmpresa from './components/pages/DadosEmpresa';
import RotinasAgendadas from './components/pages/RotinasAgendadas';
import Parametros from './components/pages/Parametros';
import Contratos from './components/pages/Contratos';
import Login from './components/pages/Login';

// Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <NotificationProvider key={`notification-provider-${Date.now()}`}>
          <Router>
            <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="clientes" element={<Clientes />} />
            <Route path="clientes/create" element={<ClientesCreate />} />
            <Route path="clientes/:id" element={<ClienteShow />} />
            <Route path="clientes/:id/edit" element={<ClienteEdit />} />
            <Route path="planos" element={<Planos />} />
            <Route path="planos/create" element={<PlanosCreate />} />
            <Route path="planos/:id/edit" element={<PlanosEdit />} />
            <Route path="bancos" element={<Bancos />} />
            <Route path="bancos/create" element={<BancosCreate />} />
            <Route path="bancos/:id/edit" element={<BancosEdit />} />
            <Route path="titulos" element={<Titulos />} />
            <Route path="titulos/:id/edit" element={<TitulosEdit />} />
            <Route path="boleto/web/:id" element={<BoletoView />} />
            <Route path="contratos" element={<Contratos />} />
            <Route path="dados-empresa" element={<DadosEmpresa />} />
            <Route path="rotinas-agendadas" element={<RotinasAgendadas />} />
            <Route path="parametros" element={<Parametros />} />
          </Route>
            </Routes>
          </Router>
        </NotificationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
