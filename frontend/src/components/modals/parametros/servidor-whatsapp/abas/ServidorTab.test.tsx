import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ServidorTab from './ServidorTab';
import type { ServidorWhatsAppForm } from '../types';

jest.mock('contexts/I18nContext', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

jest.mock('components/notifications/NotificationProvider', () => ({
  useNotificationContext: () => ({ success: jest.fn(), error: jest.fn() }),
}));

const baseForm: ServidorWhatsAppForm = {
  descricao: '',
  tipo_api: 'evolution',
  evolution_api_url: 'https://evo-api.example.com',
  evolution_api_key: '',
  instance_name: '',
  whatsapp_cloud_token: '',
  whatsapp_cloud_phone_number_id: '',
  whatsapp_cloud_business_account_id: '',
};

describe('ServidorTab (WhatsApp)', () => {
  it('exibe o campo descrição e dispara onChange ao digitar', () => {
    const onChange = jest.fn();

    render(
      <ServidorTab
        formData={baseForm}
        onChange={onChange}
        isPending={false}
        testPhone=""
        testMessage=""
        onTestPhoneChange={jest.fn()}
        onTestMessageChange={jest.fn()}
        onSendTestMessage={jest.fn()}
        isSendingTest={false}
      />
    );

    const campo = screen.getByLabelText('form.description');
    expect(campo).toBeTruthy();
    fireEvent.change(campo, { target: { value: 'Principal' } });
    expect(onChange).toHaveBeenCalledWith('descricao', 'Principal');
  });

  it('carrega descrição já salva no formulário', () => {
    render(
      <ServidorTab
        formData={{ ...baseForm, descricao: 'Fila cobrança' }}
        onChange={jest.fn()}
        isPending={false}
        testPhone=""
        testMessage=""
        onTestPhoneChange={jest.fn()}
        onTestMessageChange={jest.fn()}
        onSendTestMessage={jest.fn()}
        isSendingTest={false}
      />
    );

    expect(screen.getByDisplayValue('Fila cobrança')).toBeTruthy();
  });
});
