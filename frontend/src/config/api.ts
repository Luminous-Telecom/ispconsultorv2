// Configurações da API
// Lê configuração de window.__APP_CONFIG__ (definido em runtime pelo servidor)
// ou usa process.env (para desenvolvimento)

interface AppConfig {
  REACT_APP_API_URL: string;
  REACT_APP_API_TIMEOUT: string;
  REACT_APP_API_RETRY_ATTEMPTS: string;
  REACT_APP_API_RETRY_DELAY: string;
}

declare global {
  interface Window {
    __APP_CONFIG__?: AppConfig;
  }
}

const getConfig = (): AppConfig => {
  // Sempre usar window.__APP_CONFIG__ se disponível (injetado pelo backend)
  if (typeof window !== 'undefined' && window.__APP_CONFIG__) {
    return window.__APP_CONFIG__;
  }
  
  // Fallback apenas para desenvolvimento usando variáveis de ambiente
  return {
    REACT_APP_API_URL: process.env.REACT_APP_API_URL || '',
    REACT_APP_API_TIMEOUT: process.env.REACT_APP_API_TIMEOUT || '10000',
    REACT_APP_API_RETRY_ATTEMPTS: process.env.REACT_APP_API_RETRY_ATTEMPTS || '3',
    REACT_APP_API_RETRY_DELAY: process.env.REACT_APP_API_RETRY_DELAY || '1000',
  };
};

const appConfig = getConfig();

const normalizeBaseUrl = (url: string | undefined): string => {
  if (!url) {
    return '';
  }
  return url.replace(/\/+$/, '');
};

let baseUrl = normalizeBaseUrl(appConfig.REACT_APP_API_URL);
// Se baseUrl estiver vazio, usar /api como padrão (quando servido pelo nginx)
if (!baseUrl) {
  baseUrl = '/api';
}
const baseUrlWithoutApi = baseUrl.endsWith('/api') ? baseUrl.slice(0, -4) : baseUrl;

export const API_CONFIG = {
  BASE_URL: baseUrl,
  BASE_URL_WITHOUT_API: baseUrlWithoutApi,
  TIMEOUT: Number(appConfig.REACT_APP_API_TIMEOUT),
  RETRY_ATTEMPTS: Number(appConfig.REACT_APP_API_RETRY_ATTEMPTS),
  RETRY_DELAY: Number(appConfig.REACT_APP_API_RETRY_DELAY),
};

// Função para gerar URLs dinâmicas
export const getApiUrl = (endpoint: string) => {
  return `${API_CONFIG.BASE_URL_WITHOUT_API}${endpoint}`;
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
  
  
  // Títulos
  TITULOS: '/titulos',
  TITULOS_VENCIDOS: '/titulos/vencidos',
  TITULOS_VENCIDOS_HOJE: '/titulos/vencidos-hoje',
  
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
  PAGE_SIZE_OPTIONS: [5, 10, 15, 25, 50, 100],
};

// Configurações de cache
export const CACHE_CONFIG = {
  DEFAULT_STALE_TIME: 5 * 60 * 1000, // 5 minutos
  DEFAULT_CACHE_TIME: 10 * 60 * 1000, // 10 minutos
  DASHBOARD_REFRESH_INTERVAL: 30 * 1000, // 30 segundos
};
