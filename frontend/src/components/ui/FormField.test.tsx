import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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
  it('coloca o trailing depois do input, como extensão na mesma coluna', () => {
    renderField(
      <FormField
        name="cnpj"
        label="CNPJ"
        value=""
        onChange={jest.fn()}
        trailing={<button type="button">Cartão CNPJ</button>}
      />,
    );

    const botao = screen.getByRole('button', { name: 'Cartão CNPJ' });
    const input = screen.getByRole('textbox', { name: 'CNPJ' });
    const group = botao.parentElement;
    expect(input.compareDocumentPosition(botao) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(group?.classList.contains('form-field-with-trailing')).toBe(true);
    expect(group?.parentElement?.classList.contains('form-field-control')).toBe(true);
  });

  it('não reaproveita nome, e-mail e endereço do cadastro anterior', () => {
    renderField(
      <FormField
        name="razao_social"
        label="Razão social"
        value=""
        autoComplete="organization"
        onChange={jest.fn()}
      />,
    );

    const input = screen.getByRole('textbox', { name: 'Razão social' }) as HTMLInputElement;
    expect(input.getAttribute('autocomplete')).toBe('off');
    expect(input.readOnly).toBe(true);
    expect(input.hasAttribute('data-autofill-guard')).toBe(true);

    fireEvent.focus(input);
    expect(input.readOnly).toBe(false);
    expect(input.hasAttribute('data-autofill-guard')).toBe(false);
  });

  it('campo somente leitura de verdade não usa a marca de editável', () => {
    renderField(
      <FormField
        name="numero"
        label="Número"
        value="10"
        readOnly
        onChange={jest.fn()}
      />,
    );

    const input = screen.getByRole('textbox', { name: 'Número' }) as HTMLInputElement;
    expect(input.readOnly).toBe(true);
    expect(input.hasAttribute('data-autofill-guard')).toBe(false);
  });

  it('mantém autocomplete de senha nova quando o campo pede', () => {
    renderField(
      <FormField
        name="senha"
        type="password"
        label="Senha"
        value=""
        autoComplete="new-password"
        onChange={jest.fn()}
      />,
    );

    const input = screen.getByLabelText('Senha') as HTMLInputElement;
    expect(input.getAttribute('autocomplete')).toBe('new-password');
    expect(input.readOnly).toBe(false);
  });

  it('mostra a mensagem de erro do textarea', () => {
    renderField(
      <FormField
        name="ips_dns"
        type="textarea"
        label="IPs DNS"
        value="nao-e-ip"
        error="Informe IPv4, IPv6 ou CIDR separados por ;"
        onChange={jest.fn()}
      />,
    );

    const field = screen.getByRole('textbox', { name: 'IPs DNS' }) as HTMLTextAreaElement;
    expect(field.classList.contains('is-invalid')).toBe(true);
    expect(screen.getByText('Informe IPv4, IPv6 ou CIDR separados por ;')).toBeTruthy();
  });
});
