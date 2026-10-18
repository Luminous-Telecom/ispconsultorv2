import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from 'contexts/I18nContext';
import LoginTwoFactorStep from './LoginTwoFactorStep';

function renderStep(ui: React.ReactElement) {
  localStorage.setItem('app-language', 'pt-BR');
  return render(<I18nProvider>{ui}</I18nProvider>);
}

const originalGetContext = HTMLCanvasElement.prototype.getContext;

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = jest.fn(() => {
    return {
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
    } as unknown as CanvasRenderingContext2D;
  }) as typeof HTMLCanvasElement.prototype.getContext;
});

afterAll(() => {
  HTMLCanvasElement.prototype.getContext = originalGetContext;
});

describe('LoginTwoFactorStep', () => {
  it('permite marcar Lembrar este navegador por 90 dias', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    renderStep(
      <LoginTwoFactorStep
        subtitle="Verificação"
        codeLabel="Código"
        codePlaceholder="000000"
        helpText="Ajuda"
        rememberLabel="Lembrar este navegador por 90 dias"
        sendEmailLabel="Enviar e-mail"
        passkeyLabel="Chave"
        methods={{ totp: true, email: false, webauthn: false }}
        onSubmit={onSubmit}
        onBack={jest.fn()}
      />
    );

    const checkbox = screen.getByRole('checkbox', {
      name: 'Lembrar este navegador por 90 dias',
    }) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);

    fireEvent.change(screen.getByPlaceholderText('000000'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('123456', true);
    });
  });
});
