import {
  buildDashboardPaymentStatusSliceFilters,
  countStatusPagamento,
  isVencimentoNoMesAtual,
} from './dashboardPaymentStatus';

const outubro = new Date(2026, 9, 21);

describe('status de pagamento do mês atual', () => {
  it('reconhece vencimento no mês calendário e ignora o mês anterior', () => {
    expect(isVencimentoNoMesAtual('2026-10-01', outubro)).toBe(true);
    expect(isVencimentoNoMesAtual('2026-10-31T00:00:00.000Z', outubro)).toBe(true);
    expect(isVencimentoNoMesAtual('2026-09-30', outubro)).toBe(false);
    expect(isVencimentoNoMesAtual(null, outubro)).toBe(false);
  });

  it('conta só os títulos do mês quando a lista já foi filtrada', () => {
    const titulos = [
      { status: 'pago', data_vencimento: '2026-10-05' },
      { status: 'pago', data_vencimento: '2026-08-05' },
      { status: 'pendente', data_vencimento: '2026-10-21' },
      { status: 'pendente', data_vencimento: '2026-10-01' },
      { status: 'cancelado', data_vencimento: '2026-10-12' },
    ];
    const doMes = titulos.filter((titulo) => isVencimentoNoMesAtual(titulo.data_vencimento, outubro));

    expect(countStatusPagamento(doMes, outubro)).toEqual({
      pagos: 1,
      pendentes: 1,
      vencidos: 1,
      cancelados: 1,
    });
    expect(countStatusPagamento(titulos, outubro).pagos).toBe(2);
  });

  it('o clique do mês atual restringe o vencimento ao mês e o de todos não', () => {
    expect(
      buildDashboardPaymentStatusSliceFilters('pago,pago_atraso,parcial', {
        mesAtual: true,
        refDate: outubro,
      })
    ).toEqual({
      status: 'pago,pago_atraso,parcial',
      data_vencimento_inicio: '2026-10-01',
      data_vencimento_fim: '2026-10-31',
    });

    expect(
      buildDashboardPaymentStatusSliceFilters('pendente', { mesAtual: true, refDate: outubro })
    ).toEqual({
      status: 'pendente',
      data_vencimento_inicio: '2026-10-21',
      data_vencimento_fim: '2026-10-31',
    });

    expect(buildDashboardPaymentStatusSliceFilters('atraso', { mesAtual: true, refDate: outubro })).toEqual({
      status: 'pendente,vencido',
      data_vencimento_inicio: '2026-10-01',
      data_vencimento_fim: '2026-10-20',
    });

    expect(buildDashboardPaymentStatusSliceFilters('pago,pago_atraso,parcial')).toEqual({
      status: 'pago,pago_atraso,parcial',
    });
  });
});
