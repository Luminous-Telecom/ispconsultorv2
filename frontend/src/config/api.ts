import { ensureRelativeUrl } from '../utils/urlUtils';

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
  if (typeof window !== 'undefined' && window.__APP_CONFIG__) {
    return window.__APP_CONFIG__;
  }
  return {
    REACT_APP_API_URL: process.env.REACT_APP_API_URL || '',
    REACT_APP_API_TIMEOUT: process.env.REACT_APP_API_TIMEOUT || '10000',
    REACT_APP_API_RETRY_ATTEMPTS: process.env.REACT_APP_API_RETRY_ATTEMPTS || '3',
    REACT_APP_API_RETRY_DELAY: process.env.REACT_APP_API_RETRY_DELAY || '1000',
  };
};

const appConfig = getConfig();

const baseUrl = ensureRelativeUrl(appConfig.REACT_APP_API_URL);
const baseUrlWithoutApi = baseUrl.endsWith('/api') ? baseUrl.slice(0, -4) : baseUrl;

export const API_CONFIG = {
  BASE_URL: baseUrl,
  BASE_URL_WITHOUT_API: baseUrlWithoutApi,
  TIMEOUT: Number(appConfig.REACT_APP_API_TIMEOUT),
  RETRY_ATTEMPTS: Number(appConfig.REACT_APP_API_RETRY_ATTEMPTS),
  RETRY_DELAY: Number(appConfig.REACT_APP_API_RETRY_DELAY),
};

export const getApiUrl = (endpoint: string) => `${API_CONFIG.BASE_URL_WITHOUT_API}${endpoint}`;
export const getCepUrl = (cep: string) => `${API_CONFIG.BASE_URL}/buscar-cep/${cep}`;

export const API_ENDPOINTS = {
  CLIENTES: '/clientes',
  CLIENTES_ATIVOS: '/clientes/ativos',
  CLIENTES_CNPJ: (cnpj: string) => `/clientes/cnpj/${cnpj}`,
  PLANOS: '/planos',
  PLANOS_ATIVOS: '/planos/ativos',
  PLANOS_CLIENTE: (clienteId: number) => `/planos/cliente/${clienteId}`,
  BANCOS: '/bancos',
  BANCOS_ATIVOS: '/bancos/ativos',
  BANCO_TESTAR_CONEXAO: (bancoId: number) => `/bancos/${bancoId}/testar-conexao`,
  TITULOS: '/titulos',
  TITULOS_VENCIDOS: '/titulos/vencidos',
  TITULOS_VENCIDOS_HOJE: '/titulos/vencidos-hoje',
  DASHBOARD: '/dashboard',
  DASHBOARD_STATS: '/dashboard/stats',
  BUSCAR_CEP: getCepUrl,
  HEALTH: '/health',
};

export const PAGINATION_CONFIG = {
  DEFAULT_PAGE_SIZE: 15,
  MAX_PAGE_SIZE: 100,
  PAGE_SIZE_OPTIONS: [5, 10, 15, 25, 50, 100],
};

export const CACHE_CONFIG = {
  DEFAULT_STALE_TIME: 5 * 60 * 1000,
  DEFAULT_CACHE_TIME: 10 * 60 * 1000,
  DASHBOARD_REFRESH_INTERVAL: 30 * 1000,
};
