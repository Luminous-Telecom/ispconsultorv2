// Configurações da API
export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
};

// Endpoints da API
export const API_ENDPOINTS = {
  // Clientes
  CLIENTES: '/clientes',
  CLIENTES_ATIVOS: '/clientes/ativos',
  CLIENTES_CNPJ: (cnpj: string) => `/clientes/cnpj/${cnpj}`,
  
  // Planos
  PLANOS: '/planos',
  PLANOS_ATIVOS: '/planos/ativos',
  PLANOS_CLIENTE: (clienteId: number) => `/planos/cliente/${clienteId}`,
  
  // Bancos
  BANCOS: '/bancos',
  BANCOS_ATIVOS: '/bancos/ativos',
  BANCO_TESTAR_CONEXAO: (bancoId: number) => `/bancos/${bancoId}/testar-conexao`,
  
  // Carnês
  CARNES: '/carnes',
  CARNES_ATIVOS: '/carnes/ativos',
  CARNE_GERAR_TITULOS: (carneId: number) => `/carnes/${carneId}/gerar-titulos`,
  CARNE_CONSULTAR_STATUS: (carneId: number) => `/carnes/${carneId}/consultar-status`,
  
  // Parcelas
  CARNE_PARCELAS: '/carne-parcelas',
  PARCELAS_VENCIDAS: '/carne-parcelas/vencidas',
  PARCELAS_VENCIDAS_HOJE: '/carne-parcelas/vencidas-hoje',
  
  // Dashboard
  DASHBOARD: '/dashboard',
  DASHBOARD_STATS: '/dashboard/stats',
  
  // CEP
  BUSCAR_CEP: (cep: string) => `/api/buscar-cep/${cep}`,
  
  // Health
  HEALTH: '/health',
};

// Configurações de paginação padrão
export const PAGINATION_CONFIG = {
  DEFAULT_PAGE_SIZE: 15,
  MAX_PAGE_SIZE: 100,
  PAGE_SIZE_OPTIONS: [10, 15, 25, 50, 100],
};

// Configurações de cache
export const CACHE_CONFIG = {
  DEFAULT_STALE_TIME: 5 * 60 * 1000, // 5 minutos
  DEFAULT_CACHE_TIME: 10 * 60 * 1000, // 10 minutos
  DASHBOARD_REFRESH_INTERVAL: 30 * 1000, // 30 segundos
};
