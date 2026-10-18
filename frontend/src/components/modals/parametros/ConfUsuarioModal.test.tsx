import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ConfUsuarioModal from './ConfUsuarioModal';

const mockUpdateCurrentUser = jest.fn();
const mockSendRecoveryEmailValidation = jest.fn();
const mockGetCurrentUser = jest.fn();

jest.mock('services/authService', () => ({
  authService: {
    getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
    updateCurrentUser: (...args: unknown[]) => mockUpdateCurrentUser(...args),
    sendRecoveryEmailValidation: (...args: unknown[]) => mockSendRecoveryEmailValidation(...args),
  },
}));

jest.mock('components/notifications/NotificationProvider', () => ({
  useNotificationContext: () => ({ success: jest.fn(), error: jest.fn() }),
}));

jest.mock('hooks/useApiError', () => ({
  useApiError: () => ({ showApiError: jest.fn() }),
}));

jest.mock('contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', setTheme: jest.fn() }),
}));

jest.mock('contexts/FontSizeContext', () => ({
  useFontSize: () => ({ fontSize: 'md', setFontSize: jest.fn() }),
}));

jest.mock('contexts/I18nContext', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    language: 'pt-BR',
    setLanguage: jest.fn(),
    availableLanguages: [{ code: 'pt-BR', name: 'Português', flag: '🇧🇷' }],
  }),
}));

jest.mock('./SegurancaUsuarioModal', () => ({
  __esModule: true,
  default: () => <div data-testid="seguranca-panel" />,
}));

jest.mock('./DispositivosConfiaveisTab', () => ({
  __esModule: true,
  default: () => <div data-testid="dispositivos-panel" />,
}));

function renderModal() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ConfUsuarioModal show onClose={jest.fn()} />
    </QueryClientProvider>
  );
}

describe('ConfUsuarioModal', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
    (global as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    mockGetCurrentUser.mockResolvedValue({
      success: true,
      data: {
        id: 1,
        nome: 'Ana',
        email: 'ana@test.com',
        role: 'admin',
        empresa_id: 1,
        email_recuperacao: 'rec@test.com',
        email_recuperacao_verificado: false,
        totp_enabled: false,
      },
    });
    mockUpdateCurrentUser.mockResolvedValue({
      success: true,
      data: {
        id: 1,
        nome: 'Ana Silva',
        email: 'ana@test.com',
        role: 'admin',
        empresa_id: 1,
        email_recuperacao: 'rec@test.com',
        email_recuperacao_verificado: false,
        totp_enabled: false,
      },
    });
    mockSendRecoveryEmailValidation.mockResolvedValue({
      success: true,
      data: { sent_to: 'rec@test.com' },
    });
  });

  it('carrega nome e e-mail e salva alterações', async () => {
    renderModal();
    await waitFor(() => {
      expect(screen.getByDisplayValue('Ana')).toBeTruthy();
    });
    fireEvent.change(screen.getByDisplayValue('Ana'), { target: { value: 'Ana Silva' } });
    expect(screen.getByRole('button', { name: 'buttons.cancel' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'buttons.save' }));
    await waitFor(() => {
      expect(mockUpdateCurrentUser).toHaveBeenCalledWith(
        expect.objectContaining({ nome: 'Ana Silva', email: 'ana@test.com' })
      );
    });
  });

  it('mostra botão Validar no e-mail de recuperação não verificado', async () => {
    renderModal();
    await waitFor(() => {
      expect(screen.getByDisplayValue('rec@test.com')).toBeTruthy();
    });
    expect(screen.getByRole('button', { name: 'buttons.validate' })).toBeTruthy();
  });

  it('mostra Trocar senha nos botões de ação da aba Configurações', async () => {
    renderModal();
    await waitFor(() => {
      expect(screen.getByDisplayValue('Ana')).toBeTruthy();
    });
    expect(screen.getByRole('button', { name: 'buttons.changePassword' })).toBeTruthy();
  });

  it('mostra V quando e-mail de recuperação está validado', async () => {
    mockGetCurrentUser.mockResolvedValue({
      success: true,
      data: {
        id: 1,
        nome: 'Ana',
        email: 'ana@test.com',
        role: 'admin',
        empresa_id: 1,
        email_recuperacao: 'rec@test.com',
        email_recuperacao_verificado: true,
        totp_enabled: false,
      },
    });
    renderModal();
    await waitFor(() => {
      expect(screen.getByLabelText('userConfig.recoveryEmailVerified')).toBeTruthy();
    });
    expect(screen.queryByRole('button', { name: 'buttons.validate' })).toBeNull();
  });
});
