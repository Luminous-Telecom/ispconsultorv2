import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from 'contexts/I18nContext';
import EntityIdField from './EntityIdField';

const wrap = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

describe('EntityIdField', () => {
  it('não renderiza na criação sem id', () => {
    const { container } = wrap(<EntityIdField id={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('mostra o id somente leitura na edição', () => {
    wrap(<EntityIdField id={42} />);
    const input = screen.getByDisplayValue('42');
    expect(input).toBeDisabled();
    expect(input).toHaveAttribute('readonly');
  });
});
