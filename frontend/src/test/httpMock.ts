type HttpDouble = {
  get: jest.Mock;
  post: jest.Mock;
  put: jest.Mock;
  patch: jest.Mock;
  delete: jest.Mock;
  interceptors: {
    request: { use: jest.Mock };
    response: { use: jest.Mock };
  };
};

let http: HttpDouble | null = null;

export function createAxiosMockModule() {
  http = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  };

  class AxiosError extends Error {
    isAxiosError = true;
    response?: { status?: number; data?: unknown };
    constructor(message?: string) {
      super(message);
      this.name = 'AxiosError';
    }
  }

  const axios = {
    create: () => http,
    AxiosError,
    isAxiosError: (error: unknown) => error instanceof AxiosError,
  };

  return { __esModule: true, default: axios, AxiosError };
}

export function getHttp(): HttpDouble {
  if (!http) {
    throw new Error('mock de axios não instalado');
  }
  return http;
}

export function resetHttp(): void {
  const client = getHttp();
  client.get.mockReset();
  client.post.mockReset();
  client.put.mockReset();
  client.patch.mockReset();
  client.delete.mockReset();
}

export function ok<T>(data: T, message = '') {
  return { success: true, data, message };
}

export const EMPTY_PAGE = {
  current_page: 1,
  per_page: 15,
  total: 0,
  last_page: 0,
  from: 0,
  to: 0,
};

export function okPage<T>(rows: T[] = []) {
  return {
    success: true,
    data: rows,
    pagination: { ...EMPTY_PAGE, total: rows.length },
    message: '',
  };
}

export function rowsOf(result: unknown): unknown[] | null {
  if (Array.isArray(result)) return result;
  if (!result || typeof result !== 'object') return null;
  const data = (result as { data?: unknown }).data;
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && Array.isArray((data as { data?: unknown }).data)) {
    return (data as { data: unknown[] }).data;
  }
  return null;
}

export function entityId(result: unknown): unknown {
  if (!result || typeof result !== 'object') return undefined;
  const record = result as { id?: unknown; data?: { id?: unknown } };
  if (record.id != null) return record.id;
  return record.data?.id;
}
