import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nProvider } from 'contexts/I18nContext';
import RpkiAspaCreateModal from './RpkiAspaCreateModal';
import { RpkiCaService } from 'services/rpkiCaService';

jest.mock('components/notifications/NotificationProvider', () => ({
  useNotificationContext: () => ({ success: jest.fn(), error: jest.fn() }),
}));

jest.mock('services/rpkiCaService', () => ({
  RpkiCaService: {
    list: jest.fn(),
  },
}));

function renderModal(onSave = jest.fn()) {
  localStorage.setItem('app-language', 'pt-BR');
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onClose = jest.fn();
  render(
    <QueryClientProvider client={client}>
      <I18nProvider>
        <RpkiAspaCreateModal show onClose={onClose} onSave={onSave} />
      </I18nProvider>
    </QueryClientProvider>
  );
  return { onClose, onSave };
}

describe('RpkiAspaCreateModal', () => {
  beforeEach(() => {
    (RpkiCaService.list as jest.Mock).mockReset();
    (RpkiCaService.list as jest.Mock).mockResolvedValue([{ id: 7, nome: 'FENIX' }]);
  });

  it('coloca Novo no cabeçalho e não confirma o cadastro incompleto', () => {
    const { onSave } = renderModal();

    const header = document.querySelector('.modal-header-actions');
    const novo = within(header as HTMLElement).getByRole('button', { name: 'Novo' });
    expect(novo.textContent).toBe('Novo');
    expect((novo as HTMLButtonElement).disabled).toBe(true);
    expect(document.querySelector('form.form-modal-simple .row.g-2 .col-12')).toBeTruthy();
    expect(document.querySelector('form.form-modal-simple')?.contains(novo)).toBe(false);

    fireEvent.click(novo);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('envia CA, customer ASN e providers ao confirmar', async () => {
    const { onSave } = renderModal();

    const ca = await screen.findByLabelText(/^CA/);
    await waitFor(() => {
      expect(within(ca as HTMLSelectElement).getByRole('option', { name: 'FENIX' })).toBeTruthy();
    });
    fireEvent.change(ca, { target: { value: '7' } });
    fireEvent.change(screen.getByLabelText(/Customer ASN/), { target: { value: '64500' } });
    fireEvent.change(screen.getByLabelText(/Providers ASN/), { target: { value: '64501,64502' } });
    fireEvent.click(screen.getByRole('button', { name: 'Novo' }));

    expect(onSave).toHaveBeenCalledWith({
      caId: 7,
      customerAsn: '64500',
      providers: '64501,64502',
    });
  });
});
