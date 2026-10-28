import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from 'contexts/I18nContext';
import { NotificationProvider } from 'components/notifications/NotificationProvider';
import EntityIdField from './EntityIdField';

const wrap = (ui: React.ReactElement) => render(
  <I18nProvider>
    <NotificationProvider>{ui}</NotificationProvider>
  </I18nProvider>
);

describe('EntityIdField', () => {
  it('não renderiza na criação sem id', () => {
    const { container } = wrap(<EntityIdField id={null} />);
    expect(container.childElementCount).toBe(0);
  });

  it('mostra o id somente leitura na edição', () => {
    wrap(<EntityIdField id={42} />);
    const input = screen.getByDisplayValue('42') as HTMLInputElement;
    expect(input.disabled).toBe(true);
    expect(input.readOnly).toBe(true);
  });
});
