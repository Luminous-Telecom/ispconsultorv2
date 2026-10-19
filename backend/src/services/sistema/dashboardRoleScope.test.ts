import { scopeDashboardPayload } from './dashboardRoleScope';

const payload = {
  stats: { totalClientes: 4, valorTotalReceber: 80 },
  clientesTodos: [{ id: 1 }],
  titulosTodos: [{ id: 9 }],
  backupStatusGrafico: [{ falha: 1 }],
  contratosAtivosDashboard: 3,
  statsGraficos: {
    clientes: { totalClientes: 4, clientesAtivos: 3, clientesInativos: 1, clientesAtivosPeriodo: 1 },
    planos: { totalPlanos: 2, planosAtivos: 2, planosInativos: 0 },
    contratos: {
      contratosAtivos: 3,
      contratosInativos: 0,
      contratosSuspensos: 0,
      contratosIsentos: 0,
      contratosEmAtraso: 1,
    },
    titulos: { totalTitulosTodos: 5, taxaPagamento: 50 },
    statusPagamento: { pagos: 1, pendentes: 1, vencidos: 1, cancelados: 0 },
    crescimentoClientes: [{ mes: '01/26', valor: 1, data_inicio: '', data_fim: '' }],
    clientesPorPlano: [{ plano_id: 1, nome_plano: 'A', value: 1 }],
    totais: {
      totalRecebidosPeriodo: 10,
      totalReceberPeriodo: 20,
      totalReceitaMensal: 30,
      totalNovosClientes: 2,
    },
    series: {
      receitaMensal: [{ mes: '01/26', valor: 30, data_inicio: '', data_fim: '' }],
      recebidosPeriodo: [],
      receberPeriodo: [],
      contasReceberPagar: [],
    },
  },
};

describe('scopeDashboardPayload', () => {
  it('financeiro recebe clientes, contratos e pagamentos, sem backup nem crescimento', () => {
    const scoped = scopeDashboardPayload('financeiro', payload);

    expect(scoped.titulosTodos).toEqual(payload.titulosTodos);
    expect(scoped.clientesTodos).toEqual(payload.clientesTodos);
    expect(scoped.contratosAtivosDashboard).toBe(3);
    expect(scoped.statsGraficos?.totais.totalReceitaMensal).toBe(30);
    expect(scoped.statsGraficos?.clientes.clientesAtivos).toBe(3);
    expect(scoped.statsGraficos?.statusPagamento.pagos).toBe(1);
    expect(scoped.backupStatusGrafico).toEqual([]);
    expect(scoped.statsGraficos?.crescimentoClientes).toEqual([]);
    expect(scoped.statsGraficos?.clientesPorPlano).toEqual([]);
  });

  it('usuário não recebe títulos nem valores financeiros', () => {
    const scoped = scopeDashboardPayload('user', payload);

    expect(scoped.clientesTodos).toEqual(payload.clientesTodos);
    expect(scoped.titulosTodos).toEqual([]);
    expect(scoped.statsGraficos?.series.receitaMensal).toEqual([]);
    expect(scoped.statsGraficos?.totais.totalReceitaMensal).toBe(0);
    expect(scoped.statsGraficos?.totais.totalNovosClientes).toBe(2);
    expect(scoped.stats?.valorTotalReceber).toBe(0);
  });

  it('administrador recebe o payload inteiro', () => {
    expect(scopeDashboardPayload('admin', payload)).toBe(payload);
  });
});