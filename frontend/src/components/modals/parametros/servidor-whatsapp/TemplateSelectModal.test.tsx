import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TemplateSelectModal from './TemplateSelectModal';

const mockPanel = jest.fn();

jest.mock('@tanstack/react-query', () => {
  const actual = jest.requireActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: () => ({ data: { data: [] }, isLoading: false, error: null, refetch: jest.fn() }),
  };
});

jest.mock('contexts/I18nContext', () => ({
  useI18n: () => ({ t: (key: string) => key, language: 'pt-BR' }),
}));

jest.mock('services/templateWhatsAppService', () => ({
  TemplateWhatsAppService: { list: jest.fn() },
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

describe('TemplateSelectModal', () => {
  beforeEach(() => {
    mockPanel.mockClear();
  });

  it('mantém o título só no cabeçalho do modal', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <TemplateSelectModal show onClose={jest.fn()} onSelect={jest.fn()} title="Templates" />
      </QueryClientProvider>
    );

    expect(screen.getByRole('heading', { name: 'Templates' }).textContent).toBe('Templates');
    expect(mockPanel.mock.calls.at(-1)?.[0].title).toBeUndefined();
  });
});
