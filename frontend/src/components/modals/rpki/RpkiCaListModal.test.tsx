import React from 'react';
import { render } from '@testing-library/react';
import RpkiCaListModal from './RpkiCaListModal';

const mockListModal = jest.fn();

jest.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: [], isLoading: false, refetch: jest.fn() }),
  useMutation: () => ({ mutate: jest.fn(), isPending: false }),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));

jest.mock('contexts/I18nContext', () => ({
  useI18n: () => ({ t: (key: string) => key, language: 'pt-BR' }),
}));

jest.mock('components/notifications/NotificationProvider', () => ({
  useNotificationContext: () => ({ success: jest.fn(), error: jest.fn(), info: jest.fn() }),
}));

jest.mock('hooks/useApiError', () => ({
  useApiError: () => ({ showApiError: jest.fn() }),
}));

jest.mock('components/common/ListModal', () => ({
  __esModule: true,
  default: (props: unknown) => {
    mockListModal(props);
    return <div data-testid="list-modal" />;
  },
}));

jest.mock('./RpkiCaCreateModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('components/common/ImprimirModal', () => ({
  __esModule: true,
  default: () => null,
}));

type ListModalProps = {
  showEmbeddedTableTitle?: boolean;
  config?: { title?: string };
};

function lastListProps(): ListModalProps {
  return mockListModal.mock.calls.at(-1)?.[0] as ListModalProps;
}

describe('RpkiCaListModal', () => {
  beforeEach(() => {
    mockListModal.mockClear();
  });

  it('não desenha título interno quando o menu já abre o modal com cabeçalho', () => {
    render(<RpkiCaListModal show onClose={jest.fn()} skipWrapper />);
    expect(lastListProps().showEmbeddedTableTitle).toBe(false);
    expect(lastListProps().config?.title).toBe('CAs RPKI');
  });

  it('mostra o título da tabela quando a aba do cliente informa tableTitle', () => {
    render(<RpkiCaListModal show onClose={jest.fn()} skipWrapper tableTitle="CAs" />);
    expect(lastListProps().showEmbeddedTableTitle).toBe(true);
    expect(lastListProps().config?.title).toBe('CAs');
  });
});
