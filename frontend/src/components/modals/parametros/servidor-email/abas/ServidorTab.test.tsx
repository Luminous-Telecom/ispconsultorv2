import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ServidorTab from './ServidorTab';
import type { ServidorEmailForm } from '../types';

jest.mock('contexts/I18nContext', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

jest.mock('components/notifications/NotificationProvider', () => ({
  useNotificationContext: () => ({ success: jest.fn(), error: jest.fn() }),
}));

const baseForm: ServidorEmailForm = {
  descricao: '',
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
  ativo: true,
  padrao: false,
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

  it('exibe o campo descrição e dispara onChange ao digitar', () => {
    const onChange = jest.fn();

    render(
      <ServidorTab
        formData={baseForm}
        onChange={onChange}
        isPending={false}
        emailTeste=""
        onEmailTesteChange={jest.fn()}
        onSendTestEmail={jest.fn()}
        isSendingTest={false}
      />
    );

    const campo = screen.getByLabelText('form.description');
    fireEvent.change(campo, { target: { value: 'SMTP principal' } });
    expect(onChange).toHaveBeenCalledWith('descricao', 'SMTP principal');
  });

  it('mostra o envio de teste quando o servidor já foi salvo', () => {
    const onSendTestEmail = jest.fn();

    render(
      <ServidorTab
        formData={baseForm}
        onChange={jest.fn()}
        isPending={false}
        servidorAtivo={{ data: { id: 4 } }}
        emailTeste="destino@empresa.com"
        onEmailTesteChange={jest.fn()}
        onSendTestEmail={onSendTestEmail}
        isSendingTest={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'emailServer.testEmailButton' }));
    expect(onSendTestEmail).toHaveBeenCalled();
  });
});
