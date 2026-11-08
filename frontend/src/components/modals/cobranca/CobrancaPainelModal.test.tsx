import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from 'contexts/I18nContext';
import { NotificationProvider } from 'components/notifications/NotificationProvider';
import CobrancaPainelModal from './CobrancaPainelModal';
import { useCobrancaAgenda } from 'hooks/useCobrancaPainel';

jest.mock('hooks/useCobrancaPainel', () => ({
  useCobrancaAgenda: jest.fn(),
}));

function renderModal() {
  localStorage.setItem('app-language', 'pt-BR');
  return render(
    <I18nProvider>
      <NotificationProvider>
        <CobrancaPainelModal show onClose={jest.fn()} />
      </NotificationProvider>
    </I18nProvider>
  );
}

beforeEach(() => {
  (useCobrancaAgenda as jest.Mock).mockReturnValue({
    data: { data: { itens: [], pagination: { current_page: 1, per_page: 15, total: 0, last_page: 0, from: 0, to: 0 }, passos: [], sem_passos: true } },
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: jest.fn(),
  });
});

it('avisa quando não há passo ativo', () => {
  renderModal();
  expect(screen.getByText('Nenhuma mensagem de cobrança está ativa. Ative os avisos no servidor de e-mail ou de WhatsApp.')).toBeTruthy();
  expect(screen.getByText('Nenhum aviso neste período.')).toBeTruthy();
});

it('mostra o carregamento da agenda', () => {
  (useCobrancaAgenda as jest.Mock).mockReturnValue({
    data: undefined,
    isLoading: true,
    isFetching: true,
    error: null,
    refetch: jest.fn(),
  });
  renderModal();
  expect(screen.queryByText('Nenhum aviso neste período.')).toBeNull();
});
