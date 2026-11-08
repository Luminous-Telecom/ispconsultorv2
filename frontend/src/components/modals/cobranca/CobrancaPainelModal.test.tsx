import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from 'contexts/I18nContext';
import { NotificationProvider } from 'components/notifications/NotificationProvider';
import { IndicadoresCobranca } from 'services/cobrancaPainelService';
import CobrancaPainelModal from './CobrancaPainelModal';
import { useCobrancaAgenda, useCobrancaIndicadores } from 'hooks/useCobrancaPainel';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

jest.mock('hooks/useCobrancaPainel', () => ({
  useCobrancaIndicadores: jest.fn(),
  useCobrancaAgenda: jest.fn(),
}));

const indicadores: IndicadoresCobranca = {
  mes: '2026-11',
  inadimplencia_mes: { percentual: 51.2, valor_aberto: 110, valor_base: 215 },
  inadimplencia_estoque: { percentual: 50, valor_aberto: 150, valor_base: 300 },
  clientes: { inadimplentes: 2, com_contrato_ativo: 10, percentual: 20 },
  atraso_medio_dias: 12,
  valor_em_atraso: 150,
  faixas: [{ faixa: '1_15', titulos: 1, clientes: 1, valor: 30 }],
  melhores_datas: [{ dia: 10, titulos: 12, percentual_no_prazo: 90, percentual_ate_5_dias: 100, atraso_medio_dias: 0.2, abaixo_do_minimo: false }],
  melhor_dia: 10,
  volume_minimo: 10,
};

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
  (useCobrancaIndicadores as jest.Mock).mockReturnValue({
    data: { data: indicadores },
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: jest.fn(),
  });
  (useCobrancaAgenda as jest.Mock).mockReturnValue({
    data: { data: { itens: [], pagination: { current_page: 1, per_page: 15, total: 0, last_page: 0, from: 0, to: 0 }, passos: [], sem_passos: true } },
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: jest.fn(),
  });
});

it('mostra a inadimplência e o dia de vencimento em destaque', () => {
  renderModal();
  expect(screen.getByText('50,0%')).toBeTruthy();
  expect(screen.getAllByText('Melhor').length).toBeGreaterThan(0);
  expect(screen.getByText('1 a 15 dias')).toBeTruthy();
});

it('mostra o carregamento dos indicadores', () => {
  (useCobrancaIndicadores as jest.Mock).mockReturnValue({
    data: undefined,
    isLoading: true,
    isFetching: true,
    error: null,
    refetch: jest.fn(),
  });
  renderModal();
  expect(screen.queryByText('50,0%')).toBeNull();
});

it('abre a agenda e avisa quando não há passo ativo', () => {
  renderModal();
  fireEvent.click(screen.getByRole('button', { name: 'Agenda' }));
  expect(screen.getByText('Nenhuma mensagem de cobrança está ativa. Ative os avisos no servidor de e-mail ou de WhatsApp.')).toBeTruthy();
  expect(screen.getByText('Nenhum aviso neste período.')).toBeTruthy();
});
