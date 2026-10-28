import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DispositivosConfiaveisTab from './DispositivosConfiaveisTab';

const mockGetTwoFactorStatus = jest.fn();

jest.mock('services/authService', () => ({
  authService: {
    getTwoFactorStatus: (...args: unknown[]) => mockGetTwoFactorStatus(...args),
    revokeTrustedDevice: jest.fn(),
    revokeAllTrustedDevices: jest.fn(),
  },
}));

jest.mock('components/notifications/NotificationProvider', () => ({
  useNotificationContext: () => ({ success: jest.fn(), error: jest.fn() }),
}));

jest.mock('hooks/useApiError', () => ({
  useApiError: () => ({ showApiError: jest.fn() }),
}));

jest.mock('contexts/I18nContext', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

const mockEmbeddedTable = jest.fn();

jest.mock('components/common/EmbeddedTablePanel', () => ({
  __esModule: true,
  default: (props: { title?: string; config: { emptyMessage?: string; data?: unknown[] } }) => {
    mockEmbeddedTable(props);
    return (
      <div data-testid="embedded-table">
        <span data-testid="empty-message">{props.config.emptyMessage}</span>
        <span data-testid="row-count">{props.config.data?.length ?? 0}</span>
      </div>
    );
  },
}));

describe('DispositivosConfiaveisTab', () => {
  beforeEach(() => {
    mockGetTwoFactorStatus.mockResolvedValue({
      success: true,
      data: {
        enabled: true,
        totp_enabled: true,
        email_2fa_enabled: false,
        smtp_configured: true,
        recovery_codes_remaining: 8,
        passkeys: [],
        trusted_devices: [
          {
            id: 1,
            label: 'Chrome · Linux',
            ip: '192.168.1.10',
            created_at: '2026-01-01T00:00:00.000Z',
            expires_at: '2026-04-01T00:00:00.000Z',
          },
        ],
      },
    });
  });

  it('carrega dispositivos na tabela embutida', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <DispositivosConfiaveisTab />
      </QueryClientProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('row-count').textContent).toBe('1');
    });
    expect(screen.getByTestId('empty-message').textContent).toBe('security.trustedDevicesEmpty');
    expect(mockEmbeddedTable.mock.calls.at(-1)?.[0].title).toBeUndefined();
  });
});
