import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nProvider } from 'contexts/I18nContext';
import { NotificationProvider } from 'components/notifications/NotificationProvider';
import IpsPermitidoModal from './IpsPermitidoModal';

jest.mock('components/common/DraggableModal', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('components/modals/clientes/ClienteListModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('hooks/useIpsPermitidos', () => ({
  useCreateIpPermitido: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useUpdateIpPermitido: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock('services/ipsPermitidosService', () => ({
  IpsPermitidosService: {
    getById: () => Promise.resolve({
      id: 1,
      cliente_id: 8,
      cliente_nome: 'Fenix',
      faixa_ips: '10.0.0.1',
    }),
  },
}));

jest.mock('services/clienteService', () => ({
  ClienteService: { list: jest.fn().mockResolvedValue({ data: [] }) },
}));

function renderModal() {
  localStorage.setItem('app-language', 'pt-BR');
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <I18nProvider>
        <NotificationProvider>
          <IpsPermitidoModal show onClose={jest.fn()} ipPermitidoId={1} />
        </NotificationProvider>
      </I18nProvider>
    </QueryClientProvider>,
  );
}

it('mostra o cliente na edição com o vínculo travado e o cadastro abrível', async () => {
  renderModal();
  const cliente = await screen.findByDisplayValue('8');
  expect((cliente as HTMLInputElement).readOnly).toBe(true);
  expect(await screen.findByDisplayValue('Fenix')).toBeTruthy();
  await waitFor(() => {
    expect((screen.getByRole('button', { name: 'Editar registro' }) as HTMLButtonElement).disabled).toBe(false);
  });
  expect((screen.getByRole('button', { name: 'Abrir listagem de registros' }) as HTMLButtonElement).disabled).toBe(true);
});
