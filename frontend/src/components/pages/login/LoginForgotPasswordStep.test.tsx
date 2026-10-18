import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from 'contexts/I18nContext';
import LoginForgotPasswordStep from './LoginForgotPasswordStep';

function renderStep(ui: React.ReactElement) {
  localStorage.setItem('app-language', 'pt-BR');
  return render(<I18nProvider>{ui}</I18nProvider>);
}

describe('LoginForgotPasswordStep', () => {
  it('envia o e-mail ao submeter', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    renderStep(
      <LoginForgotPasswordStep
        subtitle="Recuperar senha"
        helpText="Informe o e-mail"
        emailPlaceholder="E-mail"
        onSubmit={onSubmit}
        onBack={jest.fn()}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('E-mail'), {
      target: { value: 'admin@teste.com' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    });

    expect(onSubmit).toHaveBeenCalledWith('admin@teste.com');
  });

  it('mantém o texto Enviar e fica desabilitado enquanto pendente', async () => {
    let resolveSubmit: (() => void) | undefined;
    const onSubmit = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSubmit = resolve;
        })
    );

    renderStep(
      <LoginForgotPasswordStep
        subtitle="Recuperar senha"
        helpText="Informe o e-mail"
        emailPlaceholder="E-mail"
        onSubmit={onSubmit}
        onBack={jest.fn()}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('E-mail'), {
      target: { value: 'admin@teste.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    const botao = screen.getByRole('button', { name: 'Enviar' }) as HTMLButtonElement;
    expect(botao.disabled && botao.textContent === 'Enviar').toBe(true);

    await act(async () => {
      resolveSubmit?.();
    });
  });

  it('volta ao login ao clicar em Voltar', () => {
    const onBack = jest.fn();
    renderStep(
      <LoginForgotPasswordStep
        subtitle="Recuperar senha"
        helpText="Informe o e-mail"
        emailPlaceholder="E-mail"
        onSubmit={jest.fn()}
        onBack={onBack}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(onBack).toHaveBeenCalled();
  });
});
