import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ModeloContratoSelectModal from './ModeloContratoSelectModal';

const mockPanel = jest.fn();

jest.mock('@tanstack/react-query', () => {
  const actual = jest.requireActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: () => ({ data: { data: [] }, isLoading: false, refetch: jest.fn() }),
  };
});

jest.mock('contexts/I18nContext', () => ({
  useI18n: () => ({ t: (key: string) => key, language: 'pt-BR' }),
}));

jest.mock('components/notifications/NotificationProvider', () => ({
  useNotificationContext: () => ({ success: jest.fn(), error: jest.fn(), info: jest.fn() }),
}));

jest.mock('hooks/useApiError', () => ({
  useApiError: () => ({ showApiError: jest.fn() }),
}));

jest.mock('hooks/useEntityRecordEdit', () => ({
  useEntityRecordEdit: () => ({ open: jest.fn() }),
}));

jest.mock('components/modals/parametros/documento/documentoModal/DocumentoModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('components/common/DraggableModal', () => ({
  __esModule: true,
  default: ({ title, children }: { title?: string; children?: React.ReactNode }) => (
    <div>
      <h2>{title}</h2>
      {children}
    </div>
  ),
}));

jest.mock('components/common/EmbeddedTablePanel', () => ({
  __esModule: true,
  default: (props: { title?: string }) => {
    mockPanel(props);
    return <div data-testid="panel" />;
  },
}));

describe('ModeloContratoSelectModal', () => {
  beforeEach(() => {
    mockPanel.mockClear();
  });

  it('mantém o título só no cabeçalho do modal', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <ModeloContratoSelectModal show onClose={jest.fn()} title="Modelo de contrato" />
      </QueryClientProvider>
    );

    expect(screen.getByRole('heading', { name: 'Modelo de contrato' }).textContent).toBe(
      'Modelo de contrato'
    );
    expect(mockPanel.mock.calls.at(-1)?.[0].title).toBeUndefined();
  });
});
