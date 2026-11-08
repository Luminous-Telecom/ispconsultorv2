import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from 'contexts/I18nContext';
import { NotificationProvider } from 'components/notifications/NotificationProvider';
import { IndicadoresCobranca } from 'services/cobrancaPainelService';
import { useCobrancaIndicadores } from 'hooks/useCobrancaPainel';
import DashboardCobrancaSection from './DashboardCobrancaSection';

jest.mock('hooks/useCobrancaPainel', () => ({
  useCobrancaIndicadores: jest.fn(),
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

function renderSection() {
  localStorage.setItem('app-language', 'pt-BR');
  return render(
    <I18nProvider>
      <NotificationProvider>
        <DashboardCobrancaSection />
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
});

it('mostra a inadimplência e o dia de vencimento no dashboard', () => {
  renderSection();
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
  renderSection();
  expect(screen.queryByText('50,0%')).toBeNull();
});
