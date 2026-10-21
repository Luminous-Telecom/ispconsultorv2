import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from 'contexts/I18nContext';
import { NotificationProvider } from 'components/notifications/NotificationProvider';
import EntitySelectField from './EntitySelectField';

function renderField(ui: React.ReactElement) {
  localStorage.setItem('app-language', 'pt-BR');
  return render(
    <I18nProvider>
      <NotificationProvider>{ui}</NotificationProvider>
    </I18nProvider>,
  );
}

describe('EntitySelectField', () => {
  it('não deixa o navegador preencher o id com o cadastro anterior', () => {
    renderField(
      <EntitySelectField label="Cliente" value={0} onChange={jest.fn()} entities={[]} />,
    );

    const input = screen.getByTitle('Digite o ID') as HTMLInputElement;
    expect(input.getAttribute('autocomplete')).toBe('off');
    expect(input.readOnly).toBe(true);

    fireEvent.focus(input);
    expect(input.readOnly).toBe(false);
  });
});
