import axios, { AxiosInstance, isAxiosError } from 'axios';
import { getIxcApiCredentials } from '../ixcApiContext';
import type { IxcActionResponse, ListOssChamadosResponse } from './types';

function ixcBaseUrl(): string {
  return getIxcApiCredentials().apiUrl;
}

function ixcAuthHeader(): string {
  const token = getIxcApiCredentials().apiToken;
  return `Basic ${Buffer.from(token).toString('base64')}`;
}

export function resolveOperadorId(): string {
  return getIxcApiCredentials().apiToken.split(':')[0]?.trim() ?? '';
}

export function createIxcClient(): AxiosInstance {
  return axios.create({
    baseURL: ixcBaseUrl(),
    timeout: 30_000,
    headers: {
      'Content-Type': 'application/json',
      Authorization: ixcAuthHeader(),
    },
  });
}

export async function ixcListar<T>(resource: string, body: Record<string, string>): Promise<T> {
  const response = await createIxcClient().request<T>({
    method: 'GET',
    url: `/${resource}`,
    headers: { ixcsoft: 'listar' },
    data: body,
  });
  return response.data as T;
}

export function paginaVazia(page: number, limit: number): ListOssChamadosResponse {
  return {
    data: [],
    pagination: {
      current_page: page,
      per_page: limit,
      total: 0,
      last_page: 1,
      from: 0,
      to: 0,
    },
  };
}

export function sanitizeInput(payload: Record<string, string | number | null | undefined>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) continue;
    result[key] = String(value);
  }
  return result;
}

export function actionErrorMessage(data: IxcActionResponse, fallback: string): string {
  const raw = data.message || data.mensagem || fallback;
  return raw.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim();
}

export function nowIxcDateTime(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function wrapIxcError(error: unknown, fallback: string): Error {
  if (isAxiosError(error)) {
    if (error.response?.status === 401 || error.response?.status === 403) {
      return new Error('Falha de autenticação no IXC. Verifique o token da integração.');
    }
    const data = error.response?.data as IxcActionResponse | undefined;
    if (data) {
      return new Error(actionErrorMessage(data, fallback));
    }
    if (error.code === 'ECONNABORTED') {
      return new Error('Tempo de resposta do IXC excedido.');
    }
  }
  return error instanceof Error ? error : new Error(fallback);
}
