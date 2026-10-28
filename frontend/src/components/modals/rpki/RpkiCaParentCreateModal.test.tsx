import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nProvider } from 'contexts/I18nContext';
import RpkiCaParentCreateModal from './RpkiCaParentCreateModal';
import { RpkiCaService } from 'services/rpkiCaService';

jest.mock('services/rpkiCaService', () => ({
  RpkiCaService: {
    list: jest.fn(),
    generateChildRequest: jest.fn(),
    importParentResponse: jest.fn(),
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
        <RpkiCaParentCreateModal show onClose={jest.fn()} />
      </I18nProvider>
    </QueryClientProvider>
  );
}

describe('RpkiCaParentCreateModal', () => {
  beforeEach(() => {
    (RpkiCaService.list as jest.Mock).mockReset();
    (RpkiCaService.generateChildRequest as jest.Mock).mockReset();
    (RpkiCaService.importParentResponse as jest.Mock).mockReset();
    (RpkiCaService.list as jest.Mock).mockResolvedValue([{ id: 4, nome: 'FENIX' }]);
    (RpkiCaService.generateChildRequest as jest.Mock).mockResolvedValue({ xml: '<child/>', caId: 4, handle: 'h' });
    (RpkiCaService.importParentResponse as jest.Mock).mockResolvedValue({ id: 1 });
  });

  it('coloca Novo no cabeçalho e não vincula a CA-pai sem os campos', () => {
    renderModal();

    const header = document.querySelector('.modal-header-actions');
    const novo = within(header as HTMLElement).getByRole('button', { name: 'Novo' });
    expect(novo.textContent).toBe('Novo');
    expect(document.querySelector('form.form-modal-simple')?.contains(novo)).toBe(false);
    expect(document.querySelector('form.form-modal-simple.modal-inner-padding')).toBeNull();

    fireEvent.click(novo);
    expect(RpkiCaService.importParentResponse).not.toHaveBeenCalled();
  });

  it('vincula a CA-pai com nome e XML preenchidos', async () => {
    renderModal();

    await waitFor(() => {
      expect((screen.getByLabelText(/^CA/) as HTMLSelectElement).value).toBe('4');
    });
    fireEvent.change(screen.getByLabelText(/Nome da CA-pai/), { target: { value: 'LACNIC' } });
    const resposta = screen.getByLabelText(/Resposta da CA-pai/);
    fireEvent.focus(resposta);
    fireEvent.change(resposta, { target: { value: '<parent/>' } });
    fireEvent.click(screen.getByRole('button', { name: 'Novo' }));

    await waitFor(() => {
      expect(RpkiCaService.importParentResponse).toHaveBeenCalledWith({
        caId: 4,
        parentName: 'LACNIC',
        responseXml: '<parent/>',
      });
    });
  });
});
