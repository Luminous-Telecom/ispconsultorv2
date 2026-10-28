import React from 'react';
import { render } from '@testing-library/react';
import RpkiRoaListModal from './RpkiRoaListModal';

const mockListModal = jest.fn();

jest.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: [], isLoading: false, refetch: jest.fn() }),
  useMutation: () => ({ mutate: jest.fn(), isPending: false }),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));

jest.mock('contexts/I18nContext', () => ({
  useI18n: () => ({ t: (key: string) => key, language: 'pt-BR' }),
}));

jest.mock('contexts/ModalContext', () => ({
  useModal: () => ({ openModal: jest.fn(), closeModal: jest.fn() }),
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

jest.mock('./RpkiRoaListSubModals', () => ({
  RpkiRoaListSubModals: () => null,
}));

type ListModalProps = {
  showEmbeddedTableTitle?: boolean;
  config?: { title?: string };
};

function lastListProps(): ListModalProps {
  return mockListModal.mock.calls.at(-1)?.[0] as ListModalProps;
}

describe('RpkiRoaListModal', () => {
  beforeEach(() => {
    mockListModal.mockClear();
  });

  it('não desenha título interno quando o menu já abre o modal com cabeçalho', () => {
    render(<RpkiRoaListModal show onClose={jest.fn()} skipWrapper />);
    expect(lastListProps().showEmbeddedTableTitle).toBe(false);
    expect(lastListProps().config?.title).toBe('ROAs');
  });

  it('mostra o título da tabela quando a aba do cliente informa tableTitle', () => {
    render(<RpkiRoaListModal show onClose={jest.fn()} skipWrapper tableTitle="ROAs" />);
    expect(lastListProps().showEmbeddedTableTitle).toBe(true);
    expect(lastListProps().config?.title).toBe('ROAs');
  });
});
