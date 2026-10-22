import { buildErpDashboardStatsGraficos } from './dashboardGraficosStats';

function statsDe(
  titulos: Array<{ status: string; data_vencimento: string }>
) {
  return buildErpDashboardStatsGraficos({
    clientesTodos: [],
    clientesPeriodo: [],
    planos: [],
    contratosTodos: [],
    titulosTodos: titulos,
    contratosEmAtraso: 0,
    contratosAtivosDashboard: 0,
    contratosParaPlano: [],
    receitaUltimosMeses: { labels: [], data: [] },
    aReceberPeriodo: { labels: [], data: [] },
  });
}

describe('statusPagamentoMesAtual', () => {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');
  const nesteMes = `${ano}-${mes}-10`;
  const outroMes = `${ano - 1}-01-10`;

  it('separa o mês corrente do total de todos os títulos', () => {
    const stats = statsDe([
      { status: 'pago', data_vencimento: nesteMes },
      { status: 'pago', data_vencimento: outroMes },
      { status: 'cancelado', data_vencimento: nesteMes },
      { status: 'vencido', data_vencimento: nesteMes },
      { status: 'pendente', data_vencimento: `${ano}-${mes}-${dia}` },
    ]);

    expect(stats.statusPagamento).toEqual({
      pagos: 2,
      pendentes: 1,
      vencidos: 1,
      cancelados: 1,
    });
    expect(stats.statusPagamentoMesAtual).toEqual({
      pagos: 1,
      pendentes: 1,
      vencidos: 1,
      cancelados: 1,
    });
  });

  it('mês sem títulos fica zerado e o total permanece', () => {
    const stats = statsDe([{ status: 'pago', data_vencimento: outroMes }]);

    expect(stats.statusPagamento.pagos).toBe(1);
    expect(stats.statusPagamentoMesAtual).toEqual({
      pagos: 0,
      pendentes: 0,
      vencidos: 0,
      cancelados: 0,
    });
  });
});
