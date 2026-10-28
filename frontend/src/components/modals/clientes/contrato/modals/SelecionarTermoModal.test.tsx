import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SelecionarTermoModal from './SelecionarTermoModal';

const mockPanel = jest.fn();

jest.mock('hooks/useModelosTermo', () => ({
  useModelosTermo: () => ({ data: [], isLoading: false }),
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

describe('SelecionarTermoModal', () => {
  beforeEach(() => {
    mockPanel.mockClear();
  });

  it('mantém o título só no cabeçalho do modal', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <SelecionarTermoModal show onClose={jest.fn()} onSelect={jest.fn()} />
      </QueryClientProvider>
    );

    expect(screen.getByRole('heading', { name: 'Termo' }).textContent).toBe('Termo');
    expect(mockPanel.mock.calls.at(-1)?.[0].title).toBeUndefined();
  });
});
