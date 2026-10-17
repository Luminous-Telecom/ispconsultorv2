import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { io } from 'socket.io-client';
import { I18nProvider } from 'contexts/I18nContext';
import { removeAuthToken, setAuthToken } from 'services/core';
import SystemUpdateOverlay from './SystemUpdateOverlay';
import { markSystemUpdateDriver } from 'utils/systemUpdateDriver';

jest.mock('socket.io-client', () => ({
  io: jest.fn(),
}));

const ioMock = io as jest.Mock;

function renderOverlay() {
  localStorage.setItem('app-language', 'pt-BR');
  return render(
    <I18nProvider>
      <SystemUpdateOverlay />
    </I18nProvider>
  );
}

describe('SystemUpdateOverlay', () => {
  let emitStatus: (status: object) => void;

  beforeEach(() => {
    sessionStorage.clear();
    removeAuthToken();
    emitStatus = () => undefined;
    ioMock.mockReset();
    ioMock.mockImplementation(() => {
      const handlers = new Map<string, (payload: unknown) => void>();
      emitStatus = (status) => handlers.get('system-update:status')?.(status);
      return {
        on: (event: string, cb: (payload: unknown) => void) => {
          handlers.set(event, cb);
        },
        off: jest.fn(),
        disconnect: jest.fn(),
      };
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('não consulta a API enquanto não há sessão', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as typeof fetch;

    const view = renderOverlay();

    await waitFor(() => expect(ioMock).not.toHaveBeenCalled());
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByRole('progressbar')).toBeNull();
    view.unmount();
  });

  it('mostra o progresso circular quando o socket avisa atualização em andamento', async () => {
    setAuthToken('jwt-de-teste');
    const fetchMock = jest.fn();
    global.fetch = fetchMock as typeof fetch;

    const view = renderOverlay();

    await waitFor(() => expect(ioMock).toHaveBeenCalledTimes(1));
    act(() => {
      emitStatus({ active: true, progress: 42, kind: 'system', phase: 'running' });
    });

    expect((await screen.findByText('Atualização em andamento, aguarde')).textContent).toBe(
      'Atualização em andamento, aguarde'
    );
    expect(
      screen.getByRole('progressbar', { name: 'Atualização em andamento, aguarde' }).getAttribute('aria-valuenow')
    ).toBe('42');
    expect(screen.getByText('42%').textContent).toBe('42%');
    expect(fetchMock).not.toHaveBeenCalled();
    view.unmount();
  });

  it('permanece oculto quando o socket informa que não há atualização', async () => {
    setAuthToken('jwt-de-teste');
    const view = renderOverlay();

    await waitFor(() => expect(ioMock).toHaveBeenCalledTimes(1));
    act(() => {
      emitStatus({ active: false, progress: 0, kind: null, phase: 'idle' });
    });

    expect(screen.queryByText('Atualização em andamento, aguarde')).toBeNull();
    view.unmount();
  });

  it('não cobre a tela que iniciou a atualização', async () => {
    setAuthToken('jwt-de-teste');
    markSystemUpdateDriver();
    const view = renderOverlay();

    await waitFor(() => expect(ioMock).toHaveBeenCalledTimes(1));
    act(() => {
      emitStatus({ active: true, progress: 15, kind: 'system', phase: 'running' });
    });

    expect(screen.queryByRole('progressbar')).toBeNull();
    view.unmount();
  });
});
