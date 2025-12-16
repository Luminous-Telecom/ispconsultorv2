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

const getDynamicConfig = (): AppConfig => {
  // SEMPRE priorizar window.__APP_CONFIG__ (configuração dinâmica do backend)
  // process.env só é usado como fallback em desenvolvimento local
  if (typeof window !== 'undefined' && window.__APP_CONFIG__) {
    return window.__APP_CONFIG__;
  }
  // Fallback apenas para desenvolvimento local (quando não há window.__APP_CONFIG__)
  return {
    REACT_APP_API_URL: process.env.REACT_APP_API_URL || '/api',
    REACT_APP_API_TIMEOUT: process.env.REACT_APP_API_TIMEOUT || '10000',
    REACT_APP_API_RETRY_ATTEMPTS: process.env.REACT_APP_API_RETRY_ATTEMPTS || '3',
    REACT_APP_API_RETRY_DELAY: process.env.REACT_APP_API_RETRY_DELAY || '1000',
  };
};

export const API_CONFIG = {
  get BASE_URL() {
    if (typeof window === 'undefined') {
      return '/api';
    }
    const config = getDynamicConfig();
    const apiUrl = config.REACT_APP_API_URL || '/api';
    
    // Se for URL absoluta, usar como está (desenvolvimento com backend em porta diferente)
    if (apiUrl && (apiUrl.startsWith('http://') || apiUrl.startsWith('https://'))) {
      return apiUrl;
    }
    
    // Em produção ou quando for relativa, usar window.location.origin
    const origin = window.location.origin;
    const path = ensureRelativeUrl(apiUrl) || '/api';
    return `${origin}${path}`;
  },
  get BASE_URL_WITHOUT_API() {
    if (typeof window === 'undefined') {
      return '/';
    }
    const config = getDynamicConfig();
    const apiUrl = config.REACT_APP_API_URL || '/api';
    
    // Se for URL absoluta, remover /api do final
    if (apiUrl && (apiUrl.startsWith('http://') || apiUrl.startsWith('https://'))) {
      return apiUrl.endsWith('/api') ? apiUrl.slice(0, -4) : apiUrl;
    }
    
    // Caso contrário, usar window.location.origin
    return window.location.origin;
  },
  get TIMEOUT() {
    return Number(getDynamicConfig().REACT_APP_API_TIMEOUT || '10000');
  },
  get RETRY_ATTEMPTS() {
    return Number(getDynamicConfig().REACT_APP_API_RETRY_ATTEMPTS || '3');
  },
  get RETRY_DELAY() {
    return Number(getDynamicConfig().REACT_APP_API_RETRY_DELAY || '1000');
  },
};

export const getApiUrl = (endpoint: string) => {
  if (typeof window === 'undefined') {
    return endpoint;
  }
  return `${window.location.origin}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
};
export const getCepUrl = (cep: string) => {
  if (typeof window === 'undefined') {
    return `/api/buscar-cep/${cep}`;
  }
  return `${window.location.origin}/api/buscar-cep/${cep}`;
};

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
