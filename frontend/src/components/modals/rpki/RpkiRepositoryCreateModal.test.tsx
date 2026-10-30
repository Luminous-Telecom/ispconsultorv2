import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nProvider } from 'contexts/I18nContext';
import RpkiRepositoryCreateModal from './RpkiRepositoryCreateModal';
import { RpkiCaService } from 'services/rpkiCaService';

jest.mock('services/rpkiCaService', () => ({
  RpkiCaService: {
    list: jest.fn(),
    listParents: jest.fn(),
    generatePublisherRequest: jest.fn(),
    importRepositoryResponse: jest.fn(),
  },
}));

jest.mock('components/notifications/NotificationProvider', () => ({
  useNotificationContext: () => ({ success: jest.fn() }),
}));

jest.mock('hooks/useApiError', () => ({
  useApiError: () => ({ showApiError: jest.fn() }),
}));

function renderModal() {
  localStorage.setItem('app-language', 'pt-BR');
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <I18nProvider>
        <RpkiRepositoryCreateModal show onClose={jest.fn()} />
      </I18nProvider>
    </QueryClientProvider>
  );
}

describe('RpkiRepositoryCreateModal', () => {
  beforeEach(() => {
    (RpkiCaService.list as jest.Mock).mockReset();
    (RpkiCaService.listParents as jest.Mock).mockReset();
    (RpkiCaService.generatePublisherRequest as jest.Mock).mockReset();
    (RpkiCaService.importRepositoryResponse as jest.Mock).mockReset();
    (RpkiCaService.list as jest.Mock).mockResolvedValue([{ id: 4, nome: 'FENIX' }]);
    (RpkiCaService.listParents as jest.Mock).mockResolvedValue([
      { id: 9, parent_name: 'LACNIC', parent_handle: 'lacnic' },
    ]);
    (RpkiCaService.generatePublisherRequest as jest.Mock).mockResolvedValue({ xml: '<pub/>' });
    (RpkiCaService.importRepositoryResponse as jest.Mock).mockResolvedValue({ id: 1 });
  });

  it('coloca Novo no cabeçalho e não importa a resposta vazia', () => {
    renderModal();

    const header = document.querySelector('.modal-header-actions');
    const novo = within(header as HTMLElement).getByRole('button', { name: 'Novo' });
    expect(novo.textContent).toBe('Novo');
    expect((novo as HTMLButtonElement).disabled).toBe(true);
    expect(document.querySelector('form.form-modal-simple')?.contains(novo)).toBe(false);
    expect(document.querySelector('form.form-modal-simple.modal-inner-padding')).toBeNull();

    fireEvent.click(novo);
    expect(RpkiCaService.importRepositoryResponse).not.toHaveBeenCalled();
  });

  it('importa a resposta do repositório quando os campos estão preenchidos', async () => {
    renderModal();

    await waitFor(() => {
      expect((screen.getByLabelText(/^CA-pai/) as HTMLSelectElement).value).toBe('9');
    });
    const resposta = screen.getByLabelText(/repository_response/);
    fireEvent.focus(resposta);
    fireEvent.change(resposta, { target: { value: '<repo/>' } });
    fireEvent.click(screen.getByRole('button', { name: 'Novo' }));

    await waitFor(() => {
      expect(RpkiCaService.importRepositoryResponse).toHaveBeenCalledWith({
        caId: 4,
        responseXml: '<repo/>',
      });
    });
  });

  it('não recarrega o publisher_request quando a lista de CAs só muda de referência', async () => {
    localStorage.setItem('app-language', 'pt-BR');
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const view = render(
      <QueryClientProvider client={client}>
        <I18nProvider>
          <RpkiRepositoryCreateModal show onClose={jest.fn()} allowedCaIds={[4]} />
        </I18nProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(RpkiCaService.generatePublisherRequest).toHaveBeenCalledTimes(1);
      expect((screen.getByLabelText(/publisher_request/) as HTMLTextAreaElement).value).toBe('<pub/>');
    });

    const resposta = screen.getByLabelText(/repository_response/) as HTMLTextAreaElement;
    fireEvent.change(resposta, { target: { value: '<repo/>' } });

    view.rerender(
      <QueryClientProvider client={client}>
        <I18nProvider>
          <RpkiRepositoryCreateModal show onClose={jest.fn()} allowedCaIds={[4]} />
        </I18nProvider>
      </QueryClientProvider>
    );

    expect((screen.getByLabelText(/repository_response/) as HTMLTextAreaElement).value).toBe('<repo/>');
    expect((screen.getByLabelText(/publisher_request/) as HTMLTextAreaElement).value).toBe('<pub/>');
    expect(RpkiCaService.generatePublisherRequest).toHaveBeenCalledTimes(1);
  });
});
