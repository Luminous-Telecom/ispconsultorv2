import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nProvider } from 'contexts/I18nContext';
import { NotificationProvider } from 'components/notifications/NotificationProvider';
import IpsPermitidoModal from './IpsPermitidoModal';
import { ClienteService } from 'services/clienteService';

jest.mock('components/common/DraggableModal', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('components/modals/clientes/ClienteListModal', () => ({
  __esModule: true,
  default: () => null,
}));

const mockUpdateMutate = jest.fn();

jest.mock('hooks/useIpsPermitidos', () => ({
  useCreateIpPermitido: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useUpdateIpPermitido: () => ({
    mutateAsync: (...args: unknown[]) => mockUpdateMutate(...args),
    isPending: false,
  }),
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

beforeEach(() => {
  (ClienteService.list as jest.Mock).mockResolvedValue({ data: [] });
  mockUpdateMutate.mockReset();
});

function renderModal(props: Partial<React.ComponentProps<typeof IpsPermitidoModal>> = {}) {
  localStorage.setItem('app-language', 'pt-BR');
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <I18nProvider>
        <NotificationProvider>
          <IpsPermitidoModal show onClose={jest.fn()} ipPermitidoId={1} {...props} />
        </NotificationProvider>
      </I18nProvider>
    </QueryClientProvider>,
  );
}

it('permite trocar o cliente na edição e envia o novo vínculo', async () => {
  mockUpdateMutate.mockResolvedValue({ id: 1, cliente_id: 22, faixa_ips: '10.0.0.1' });
  renderModal();
  const cliente = await screen.findByDisplayValue('8');
  expect(await screen.findByDisplayValue('Fenix')).toBeTruthy();
  expect((screen.getByRole('button', { name: 'Abrir listagem de registros' }) as HTMLButtonElement).disabled).toBe(false);
  fireEvent.focus(cliente);
  expect((cliente as HTMLInputElement).readOnly).toBe(false);
  fireEvent.change(cliente, { target: { value: '22' } });
  fireEvent.submit(document.getElementById('ips-permitido-form') as HTMLFormElement);
  await waitFor(() => {
    expect(mockUpdateMutate).toHaveBeenCalledWith({
      id: 1,
      data: { faixa_ips: '10.0.0.1', ativo: true, cliente_id: 22 },
    });
  });
});

it('preenche a faixa com o IP vindo do log', async () => {
  (ClienteService.list as jest.Mock).mockResolvedValue({ data: [] });
  renderModal({ ipPermitidoId: null, initialFaixaIps: '203.0.113.10' });
  expect(await screen.findByDisplayValue('203.0.113.10')).toBeTruthy();
});
