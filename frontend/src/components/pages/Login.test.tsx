import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nProvider } from 'contexts/I18nContext';
import Login from './Login';

const mockConfirmRecoveryEmail = jest.fn();
const mockNavigate = jest.fn();
const mockSuccess = jest.fn();
const mockConfirmToken = 'a'.repeat(64);

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [
    new URLSearchParams(`confirmar_email_recuperacao=${mockConfirmToken}`),
  ],
}));

jest.mock('services/authService', () => ({
  authService: {
    confirmRecoveryEmail: (...args: unknown[]) => mockConfirmRecoveryEmail(...args),
    login: jest.fn(),
    logout: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    sendEmail2faCode: jest.fn(),
    verify2fa: jest.fn(),
  },
  isRequires2fa: () => false,
}));

jest.mock('services/dadosEmpresaService', () => ({
  DadosEmpresaService: {
    getPublic: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock('components/notifications/NotificationProvider', () => ({
  useNotificationContext: () => ({
    success: (...args: unknown[]) => mockSuccess(...args),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
  }),
  NotificationProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('hooks/useApiError', () => ({
  useApiError: () => ({ showApiError: jest.fn() }),
}));

jest.mock('./login/LoginScreen', () => () => <div data-testid="login-screen" />);
jest.mock('./login/LoginTwoFactorStep', () => () => null);
jest.mock('./login/LoginForgotPasswordStep', () => () => null);
jest.mock('./login/LoginResetPasswordStep', () => () => null);
jest.mock('./login/LoginFooter', () => () => null);

describe('Login — confirmação de e-mail de recuperação', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConfirmRecoveryEmail.mockResolvedValue({ success: true, data: { verified: true } });
    localStorage.setItem('app-language', 'pt-BR');
  });

  it('confirma o e-mail pelo token da query e mostra sucesso', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <I18nProvider>
            <Login />
          </I18nProvider>
        </QueryClientProvider>
      );
    });

    await waitFor(() => {
      expect(mockConfirmRecoveryEmail).toHaveBeenCalledWith(mockConfirmToken);
    });
    expect(mockSuccess).toHaveBeenCalledWith('E-mail de recuperação confirmado.');
    expect(mockNavigate).toHaveBeenCalledWith(
      { pathname: '/login', search: '' },
      { replace: true }
    );
  });
});
