import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nProvider } from 'contexts/I18nContext';
import RpkiCaCreateModal from './RpkiCaCreateModal';
import { RpkiCaService } from 'services/rpkiCaService';

jest.mock('services/rpkiCaService', () => ({
  RpkiCaService: {
    create: jest.fn(),
  },
}));

jest.mock('services/clienteService', () => ({
  ClienteService: {
    getById: jest.fn(),
  },
}));

jest.mock('components/notifications/NotificationProvider', () => ({
  useNotificationContext: () => ({ success: jest.fn() }),
}));

jest.mock('hooks/useApiError', () => ({
  useApiError: () => ({ showApiError: jest.fn() }),
}));

jest.mock('components/modals/clientes/ClienteListModal', () => ({
  __esModule: true,
  default: ({
    show,
    onSelectClient,
  }: {
    show: boolean;
    onSelectClient?: (cliente: { id: number; razao_social: string }) => void;
  }) =>
    show ? (
      <button type="button" onClick={() => onSelectClient?.({ id: 13, razao_social: 'PENDINETCOM' })}>
        escolher-cliente
      </button>
    ) : null,
}));

function renderModal() {
  localStorage.setItem('app-language', 'pt-BR');
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const onClose = jest.fn();
  render(
    <QueryClientProvider client={client}>
      <I18nProvider>
        <RpkiCaCreateModal show onClose={onClose} />
      </I18nProvider>
    </QueryClientProvider>
  );
  return { onClose };
}

describe('RpkiCaCreateModal', () => {
  beforeEach(() => {
    (RpkiCaService.create as jest.Mock).mockReset();
    (RpkiCaService.create as jest.Mock).mockResolvedValue({ id: 1, nome: 'FENIX' });
  });

  it('coloca Cancelar e Novo no cabeçalho e os campos em uma coluna', () => {
    renderModal();

    const header = document.querySelector('.modal-header-actions');
    expect(header).toBeTruthy();
    const novo = within(header as HTMLElement).getByRole('button', { name: 'Novo' });
    const cancelar = within(header as HTMLElement).getByRole('button', { name: 'Cancelar' });
    expect(novo.textContent).toBe('Novo');
    expect((novo as HTMLButtonElement).disabled).toBe(true);

    const form = document.querySelector('form.form-modal-simple');
    expect(form?.querySelector('.row.g-2 .col-12')).toBeTruthy();
    expect(form?.contains(novo)).toBe(false);
    expect(form?.contains(cancelar)).toBe(false);
    expect(screen.getByLabelText(/Nome da CA/)).toBeTruthy();

    const limpar = screen.getByRole('button', { name: 'Limpar' });
    expect(limpar.closest('.form-modal-input-col')).toBeTruthy();
    expect((limpar as HTMLButtonElement).disabled).toBe(true);
  });

  it('não grava sem nome e grava o nome informado', async () => {
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Novo' }));
    expect(RpkiCaService.create).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/Nome da CA/), { target: { value: 'FENIX' } });
    const novo = screen.getByRole('button', { name: 'Novo' });
    expect((novo as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(novo);

    await waitFor(() => {
      expect(RpkiCaService.create).toHaveBeenCalledWith({ nome: 'FENIX', clienteId: null });
    });
  });

  it('limpa o cliente escolhido e mantém Novo desabilitado enquanto salva', async () => {
    let resolveCreate: (value: unknown) => void = () => undefined;
    (RpkiCaService.create as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve;
        })
    );
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Cliente' }));
    fireEvent.click(screen.getByRole('button', { name: 'escolher-cliente' }));
    const clienteId = screen.getByTitle('Digite o ID') as HTMLInputElement;
    expect(clienteId.value).toBe('13');

    fireEvent.click(screen.getByRole('button', { name: 'Limpar' }));
    expect((screen.getByTitle('Digite o ID') as HTMLInputElement).value).toBe('');
    expect((screen.getByRole('button', { name: 'Limpar' }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByLabelText(/Nome da CA/), { target: { value: 'FENIX' } });
    fireEvent.click(screen.getByRole('button', { name: 'Novo' }));
    await waitFor(() => {
      const novo = screen.getByRole('button', { name: 'Novo' });
      expect(novo.textContent).toBe('Novo');
      expect((novo as HTMLButtonElement).disabled).toBe(true);
    });
    resolveCreate({ id: 1, nome: 'FENIX' });
  });
});
