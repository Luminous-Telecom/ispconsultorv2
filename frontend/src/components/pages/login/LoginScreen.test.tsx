import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from 'contexts/I18nContext';
import LoginScreen from './LoginScreen';

function renderLogin(ui: React.ReactElement) {
  localStorage.setItem('app-language', 'pt-BR');
  return render(<I18nProvider>{ui}</I18nProvider>);
}

const originalGetContext = HTMLCanvasElement.prototype.getContext;

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = jest.fn(() => {
    const ctx = {
      setTransform: jest.fn(),
      createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
      createRadialGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
      fillRect: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      arc: jest.fn(),
      stroke: jest.fn(),
      fill: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
    };
    return ctx as unknown as CanvasRenderingContext2D;
  }) as typeof HTMLCanvasElement.prototype.getContext;
});

afterAll(() => {
  HTMLCanvasElement.prototype.getContext = originalGetContext;
});

describe('LoginScreen', () => {
  it('mostra a logo ISP Consultor acima do texto de acesso ao painel', () => {
    renderLogin(
      <LoginScreen
        subtitle="Acesse o painel administrativo"
        emailPlaceholder="E-mail"
        passwordPlaceholder="Senha"
        onSubmit={jest.fn()}
      />
    );

    const logo = screen.getByAltText(/ISP Consultor/i);
    expect(logo.closest('.login-brand__logo')).toBeTruthy();
    expect(document.querySelector('.login-panel .login-card .login-brand')).toBeTruthy();
    expect(screen.getByText('Acesse o painel administrativo')).toBeTruthy();
  });

  it('não exibe a logo da empresa cadastrada', () => {
    renderLogin(
      <LoginScreen
        subtitle="Acesse o painel administrativo"
        emailPlaceholder="E-mail"
        passwordPlaceholder="Senha"
        onSubmit={jest.fn()}
      />
    );

    expect(screen.queryByAltText('Logo da empresa')).toBeNull();
    expect(document.querySelector('.login-branding')).toBeNull();
    expect(screen.getByAltText(/ISP Consultor/i).closest('.login-brand__logo')).toBeTruthy();
  });

  it('envia email e senha ao submeter o formulário', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    renderLogin(
      <LoginScreen
        subtitle="Acesse o painel administrativo"
        emailPlaceholder="E-mail"
        passwordPlaceholder="Senha"
        onSubmit={onSubmit}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('E-mail'), {
      target: { value: 'admin@teste.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Senha'), {
      target: { value: 'senha123' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    });

    expect(onSubmit).toHaveBeenCalledWith({
      email: 'admin@teste.com',
      password: 'senha123',
    });
  });

  it('mostra Esqueci minha senha e dispara o callback', () => {
    const onForgotPassword = jest.fn();

    renderLogin(
      <LoginScreen
        subtitle="Acesse o painel administrativo"
        emailPlaceholder="E-mail"
        passwordPlaceholder="Senha"
        forgotPasswordLabel="Esqueci minha senha"
        onForgotPassword={onForgotPassword}
        onSubmit={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Esqueci minha senha' }));
    expect(onForgotPassword).toHaveBeenCalled();
  });

  it('mantém o texto Entrar e fica desabilitado enquanto o submit está pendente', async () => {
    let resolveSubmit: (() => void) | undefined;
    const onSubmit = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSubmit = resolve;
        })
    );

    renderLogin(
      <LoginScreen
        subtitle="Acesse o painel administrativo"
        emailPlaceholder="E-mail"
        passwordPlaceholder="Senha"
        onSubmit={onSubmit}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('E-mail'), {
      target: { value: 'admin@teste.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Senha'), {
      target: { value: 'senha123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    const botao = screen.getByRole('button', { name: 'Entrar' }) as HTMLButtonElement;
    expect(botao.disabled && botao.textContent === 'Entrar').toBe(true);

    await act(async () => {
      resolveSubmit?.();
    });
  });
});
