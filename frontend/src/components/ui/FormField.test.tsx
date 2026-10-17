import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from 'contexts/I18nContext';
import { NotificationProvider } from 'components/notifications/NotificationProvider';
import FormField from './FormField';

function renderField(ui: React.ReactElement) {
  localStorage.setItem('app-language', 'pt-BR');
  return render(
    <I18nProvider>
      <NotificationProvider>{ui}</NotificationProvider>
    </I18nProvider>,
  );
}

describe('FormField', () => {
  it('coloca o conteúdo leading antes do input', () => {
    renderField(
      <FormField
        name="cnpj"
        label="CNPJ"
        value=""
        onChange={jest.fn()}
        leading={<button type="button">Cartão CNPJ</button>}
      />,
    );

    const botao = screen.getByRole('button', { name: 'Cartão CNPJ' });
    const input = screen.getByRole('textbox', { name: 'CNPJ' });
    expect(botao.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
