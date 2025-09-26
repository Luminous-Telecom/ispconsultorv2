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
import Planos from './components/pages/Planos';
import PlanosCreate from './components/pages/PlanosCreate';
import PlanosEdit from './components/pages/PlanosEdit';
import Bancos from './components/pages/Bancos';
import BancosCreate from './components/pages/BancosCreate';
import BancosEdit from './components/pages/BancosEdit';
import Carnes from './components/pages/Carnes';
import CarnesCreate from './components/pages/CarnesCreate';
import CarnesEdit from './components/pages/CarnesEdit';
import CarnesShow from './components/pages/CarnesShow';
import CarneParcelas from './components/pages/CarneParcelas';
import CarneParcelasEdit from './components/pages/CarneParcelasEdit';
import BoletoView from './components/pages/BoletoView';
import DadosEmpresa from './components/pages/DadosEmpresa';
import RotinasAgendadas from './components/pages/RotinasAgendadas';
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
        <NotificationProvider>
          <Router>
            <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="clientes" element={<Clientes />} />
            <Route path="clientes/create" element={<ClientesCreate />} />
            <Route path="clientes/:id/edit" element={<ClientesEdit />} />
            <Route path="planos" element={<Planos />} />
            <Route path="planos/create" element={<PlanosCreate />} />
            <Route path="planos/:id/edit" element={<PlanosEdit />} />
            <Route path="bancos" element={<Bancos />} />
            <Route path="bancos/create" element={<BancosCreate />} />
            <Route path="bancos/:id/edit" element={<BancosEdit />} />
            <Route path="carnes" element={<Carnes />} />
            <Route path="carnes/create" element={<CarnesCreate />} />
            <Route path="carnes/:id" element={<CarnesShow />} />
            <Route path="carnes/:id/edit" element={<CarnesEdit />} />
            <Route path="carnes/:carneId/imprimir" element={<div>Funcionalidade de impressão será implementada</div>} />
            <Route path="carnes/:carneId/pdf" element={<div>Funcionalidade de PDF será implementada</div>} />
            <Route path="carnes/:carneId/parcelas" element={<CarneParcelas />} />
            <Route path="carne-parcelas" element={<CarneParcelas />} />
            <Route path="carne-parcelas/:id/edit" element={<CarneParcelasEdit />} />
            <Route path="boleto/web/:id" element={<BoletoView />} />
            <Route path="dados-empresa" element={<DadosEmpresa />} />
            <Route path="rotinas-agendadas" element={<RotinasAgendadas />} />
          </Route>
            </Routes>
          </Router>
        </NotificationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
