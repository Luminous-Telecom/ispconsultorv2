import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nProvider } from 'contexts/I18nContext';
import { NotificationProvider } from 'components/notifications/NotificationProvider';
import type { Cliente } from 'types';
import GerarNFeModal from './GerarNFeModal';

jest.mock('components/common/DraggableModal', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('services/nfseConfigService', () => ({
  NFSeConfigService: { get: jest.fn().mockResolvedValue({ success: false, data: null }) },
}));

jest.mock('services/notaFiscalService', () => ({
  NotaFiscalService: { create: jest.fn() },
}));

function renderModal() {
  localStorage.setItem('app-language', 'pt-BR');
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <I18nProvider>
        <NotificationProvider>
          <GerarNFeModal
            show
            onClose={jest.fn()}
            cliente={{ id: 5, razao_social: 'Fenix' } as Cliente}
          />
        </NotificationProvider>
      </I18nProvider>
    </QueryClientProvider>,
  );
}

it('mostra o cliente da nota com edição e sem troca do vínculo', () => {
  renderModal();
  const cliente = screen.getByLabelText('Cliente', { exact: false }) as HTMLInputElement;
  expect(cliente.value).toBe('5');
  expect(cliente.readOnly).toBe(true);
  expect(screen.getByDisplayValue('Fenix')).toBeTruthy();
  expect((screen.getByRole('button', { name: 'Editar registro' }) as HTMLButtonElement).disabled).toBe(false);
  expect((screen.getByRole('button', { name: 'Abrir listagem de registros' }) as HTMLButtonElement).disabled).toBe(true);
});
