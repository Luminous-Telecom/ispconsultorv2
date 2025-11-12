import type { Banco } from '../../models/Banco';
import type { Titulo } from '../../models/Titulo';
import type { Cliente } from '../../models/Cliente';
import type { Plano } from '../../models/Plano';
import type { JsonValue } from '../../types';

export interface ApiResponseData {
  charge_id?: string;
  [key: string]: JsonValue | undefined;
}

export interface ApiResponse {
  success: boolean;
  message?: string;
  data?: ApiResponseData;
  status?: string;
}

export interface TituloWithRelations extends Titulo {
  banco?: Banco;
  cliente?: Cliente;
  plano?: Plano;
}

export interface AxiosErrorResponse {
  code?: string;
  response?: {
    status?: number;
    statusText?: string;
    data?: JsonValue;
  };
}

export interface IBancoService {
  gerarTitulo(titulo: TituloWithRelations, banco: Banco, token: string): Promise<ApiResponse>;
  cancelarTitulo(titulo: Titulo, banco: Banco, token: string): Promise<ApiResponse>;
  liquidarTitulo(titulo: Titulo, banco: Banco, token: string): Promise<ApiResponse>;
  consultarStatus(titulo: Titulo, banco: Banco, token: string): Promise<ApiResponse>;
  obterToken(banco: Banco): Promise<string | null>;
  configurarWebhook?(banco: Banco, token: string): Promise<ApiResponse>;
}

