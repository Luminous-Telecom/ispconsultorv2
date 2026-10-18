import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from 'contexts/I18nContext';
import LoginScreen from './LoginScreen';

function renderLogin(ui: React.ReactElement) {
  localStorage.setItem('app-language', 'pt-BR');
  return render(<I18nProvider>{ui}</I18nProvider>);
}

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

  it('exibe a logo da empresa no painel esquerdo quando informada', () => {
    renderLogin(
      <LoginScreen
        subtitle="Acesse o painel administrativo"
        emailPlaceholder="E-mail"
        passwordPlaceholder="Senha"
        empresaLogo="/arquivos/empresa/1/logo.png"
        empresaLogoAlt="Logo da empresa"
        onSubmit={jest.fn()}
      />
    );

    const empresaLogo = screen.getByAltText('Logo da empresa') as HTMLImageElement;
    expect(empresaLogo.getAttribute('src')).toBe('/arquivos/empresa/1/logo.png');
    expect(empresaLogo.className).toContain('login-branding__empresa-logo');
    expect(screen.getByAltText(/ISP Consultor/i).closest('.login-brand__logo')).toBeTruthy();
  });

  it('não renderiza a logo da empresa quando ela não foi informada', () => {
    renderLogin(
      <LoginScreen
        subtitle="Acesse o painel administrativo"
        emailPlaceholder="E-mail"
        passwordPlaceholder="Senha"
        onSubmit={jest.fn()}
      />
    );

    expect(screen.queryByAltText('Logo da empresa')).toBeNull();
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
