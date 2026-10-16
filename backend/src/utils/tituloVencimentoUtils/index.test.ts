import {
  buildTituloPagamentoUpdate,
  getTituloStatusExibicao,
  isTituloEmAbertoAtrasado,
  isTituloPagoEmAtraso,
  resolveStatusPagamentoTitulo,
} from './index';

const hoje = new Date(2026, 5, 15);

describe('título — vencimento e pagamento', () => {
  it('marca pendente vencido e não marca título pago como atrasado em aberto', () => {
    expect(isTituloEmAbertoAtrasado({ status: 'pendente', data_vencimento: '2026-06-01' }, hoje)).toBe(true);
    expect(isTituloEmAbertoAtrasado({ status: 'pendente', data_vencimento: '2026-06-20' }, hoje)).toBe(false);
    expect(isTituloEmAbertoAtrasado({ status: 'pago', data_vencimento: '2026-01-01' }, hoje)).toBe(false);
    expect(isTituloEmAbertoAtrasado({ status: 'vencido', data_vencimento: '2026-12-01' }, hoje)).toBe(true);
  });

  it('resolve parcial, pago e pago em atraso', () => {
    expect(resolveStatusPagamentoTitulo('2026-06-10', '2026-06-10', 50, 100)).toBe('parcial');
    expect(resolveStatusPagamentoTitulo('2026-06-10', '2026-06-10', 100, 100)).toBe('pago');
    expect(resolveStatusPagamentoTitulo('2026-06-10', '2026-06-12', 100, 100)).toBe('pago_atraso');
  });

  it('monta a atualização do recebimento e a exibição', () => {
    const parcial = buildTituloPagamentoUpdate({
      dataVencimento: '2026-06-10',
      dataPagamento: new Date(2026, 5, 10),
      valorPago: 40,
      valorTotal: 100,
    });
    expect(parcial).toMatchObject({ pago: false, status: 'parcial', valor_aberto: 60, valor_pago: 40 });

    expect(isTituloPagoEmAtraso({
      status: 'pago',
      data_vencimento: '2026-06-01',
      data_pagamento: '2026-06-05',
    })).toBe(true);

    expect(getTituloStatusExibicao({
      status: 'pendente',
      data_vencimento: '2026-06-01',
    }, hoje)).toBe('vencido');
  });
});
