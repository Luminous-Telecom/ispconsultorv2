import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { I18nProvider } from 'contexts/I18nContext';
import RpkiRoaAnalysisModal from './RpkiRoaAnalysisModal';

const mockPanel = jest.fn();

jest.mock('components/common/DraggableModal', () => ({
  __esModule: true,
  default: ({
    title,
    children,
    className,
    headerActions,
  }: {
    title?: string;
    children?: React.ReactNode;
    className?: string;
    headerActions?: React.ReactNode;
  }) => (
    <div data-modal-class={className}>
      <h2>{title}</h2>
      {headerActions}
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
    localStorage.setItem('app-language', 'pt-BR');
    render(
      <I18nProvider>
        <RpkiRoaAnalysisModal
          show
          caNome="CA-1"
          rows={[]}
          onClose={jest.fn()}
          onConfirm={jest.fn()}
        />
      </I18nProvider>
    );

    expect(screen.getByRole('heading', { name: 'Análise de ROA - CA-1' }).textContent).toBe(
      'Análise de ROA - CA-1'
    );
    expect(mockPanel.mock.calls.at(-1)?.[0].title).toBeUndefined();
    expect(document.querySelector('[data-modal-class]')?.getAttribute('data-modal-class')).toBe(
      'no-padding list-modal-no-body-scroll'
    );

    const header = document.querySelector('.modal-header-actions');
    expect(header?.className).toContain('d-flex');
    expect(header?.className).toContain('gap-2');
    expect(within(header as HTMLElement).getByRole('button', { name: 'Cancelar' }).textContent).toBe(
      'Cancelar'
    );
    expect(within(header as HTMLElement).getByRole('button', { name: 'Confirmar' }).textContent).toBe(
      'Confirmar'
    );
  });
});
