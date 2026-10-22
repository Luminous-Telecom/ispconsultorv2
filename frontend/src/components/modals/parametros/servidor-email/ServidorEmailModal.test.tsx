import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ServidorEmailModal from './ServidorEmailModal';
import type { MensagemEmail } from 'services/servidorEmailService';

const mockGetMensagemByTipo = jest.fn();

jest.mock('services/servidorEmailService', () => ({
  ServidorEmailService: {
    getMensagemByTipo: (...args: unknown[]) => mockGetMensagemByTipo(...args),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    saveMensagem: jest.fn(),
    sendTestEmail: jest.fn(),
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

jest.mock('components/common/ModalRichTextEditor', () => ({
  __esModule: true,
  default: ({ value, editorKey }: { value?: string; editorKey?: string }) => (
    <textarea data-testid="mensagem-editor" data-editor-key={editorKey} readOnly value={value ?? ''} />
  ),
}));

function mensagem(tipo: string, texto: string, id: number): MensagemEmail {
  return {
    id,
    tipo,
    tipo_envio: 'pdf',
    mensagem_padrao: texto,
    ativo: true,
    updated_at: '2026-10-22T12:00:00.000Z',
  };
}

function renderModal() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ServidorEmailModal show onClose={jest.fn()} />
    </QueryClientProvider>
  );
}

describe('ServidorEmailModal mensagens', () => {
  beforeEach(() => {
    (global as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    mockGetMensagemByTipo.mockReset();
    mockGetMensagemByTipo.mockImplementation(async (tipo: string) => {
      if (tipo === '10_dias_antes_vencimento') {
        return mensagem(tipo, '<p>dez dias</p>', 1);
      }
      if (tipo === 'mesmo_dia_vencimento') {
        return mensagem(tipo, '<p>mesmo dia</p>', 2);
      }
      return null;
    });
  });

  it('troca o texto ao mudar o tipo e não reaproveita a mensagem anterior', async () => {
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'whatsappServer.messages' }));

    const editor = () => screen.getByTestId('mensagem-editor') as HTMLTextAreaElement;

    await waitFor(() => {
      expect(editor().value).toBe('<p>dez dias</p>');
    });

    fireEvent.change(screen.getByLabelText(/settings\.messages\.type/), {
      target: { value: 'mesmo_dia_vencimento' },
    });

    await waitFor(() => {
      expect(editor().value).toBe('<p>mesmo dia</p>');
    });

    fireEvent.change(screen.getByLabelText(/settings\.messages\.type/), {
      target: { value: '05_dias_antes_vencimento' },
    });

    await waitFor(() => {
      expect(editor().value).toBe('<p></p>');
    });
  });
});
