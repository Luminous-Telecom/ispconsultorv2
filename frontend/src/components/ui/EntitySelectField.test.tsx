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
    expect(input.hasAttribute('data-autofill-guard')).toBe(true);

    fireEvent.focus(input);
    expect(input.readOnly).toBe(false);
    expect(input.hasAttribute('data-autofill-guard')).toBe(false);
  });

  it('mostra o nome quando o id selecionado chega como texto', () => {
    renderField(
      <EntitySelectField
        label="Servidor"
        value={'1' as unknown as number}
        onChange={jest.fn()}
        entities={[{ id: 1, nome: 'SMTP principal' }]}
      />,
    );

    expect(screen.getByDisplayValue('1')).toBeTruthy();
    expect(screen.getByDisplayValue('SMTP principal')).toBeTruthy();
  });
});
