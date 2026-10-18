import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from 'contexts/I18nContext';
import { TituloService } from 'services/tituloService';
import TituloModalHeader from './TituloModalHeader';

jest.mock('services/tituloService', () => ({
  TituloService: {
    enviarWhatsApp: jest.fn(),
    enviarEmail: jest.fn(),
    enviarRecibo: jest.fn(),
  },
}));

jest.mock('components/notifications/NotificationProvider', () => ({
  useNotificationContext: () => ({ success: jest.fn() }),
}));

jest.mock('hooks/useApiError', () => ({
  useApiError: () => ({ showApiError: jest.fn() }),
}));

const enviarRecibo = TituloService.enviarRecibo as jest.Mock;

function renderHeader(tituloStatus: string) {
  localStorage.setItem('app-language', 'pt-BR');
  return render(
    <I18nProvider>
      <TituloModalHeader
        isEditMode
        internalTituloId={15}
        isPending={false}
        tituloStatus={tituloStatus}
        sendLabel="Enviar"
        sendViaWhatsAppLabel="Via WhatsApp"
        sendViaEmailLabel="Via Email"
        sendReceiptLabel="Recibo"
        sendSuccessMessage="Enviado"
        onClose={jest.fn()}
      />
    </I18nProvider>
  );
}

function openSendDropdown() {
  fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
}

it('desabilita Recibo quando o título não está pago', () => {
  renderHeader('pendente');
  openSendDropdown();
  expect((screen.getByRole('menuitem', { name: 'Recibo' }) as HTMLButtonElement).disabled).toBe(true);
});

it('envia o recibo quando o título está pago', async () => {
  enviarRecibo.mockResolvedValue({ success: true, message: 'Recibo enviado com sucesso' });
  renderHeader('pago');
  openSendDropdown();

  const botao = screen.getByRole('menuitem', { name: 'Recibo' }) as HTMLButtonElement;
  expect(botao.disabled).toBe(false);
  fireEvent.click(botao);

  await waitFor(() => {
    expect(enviarRecibo).toHaveBeenCalledWith(15);
  });
});
