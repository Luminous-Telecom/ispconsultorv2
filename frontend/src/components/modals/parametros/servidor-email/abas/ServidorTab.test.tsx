import React from 'react';
import { render, screen } from '@testing-library/react';
import ServidorTab from './ServidorTab';
import type { ServidorEmailForm } from '../types';

jest.mock('contexts/I18nContext', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

jest.mock('components/notifications/NotificationProvider', () => ({
  useNotificationContext: () => ({ success: jest.fn(), error: jest.fn() }),
}));

const baseForm: ServidorEmailForm = {
  host: 'smtp.gmail.com',
  porta: 587,
  usuario: 'a@b.com',
  senha: '',
  ssl: false,
  tls: true,
  nome_remetente: 'ISP',
  email_remetente: 'c@d.com',
  timeout: 30000,
  tentativas: 3,
  intervalo_tentativas: 5000,
};

describe('ServidorTab', () => {
  it('não quebra quando porta e timeout vêm undefined', () => {
    const incomplete = {
      ...baseForm,
      porta: undefined,
      timeout: undefined,
    } as unknown as ServidorEmailForm;

    render(
      <ServidorTab
        formData={incomplete}
        onChange={jest.fn()}
        isPending={false}
        emailTeste=""
        onEmailTesteChange={jest.fn()}
        onSendTestEmail={jest.fn()}
        isSendingTest={false}
      />
    );

    expect(screen.getByDisplayValue('587')).toBeTruthy();
    expect(screen.getByDisplayValue('30000')).toBeTruthy();
  });
});
