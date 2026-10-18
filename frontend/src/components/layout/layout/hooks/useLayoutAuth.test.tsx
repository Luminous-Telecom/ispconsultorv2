import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { useLayoutAuth } from './useLayoutAuth';

const mockNavigate = jest.fn();
const mockConfirmToken = 'b'.repeat(64);

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({
    pathname: '/adm',
    search: `?confirmar_email_recuperacao=${mockConfirmToken}`,
  }),
}));

jest.mock('services/core', () => ({
  getAuthToken: () => null,
}));

jest.mock('services/authService', () => ({
  authService: {
    getCurrentUser: jest.fn(),
    logout: jest.fn(),
  },
}));

jest.mock('../../../notifications/NotificationProvider', () => ({
  useNotificationContext: () => ({ success: jest.fn() }),
}));

function Probe() {
  useLayoutAuth((key) => key);
  return null;
}

describe('useLayoutAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('encaminha link antigo de confirmação de /adm para /login com o token', async () => {
    render(<Probe />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        `/login?confirmar_email_recuperacao=${mockConfirmToken}`,
        { replace: true }
      );
    });
  });
});
