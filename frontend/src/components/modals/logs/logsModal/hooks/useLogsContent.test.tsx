import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { auditoriaService } from 'services/auditoriaService';
import { useLogsContent } from './useLogsContent';

jest.mock('services/auditoriaService', () => ({
  auditoriaService: {
    listOperacional: jest.fn(),
  },
}));

function renderLogs(usuarioId?: number) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useLogsContent('usuarios', true, usuarioId), { wrapper });
}

describe('useLogsContent', () => {
  beforeEach(() => {
    (auditoriaService.listOperacional as jest.Mock).mockReset();
    (auditoriaService.listOperacional as jest.Mock).mockResolvedValue({
      success: true,
      data: { data: [], pagination: { current_page: 1, last_page: 1, per_page: 20, total: 0 } },
    });
  });

  it('lista os logs operacionais sem filtrar usuário', async () => {
    renderLogs();

    await waitFor(() => {
      expect(auditoriaService.listOperacional).toHaveBeenCalled();
    });

    const filters = (auditoriaService.listOperacional as jest.Mock).mock.calls[0][0];
    expect(filters.comUsuarioObrigatorio).toBe(true);
    expect(filters.usuario_id).toBeUndefined();
  });

  it('restringe a consulta ao usuário informado', async () => {
    renderLogs(7);

    await waitFor(() => {
      expect(auditoriaService.listOperacional).toHaveBeenCalled();
    });

    const filters = (auditoriaService.listOperacional as jest.Mock).mock.calls[0][0];
    expect(filters.usuario_id).toBe(7);
    expect(filters.comUsuarioObrigatorio).toBe(true);
  });
});
