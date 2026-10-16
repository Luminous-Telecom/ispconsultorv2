import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from 'contexts/I18nContext';
import SystemUpdateOverlay from './SystemUpdateOverlay';
import { markSystemUpdateDriver } from 'utils/systemUpdateDriver';

function renderOverlay() {
  localStorage.setItem('app-language', 'pt-BR');
  return render(
    <I18nProvider>
      <SystemUpdateOverlay />
    </I18nProvider>
  );
}

describe('SystemUpdateOverlay', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    sessionStorage.clear();
    fetchMock.mockReset();
    global.fetch = fetchMock as typeof fetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('mostra o progresso circular enquanto a atualização está em andamento', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { active: true, progress: 42, kind: 'system', phase: 'running' },
      }),
    });

    const view = renderOverlay();

    expect((await screen.findByText('Atualização em andamento, aguarde')).textContent).toBe(
      'Atualização em andamento, aguarde'
    );
    expect(
      screen.getByRole('progressbar', { name: 'Atualização em andamento, aguarde' }).getAttribute('aria-valuenow')
    ).toBe('42');
    expect(screen.getByText('42%').textContent).toBe('42%');
    view.unmount();
  });

  it('permanece oculto quando não há atualização', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { active: false, progress: 0, kind: null, phase: 'idle' },
      }),
    });

    const view = renderOverlay();

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.queryByText('Atualização em andamento, aguarde')).toBeNull();
    view.unmount();
  });

  it('não cobre a tela que iniciou a atualização', async () => {
    markSystemUpdateDriver();
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { active: true, progress: 15, kind: 'system', phase: 'running' },
      }),
    });

    const view = renderOverlay();

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.queryByRole('progressbar')).toBeNull();
    view.unmount();
  });
});
