import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useBancoForm } from './useBancoForm';

jest.mock('../components/notifications/NotificationProvider', () => ({
  useNotificationContext: () => ({ success: jest.fn(), error: jest.fn() }),
}));

jest.mock('./useApiError', () => ({
  useApiError: () => ({ showApiError: jest.fn() }),
}));

jest.mock('../services/bancoService', () => ({
  BancoService: {
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useBancoForm', () => {
  it('guarda o servidor de cobrança como número e permite limpar', async () => {
    const { result } = renderHook(() => useBancoForm({ bancoId: null, show: true }), { wrapper });

    await act(async () => {
      result.current.handleInputChange('servidor_email_cobranca_id', 1);
      result.current.handleInputChange('servidor_whatsapp_cobranca_id', '4');
    });

    expect(result.current.formData.servidor_email_cobranca_id).toBe(1);
    expect(result.current.formData.servidor_whatsapp_cobranca_id).toBe(4);

    await act(async () => {
      result.current.handleInputChange('servidor_email_cobranca_id', null);
    });

    expect(result.current.formData.servidor_email_cobranca_id).toBeNull();
  });
});
