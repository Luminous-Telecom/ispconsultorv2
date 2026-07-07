import axios from 'axios';
import type { PlanoModuloId } from 'constants/planoModulos';
import { API_CONFIG } from '../config/api';

const publicApiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface HotsitePlanoLimite {
  chave: string;
  label: string;
  valor: string;
}

export interface HotsitePlanoModulo {
  id: PlanoModuloId;
  label: string;
}

export interface HotsitePlanoPublico {
  id: number;
  nome: string;
  descricao: string | null;
  valor_mensal: number;
  valor_mensal_original: number | null;
  valor_anual: number | null;
  valor_anual_original: number | null;
  desconto_percentual: number;
  modulos: HotsitePlanoModulo[];
  limites: HotsitePlanoLimite[];
}

export const publicHotsitePlanosService = {
  async list(): Promise<HotsitePlanoPublico[]> {
    const response = await publicApiClient.get<{ success: boolean; data: HotsitePlanoPublico[] }>(
      '/public/saas-planos'
    );
    return response.data.data ?? [];
  },
};
