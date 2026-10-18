import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from 'contexts/I18nContext';
import LoginResetPasswordStep from './LoginResetPasswordStep';

function renderStep(ui: React.ReactElement) {
  localStorage.setItem('app-language', 'pt-BR');
  return render(<I18nProvider>{ui}</I18nProvider>);
}

describe('LoginResetPasswordStep', () => {
  it('envia senha e confirmação ao submeter', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    renderStep(
      <LoginResetPasswordStep
        subtitle="Redefinir senha"
        helpText="Escolha uma nova senha"
        passwordPlaceholder="Nova senha"
        confirmPlaceholder="Confirmar nova senha"
        onSubmit={onSubmit}
        onBack={jest.fn()}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Nova senha'), {
      target: { value: 'senha123' },
    });
    fireEvent.change(screen.getByPlaceholderText('Confirmar nova senha'), {
      target: { value: 'senha123' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Alterar Senha' }));
    });

    expect(onSubmit).toHaveBeenCalledWith('senha123', 'senha123');
  });

  it('mantém o texto Alterar Senha e fica desabilitado enquanto pendente', async () => {
    let resolveSubmit: (() => void) | undefined;
    const onSubmit = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSubmit = resolve;
        })
    );

    renderStep(
      <LoginResetPasswordStep
        subtitle="Redefinir senha"
        helpText="Escolha uma nova senha"
        passwordPlaceholder="Nova senha"
        confirmPlaceholder="Confirmar nova senha"
        onSubmit={onSubmit}
        onBack={jest.fn()}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Nova senha'), {
      target: { value: 'senha123' },
    });
    fireEvent.change(screen.getByPlaceholderText('Confirmar nova senha'), {
      target: { value: 'senha123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Alterar Senha' }));

    const botao = screen.getByRole('button', { name: 'Alterar Senha' }) as HTMLButtonElement;
    expect(botao.disabled && botao.textContent === 'Alterar Senha').toBe(true);

    await act(async () => {
      resolveSubmit?.();
    });
  });
});
