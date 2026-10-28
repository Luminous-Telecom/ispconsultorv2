import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useContratoForm } from './useContratoForm';
import { ContratoService } from '../services/contratoService';

jest.mock('../components/notifications/NotificationProvider', () => ({
  useNotificationContext: () => ({ success: jest.fn(), error: jest.fn() }),
}));

jest.mock('./useApiError', () => ({
  useApiError: () => ({ showApiError: jest.fn() }),
}));

jest.mock('../services/contratoService', () => ({
  ContratoService: {
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
}));

let queryClient: QueryClient;

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useContratoForm cliente', () => {
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    jest.mocked(ContratoService.create).mockReset();
    jest.mocked(ContratoService.create).mockResolvedValue({ id: 99, cliente_id: 4 } as never);
  });

  it('preenche o cliente quando o contrato abre pelo cadastro do cliente', async () => {
    const { result } = renderHook(
      () => useContratoForm({ contratoId: null, clienteId: 4, show: true }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.formData.cliente_id).toBe(4);
    });
  });

  it('não grava contrato sem cliente selecionado', async () => {
    const { result } = renderHook(
      () => useContratoForm({ contratoId: null, show: true }),
      { wrapper }
    );

    await act(async () => {
      result.current.handleInputChange('plano_id', 7);
      result.current.handleInputChange('modelo_documento_id', 6);
      result.current.handleInputChange('dia_vencimento_id', 3);
      result.current.handleInputChange('conta_boleto', 4);
      result.current.handleInputChange('tipo_cobranca_contrato_id', 8);
      result.current.handleInputChange('endereco', 'Rua A');
      result.current.handleInputChange('numero', '10');
      result.current.handleInputChange('bairro', 'Centro');
      result.current.handleInputChange('cidade', 'Cidade');
      result.current.handleInputChange('estado', 'SP');
    });

    await act(async () => {
      result.current.handleSubmit({ preventDefault() {} } as React.FormEvent);
    });

    await waitFor(() => {
      expect(result.current.invalidFields).toContain('cliente_id');
    });
    expect(result.current.createdContratoId).toBeNull();
    expect(ContratoService.create).not.toHaveBeenCalled();
  });
});
