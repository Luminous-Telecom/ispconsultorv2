import { calcularIndicadoresCobranca, TituloCalculo } from './calcularIndicadoresCobranca';

const hoje = '2026-11-07';

function titulo(parcial: Partial<TituloCalculo> & Pick<TituloCalculo, 'clienteId' | 'status' | 'valor' | 'dataVencimento'>): TituloCalculo {
  return {
    pago: false,
    valorAberto: null,
    dataPagamento: null,
    ...parcial,
  };
}

describe('calcularIndicadoresCobranca', () => {
  it('mede o em aberto do mês e deixa pago com atraso e cancelado fora do numerador', () => {
    const stats = calcularIndicadoresCobranca({
      mes: '2026-11',
      hoje,
      doMes: [
        titulo({ clienteId: 1, status: 'pendente', valor: 100, dataVencimento: '2026-11-20' }),
        titulo({ clienteId: 2, status: 'pago', pago: true, valor: 50, dataVencimento: '2026-11-05', dataPagamento: '2026-11-05' }),
        titulo({ clienteId: 3, status: 'pago_atraso', pago: true, valor: 25, dataVencimento: '2026-11-02', dataPagamento: '2026-11-08' }),
        titulo({ clienteId: 4, status: 'cancelado', valor: 999, dataVencimento: '2026-11-10' }),
        titulo({ clienteId: 5, status: 'vencido', valor: 40, valorAberto: 10, dataVencimento: '2026-11-01' }),
      ],
      emAtraso: [],
      valorBaseVencido: 0,
      pagos: [],
      clientesComContratoAtivo: 4,
    });

    expect(stats.inadimplencia_mes.valor_base).toBe(215);
    expect(stats.inadimplencia_mes.valor_aberto).toBe(110);
    expect(stats.inadimplencia_mes.percentual).toBe(51.2);
  });

  it('separa a inadimplência do que já venceu e agrupa o atraso', () => {
    const stats = calcularIndicadoresCobranca({
      mes: '2026-11',
      hoje,
      doMes: [],
      emAtraso: [
        titulo({ clienteId: 1, status: 'vencido', valor: 30, dataVencimento: '2026-11-01' }),
        titulo({ clienteId: 1, status: 'pendente', valor: 20, dataVencimento: '2026-10-18' }),
        titulo({ clienteId: 2, status: 'vencido', valor: 100, dataVencimento: '2026-07-01' }),
      ],
      valorBaseVencido: 300,
      pagos: [],
      clientesComContratoAtivo: 10,
    });

    expect(stats.inadimplencia_estoque.valor_aberto).toBe(150);
    expect(stats.inadimplencia_estoque.valor_base).toBe(300);
    expect(stats.inadimplencia_estoque.percentual).toBe(50);
    expect(stats.clientes).toEqual({ inadimplentes: 2, com_contrato_ativo: 10, percentual: 20 });
    expect(stats.faixas.find((faixa) => faixa.faixa === '1_15')).toMatchObject({ titulos: 1, clientes: 1, valor: 30 });
    expect(stats.faixas.find((faixa) => faixa.faixa === '16_30')).toMatchObject({ titulos: 1, valor: 20 });
    expect(stats.faixas.find((faixa) => faixa.faixa === '91_mais')).toMatchObject({ titulos: 1, valor: 100 });
    expect(stats.atraso_medio_dias).toBeGreaterThan(0);
    expect(stats.faixas).toHaveLength(5);
  });

  it('escolhe o dia com maior percentual no prazo só quando há volume', () => {
    const pagosDia5 = Array.from({ length: 3 }, (_, indice) =>
      titulo({
        clienteId: indice + 1,
        status: 'pago',
        pago: true,
        valor: 10,
        dataVencimento: '2026-08-05',
        dataPagamento: '2026-08-05',
      })
    );
    const pagosDia10 = Array.from({ length: 10 }, (_, indice) =>
      titulo({
        clienteId: indice + 20,
        status: indice < 9 ? 'pago' : 'pago_atraso',
        pago: true,
        valor: 10,
        dataVencimento: '2026-09-10',
        dataPagamento: indice < 9 ? '2026-09-10' : '2026-09-12',
      })
    );

    const stats = calcularIndicadoresCobranca({
      mes: '2026-11',
      hoje,
      doMes: [],
      emAtraso: [],
      valorBaseVencido: 0,
      pagos: [...pagosDia5, ...pagosDia10],
      clientesComContratoAtivo: 0,
    });

    expect(stats.melhor_dia).toBe(10);
    const dia5 = stats.melhores_datas.find((dia) => dia.dia === 5);
    const dia10 = stats.melhores_datas.find((dia) => dia.dia === 10);
    expect(dia5?.abaixo_do_minimo).toBe(true);
    expect(dia5?.percentual_no_prazo).toBe(100);
    expect(dia10).toMatchObject({ percentual_no_prazo: 90, percentual_ate_5_dias: 100, abaixo_do_minimo: false });
  });

  it('não indica dia quando ninguém pagou', () => {
    const stats = calcularIndicadoresCobranca({
      mes: '2026-11',
      hoje,
      doMes: [],
      emAtraso: [],
      valorBaseVencido: 0,
      pagos: [],
      clientesComContratoAtivo: 0,
    });
    expect(stats.melhor_dia).toBeNull();
    expect(stats.melhores_datas).toEqual([]);
    expect(stats.inadimplencia_mes.percentual).toBe(0);
    expect(stats.clientes.percentual).toBe(0);
  });
});
