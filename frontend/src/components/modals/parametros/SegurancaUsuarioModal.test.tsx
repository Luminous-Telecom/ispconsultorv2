import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SegurancaUsuarioModal from './SegurancaUsuarioModal';

const mockGetTwoFactorStatus = jest.fn();

jest.mock('services/authService', () => ({
  authService: {
    getTwoFactorStatus: (...args: unknown[]) => mockGetTwoFactorStatus(...args),
    setupTwoFactor: jest.fn(),
    confirmTwoFactor: jest.fn(),
    disableTwoFactor: jest.fn(),
    reconfigureTwoFactor: jest.fn(),
    setEmailTwoFactor: jest.fn(),
    webauthnRegisterOptions: jest.fn(),
    webauthnRegisterVerify: jest.fn(),
    removePasskey: jest.fn(),
  },
}));

jest.mock('@simplewebauthn/browser', () => ({
  startRegistration: jest.fn(),
}));

jest.mock('components/notifications/NotificationProvider', () => ({
  useNotificationContext: () => ({ success: jest.fn(), error: jest.fn() }),
}));

jest.mock('hooks/useApiError', () => ({
  useApiError: () => ({ showApiError: jest.fn() }),
}));

jest.mock('contexts/I18nContext', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

function renderModal(onHeaderActionsReady?: (actions: React.ReactNode) => void) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <SegurancaUsuarioModal
        show
        onClose={jest.fn()}
        skipWrapper
        panel="security"
        onHeaderActionsReady={onHeaderActionsReady}
      />
    </QueryClientProvider>
  );
}

describe('SegurancaUsuarioModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTwoFactorStatus.mockResolvedValue({
      success: true,
      data: {
        enabled: true,
        totp_enabled: true,
        email_2fa_enabled: false,
        smtp_configured: true,
        recovery_codes_remaining: 8,
        passkeys: [],
        trusted_devices: [],
      },
    });
  });

  it('expõe Reconfigurar 2FA, Desativar 2FA e Adicionar chave nos botões de ação', async () => {
    let header: React.ReactNode = null;
    renderModal((actions) => {
      header = actions;
    });

    await waitFor(() => {
      expect(screen.getByText('security.totpSection')).toBeTruthy();
    });
    await waitFor(() => {
      const { getByRole, unmount } = render(<>{header}</>);
      try {
        expect(getByRole('button', { name: 'buttons.reconfigure2fa' })).toBeTruthy();
        expect(getByRole('button', { name: 'buttons.disable2fa' })).toBeTruthy();
        expect(getByRole('button', { name: 'buttons.addPasskey' })).toBeTruthy();
      } finally {
        unmount();
      }
    });
  });

  it('não mostra botão Ativar 2FA dentro do conteúdo quando já está ativo', async () => {
    renderModal();
    await waitFor(() => {
      expect(screen.getByText('security.totpSection')).toBeTruthy();
    });
    expect(screen.queryByRole('button', { name: 'buttons.enable2fa' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'buttons.addPasskey' })).toBeNull();
  });
});
