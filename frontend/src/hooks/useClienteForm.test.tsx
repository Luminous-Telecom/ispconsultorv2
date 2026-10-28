import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useClienteForm } from './useClienteForm';
import { ClienteService } from '../services/clienteService';
import { ParametrosService } from '../services/parametrosService';

jest.mock('../components/notifications/NotificationProvider', () => ({
  useNotificationContext: () => ({ success: jest.fn(), info: jest.fn(), error: jest.fn() }),
}));

jest.mock('./useApiError', () => ({
  useApiError: () => ({ showApiError: jest.fn() }),
}));

jest.mock('../services/parametrosService', () => ({
  ParametrosService: { get: jest.fn() },
}));

jest.mock('../services/clienteService', () => ({
  ClienteService: {
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    consultarCnpj: jest.fn(),
    buscarCep: jest.fn(),
  },
}));

const clienteCriado = {
  id: 15,
  cnpj: '11.444.777/0001-61',
  razao_social: 'Empresa Teste',
  nome_fantasia: '',
  email: 'financeiro@empresa.test',
  telefone: '',
  whatsapp: '',
  cep: '01310100',
  endereco: 'Avenida Paulista',
  numero: '1000',
  complemento: '',
  bairro: 'Centro',
  cidade: 'Sao Paulo',
  estado: 'SP',
  ativo: true,
  tipo_cobranca: 'titulo',
  valor_primeiro_titulo: 'total',
  recebe_email: true,
  recebe_whatsapp: true,
  observacoes: '',
};

let queryClient: QueryClient;

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useClienteForm', () => {
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    jest.mocked(ClienteService.create).mockReset();
    jest.mocked(ClienteService.update).mockReset();
    jest.mocked(ClienteService.getById).mockReset();
    jest.mocked(ClienteService.create).mockResolvedValue(clienteCriado as never);
    jest.mocked(ClienteService.update).mockResolvedValue(clienteCriado as never);
    jest.mocked(ClienteService.getById).mockResolvedValue(clienteCriado as never);
    jest.mocked(ParametrosService.get).mockResolvedValue({ data: {} } as never);
  });

  async function preencher(result: { current: ReturnType<typeof useClienteForm> }) {
    await act(async () => {
      result.current.handleInputChange('cnpj', '11.444.777/0001-61');
      result.current.handleInputChange('razao_social', 'Empresa Teste');
      result.current.handleInputChange('email', 'financeiro@empresa.test');
      result.current.handleInputChange('cep', '01310100');
      result.current.handleInputChange('endereco', 'Avenida Paulista');
      result.current.handleInputChange('numero', '1000');
      result.current.handleInputChange('bairro', 'Centro');
      result.current.handleInputChange('cidade', 'Sao Paulo');
      result.current.handleInputChange('estado', 'SP');
    });
  }

  it('atualiza o cliente recém-criado no segundo salvar', async () => {
    const { result } = renderHook(
      () => useClienteForm({ clienteId: null, show: true }),
      { wrapper }
    );

    await preencher(result);

    await act(async () => {
      result.current.handleSubmit({ preventDefault() {} } as React.FormEvent);
    });

    await waitFor(() => {
      expect(result.current.createdClienteId).toBe(15);
      expect(result.current.isEditing).toBe(true);
    });

    await act(async () => {
      result.current.handleSubmit({ preventDefault() {} } as React.FormEvent);
    });

    await waitFor(() => {
      expect(ClienteService.update).toHaveBeenCalledWith(15, expect.objectContaining({
        cnpj: '11.444.777/0001-61',
        razao_social: 'Empresa Teste',
      }));
    });
    expect(ClienteService.create).toHaveBeenCalledTimes(1);
  });
});
