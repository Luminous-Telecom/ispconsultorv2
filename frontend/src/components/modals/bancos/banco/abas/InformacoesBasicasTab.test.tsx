import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import InformacoesBasicasTab from './InformacoesBasicasTab';
import type { BancoForm } from '../types';
import { ServidorEmailService } from 'services/servidorEmailService';
import { ServidorWhatsAppService } from 'services/servidorWhatsAppService';

jest.mock('contexts/I18nContext', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

jest.mock('components/notifications/NotificationProvider', () => ({
  useNotificationContext: () => ({ success: jest.fn(), error: jest.fn() }),
}));

jest.mock('hooks/useApiError', () => ({
  useApiError: () => ({ showApiError: jest.fn() }),
}));

const emailLista = {
  success: true,
  data: [{ id: 3, descricao: 'SMTP principal', host: 'smtp.exemplo.com', email_remetente: 'a@b.com', ativo: true, padrao: true }],
  message: '',
};

const whatsappLista = {
  success: true,
  data: [{ id: 8, descricao: 'WhatsApp cobrança', instance_name: 'cobranca', ativo: true, tipo_api: 'evolution' as const, padrao: false }],
  message: '',
};

const formData = {
  nome: 'EFI',
  codigo: '364',
  descricao: '',
  ativo: true,
  tipo_banco: 'efi',
  servidor_email_cobranca_id: 3,
  servidor_whatsapp_cobranca_id: null,
} as BancoForm;

function renderTab() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const handleInputChange = jest.fn();
  render(
    <QueryClientProvider client={client}>
      <InformacoesBasicasTab
        formData={formData}
        errors={{}}
        handleInputChange={handleInputChange}
        isPending={false}
        formPrefix="banco"
        renderBancoEspecificoCampos={() => null}
      />
    </QueryClientProvider>
  );
  return { handleInputChange };
}

describe('InformacoesBasicasTab', () => {
  beforeEach(() => {
    jest.spyOn(ServidorEmailService, 'list').mockResolvedValue(emailLista);
    jest.spyOn(ServidorEmailService, 'getById').mockResolvedValue({ success: true, data: emailLista.data[0], message: '' });
    jest.spyOn(ServidorWhatsAppService, 'list').mockResolvedValue(whatsappLista);
    jest.spyOn(ServidorWhatsAppService, 'getById').mockResolvedValue({ success: true, data: whatsappLista.data[0], message: '' });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('escolhe o servidor pelo id e abre a listagem com Inserir', async () => {
    const { handleInputChange } = renderTab();

    expect(screen.queryByRole('combobox', { name: 'form.billingEmailServer' })).toBeNull();
    expect(await screen.findByDisplayValue('SMTP principal')).toBeTruthy();

    const idEmail = screen.getByDisplayValue('3');
    fireEvent.change(idEmail, { target: { value: '9' } });
    expect(handleInputChange).toHaveBeenCalledWith('servidor_email_cobranca_id', 9);

    const listagens = screen.getAllByRole('button', { name: 'Abrir listagem de registros' });
    fireEvent.click(listagens[0]);
    fireEvent.click(await screen.findByText('SMTP principal'));
    fireEvent.click(screen.getByRole('button', { name: 'actions.insert' }));
    expect(handleInputChange).toHaveBeenCalledWith('servidor_email_cobranca_id', 3);
  });
});
