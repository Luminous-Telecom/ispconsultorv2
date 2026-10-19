import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import UsuarioFormModal from './UsuarioFormModal';

jest.mock('services/usuarioService', () => ({
  UsuarioService: {
    create: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('hooks/useUsuarios', () => ({
  useUsuario: () => ({ data: undefined }),
  useGerarWebhookSecret: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useResetUsuario2fa: () => ({ mutateAsync: jest.fn(), isPending: false }),
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

function renderCreate() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <UsuarioFormModal show onClose={jest.fn()} />
    </QueryClientProvider>
  );
}

describe('UsuarioFormModal', () => {
  it('mostra o perfil e a chave API no cadastro', () => {
    renderCreate();

    const profile = screen.getByLabelText(/user\.profile/) as HTMLSelectElement;
    expect(profile.tagName).toBe('SELECT');
    expect(screen.getByRole('option', { name: 'user.user' }).textContent).toBe('user.user');
    expect(screen.getByRole('option', { name: 'user.financeiro' }).textContent).toBe('user.financeiro');
    expect(screen.getByRole('option', { name: 'user.admin' }).textContent).toBe('user.admin');
    expect((screen.getByLabelText(/user\.webhookSecret/) as HTMLInputElement).name).toBe('webhook_secret');
    expect(screen.getByText('user.apiKeyAfterSave').textContent).toBe('user.apiKeyAfterSave');
  });

  it('o perfil padrão do cadastro é o usuário', () => {
    renderCreate();
    expect((screen.getByLabelText(/user\.profile/) as HTMLSelectElement).value).toBe('user');
  });
});
