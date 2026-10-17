import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nProvider } from 'contexts/I18nContext';
import { NotificationProvider } from 'components/notifications/NotificationProvider';
import AtualizacoesModal from './AtualizacoesModal';
import { apiService } from 'services/api';

jest.mock('services/api', () => ({
  apiService: {
    get: jest.fn(),
  },
}));

const atualizacao = {
  versao: '1.2.0',
  data: '2026-01-15',
  descricao: 'Correção de listagem',
  tipo: 'bugfix' as const,
  itens: ['Correção de listagem'],
};

function renderModal() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  function Harness() {
    const [actions, setActions] = useState<React.ReactNode>(null);
    return (
      <QueryClientProvider client={client}>
        <I18nProvider>
          <NotificationProvider>
            <div>{actions}</div>
            <AtualizacoesModal show onClose={jest.fn()} onHeaderActionsReady={setActions} />
          </NotificationProvider>
        </I18nProvider>
      </QueryClientProvider>
    );
  }

  return render(<Harness />);
}

describe('AtualizacoesModal', () => {
  beforeEach(() => {
    localStorage.setItem('app-language', 'pt-BR');
    (apiService.get as jest.Mock).mockReset();
  });

  it('mostra Atualizar Sistema quando há versão e não oferece atualizar documentação', async () => {
    (apiService.get as jest.Mock).mockResolvedValue({
      success: true,
      data: { data: [atualizacao], versao_atual: '1.0.0' },
    });

    renderModal();

    const atualizar = await screen.findByRole('button', { name: 'Atualizar Sistema' });
    expect((atualizar as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByRole('button', { name: 'Atualizar Documentação' })).toBeNull();
    expect(screen.getByText('v1.2.0')).toBeTruthy();
  });

  it('lista vazia não quebra e não mostra atualização de documentação', async () => {
    (apiService.get as jest.Mock).mockResolvedValue({
      success: true,
      data: { data: [], versao_atual: '1.0.0' },
    });

    renderModal();

    expect(await screen.findByText('Nenhuma atualização disponível')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Atualizar Sistema' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Atualizar Documentação' })).toBeNull();
    expect((screen.getByRole('button', { name: 'Fechar' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('mostra o erro quando a busca falha', async () => {
    (apiService.get as jest.Mock).mockRejectedValue(new Error('Falha na rede'));

    renderModal();

    expect(await screen.findByText('Erro ao buscar atualizações')).toBeTruthy();
    expect(await screen.findByText('Falha na rede')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Atualizar Documentação' })).toBeNull();
  });
});
