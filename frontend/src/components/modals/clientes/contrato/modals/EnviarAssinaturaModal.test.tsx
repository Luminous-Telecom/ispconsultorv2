import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nProvider } from 'contexts/I18nContext';
import { NotificationProvider } from 'components/notifications/NotificationProvider';
import type { TermoContrato } from 'services/termoContratoService';
import EnviarAssinaturaModal from './EnviarAssinaturaModal';

jest.mock('components/common/DraggableModal', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('services/assinaturaDigitalService', () => ({
  AssinaturaDigitalService: { enviar: jest.fn() },
}));

function renderModal() {
  localStorage.setItem('app-language', 'pt-BR');
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const termo = {
    id: 15,
    modelo_documento_id: 3,
    modeloDocumento: { id: 3, nome: 'Adesão', tipo: 'adesao' },
  } as TermoContrato;

  return render(
    <QueryClientProvider client={client}>
      <I18nProvider>
        <NotificationProvider>
          <EnviarAssinaturaModal show onClose={jest.fn()} termo={termo} />
        </NotificationProvider>
      </I18nProvider>
    </QueryClientProvider>,
  );
}

it('mostra o termo com edição do modelo e sem troca do vínculo', () => {
  renderModal();
  const termo = screen.getByLabelText('Termo') as HTMLInputElement;
  expect(termo.value).toBe('15');
  expect(termo.readOnly).toBe(true);
  expect(screen.getByDisplayValue('Adesão')).toBeTruthy();
  expect((screen.getByRole('button', { name: 'Editar registro' }) as HTMLButtonElement).disabled).toBe(false);
  expect((screen.getByRole('button', { name: 'Abrir listagem de registros' }) as HTMLButtonElement).disabled).toBe(true);
});
