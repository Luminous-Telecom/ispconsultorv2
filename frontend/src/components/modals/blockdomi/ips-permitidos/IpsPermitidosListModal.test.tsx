import React from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nProvider } from 'contexts/I18nContext';
import { NotificationProvider } from 'components/notifications/NotificationProvider';
import IpsPermitidosListModal from './IpsPermitidosListModal';
import type { IpPermitido } from 'services/ipsPermitidosService';

const mockListModal = jest.fn();

jest.mock('components/common/ListModal', () => ({
  __esModule: true,
  default: (props: unknown) => {
    mockListModal(props);
    return <div />;
  },
}));

jest.mock('components/common/ImprimirModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('./IpsPermitidoModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('hooks/useIpsPermitidos', () => ({
  useIpsPermitidos: () => ({ data: { data: [], pagination: undefined }, isLoading: false, refetch: jest.fn() }),
  useDeleteIpPermitido: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

type Column = { key: string; label: string; render?: (item: IpPermitido) => React.ReactNode };
type ListModalProps = { config?: { columns?: Column[]; searchFields?: Array<{ key: string; label: string }> } };

function lastListProps(): ListModalProps {
  return mockListModal.mock.calls.at(-1)?.[0] as ListModalProps;
}

const faixa: IpPermitido = {
  id: 1,
  cliente_id: 8,
  faixa_ips: '10.0.0.0/24',
  razao_social: 'Empresa LTDA',
  nome_fantasia: 'Fantasia',
  cnpj: '00.000.000/0001-00',
};

it('lista CNPJ, razão social e nome fantasia no lugar do cliente', () => {
  localStorage.setItem('app-language', 'pt-BR');
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <I18nProvider>
        <NotificationProvider>
          <IpsPermitidosListModal show onClose={jest.fn()} />
        </NotificationProvider>
      </I18nProvider>
    </QueryClientProvider>,
  );

  const columns = lastListProps().config?.columns ?? [];
  const labels = columns.map((column) => column.label);
  expect(labels).toEqual(expect.arrayContaining(['CNPJ', 'Razão Social', 'Nome Fantasia']));
  expect(labels).not.toContain('Cliente');

  const byKey = Object.fromEntries(columns.map((column) => [column.key, column]));
  expect(byKey.cnpj.render?.(faixa)).toBe('00.000.000/0001-00');
  expect(byKey.razao_social.render?.(faixa)).toBe('Empresa LTDA');
  expect(byKey.nome_fantasia.render?.(faixa)).toBe('Fantasia');

  const search = lastListProps().config?.searchFields?.map((field) => field.label) ?? [];
  expect(search).toEqual(expect.arrayContaining(['CNPJ', 'Razão Social', 'Nome Fantasia']));
  expect(search).not.toContain('Cliente');
});
