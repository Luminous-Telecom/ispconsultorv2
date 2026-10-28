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

const contratoCriado = {
  id: 99,
  cliente_id: 1,
  plano_id: 7,
  desconto_percentual: 10,
  desconto_valor: 5,
  data_inicio: '2026-01-15',
  data_fim: null,
  status: 'ativo',
  observacoes: 'obs antiga',
  isento_mensalidade: false,
  dia_vencimento_id: 3,
  conta_boleto: 4,
  tipo_cobranca_contrato_id: 8,
  data_validade_desconto: null,
  modelo_documento_id: 6,
  endereco: 'Rua A',
  numero: '10',
  complemento: '',
  bairro: 'Centro',
  cidade: 'Cidade',
  estado: 'SP',
  usar_endereco_cliente: false,
};

let queryClient: QueryClient;

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useContratoForm', () => {
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    jest.mocked(ContratoService.create).mockReset();
    jest.mocked(ContratoService.getById).mockReset();
    jest.mocked(ContratoService.create).mockResolvedValue(contratoCriado as never);
    jest.mocked(ContratoService.getById).mockResolvedValue(contratoCriado as never);
  });

  it('zera o contrato criado ao fechar o modal para o próximo cadastro começar vazio', async () => {
    const { result, rerender } = renderHook(
      ({ show, contratoId }: { show: boolean; contratoId: number | null }) =>
        useContratoForm({ contratoId, clienteId: 1, show }),
      { wrapper, initialProps: { show: true, contratoId: null as number | null } }
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
      expect(result.current.createdContratoId).toBe(99);
    });

    rerender({ show: true, contratoId: 99 });

    await waitFor(() => {
      expect(result.current.formData.plano_id).toBe(7);
      expect(result.current.formData.observacoes).toBe('obs antiga');
    });

    rerender({ show: false, contratoId: null });

    await waitFor(() => {
      expect(result.current.createdContratoId).toBeNull();
    });

    rerender({ show: true, contratoId: null });

    await waitFor(() => {
      expect(result.current.createdContratoId).toBeNull();
      expect(result.current.isEditing).toBe(false);
      expect(result.current.formData.plano_id).toBe(0);
      expect(result.current.formData.conta_boleto).toBe(0);
      expect(result.current.formData.modelo_documento_id).toBe(0);
      expect(result.current.formData.tipo_cobranca_contrato_id).toBeNull();
      expect(result.current.formData.observacoes).toBe('');
      expect(result.current.formData.endereco).toBe('');
    });
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

  it('não grava contrato sem endereço e aponta os campos da aba', async () => {
    const { result } = renderHook(
      () => useContratoForm({ contratoId: null, clienteId: 1, show: true }),
      { wrapper }
    );

    await act(async () => {
      result.current.handleInputChange('plano_id', 7);
      result.current.handleInputChange('modelo_documento_id', 6);
      result.current.handleInputChange('dia_vencimento_id', 3);
      result.current.handleInputChange('conta_boleto', 4);
      result.current.handleInputChange('tipo_cobranca_contrato_id', 8);
    });

    await act(async () => {
      result.current.handleSubmit({ preventDefault() {} } as React.FormEvent);
    });

    await waitFor(() => {
      expect(result.current.invalidFields).toEqual(
        expect.arrayContaining(['endereco', 'numero', 'bairro', 'cidade', 'estado'])
      );
    });
    expect(result.current.createdContratoId).toBeNull();
    expect(ContratoService.create).not.toHaveBeenCalled();
  });
});
