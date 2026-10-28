import React from 'react';
import { render, screen } from '@testing-library/react';
import RpkiRoaAnalysisModal from './RpkiRoaAnalysisModal';

const mockPanel = jest.fn();

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

describe('RpkiRoaAnalysisModal', () => {
  beforeEach(() => {
    mockPanel.mockClear();
  });

  it('mantém o título só no cabeçalho do modal', () => {
    render(
      <RpkiRoaAnalysisModal
        show
        caNome="CA-1"
        rows={[]}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: 'Análise de ROA - CA-1' }).textContent).toBe(
      'Análise de ROA - CA-1'
    );
    expect(mockPanel.mock.calls.at(-1)?.[0].title).toBeUndefined();
  });
});
