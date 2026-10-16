import { contaPagarCreateSchema, contaPagarPagamentoSchema, contaPagarUpdateSchema } from './index';

const contaValida = {
  fornecedor_id: 7,
  data_vencimento: '2026-04-01',
  valor: 150.25,
};

describe('contaPagarCreateSchema', () => {
  it('aceita cadastro e aplica PIX e A_PAGAR', () => {
    const { error, value } = contaPagarCreateSchema.validate(contaValida);
    expect(error).toBeUndefined();
    expect(value.tipo_pagamento).toBe('PIX');
    expect(value.status).toBe('A_PAGAR');
  });

  it('recusa cadastro sem fornecedor', () => {
    const { fornecedor_id: _omit, ...semFornecedor } = contaValida;
    const { error } = contaPagarCreateSchema.validate(semFornecedor, { abortEarly: false });
    expect(error?.details.some((item) => item.path.join('.') === 'fornecedor_id')).toBe(true);
  });

  it('aceita lote com data inicial e final, sem vencimento único', () => {
    const { error } = contaPagarCreateSchema.validate({
      fornecedor_id: 7,
      valor: 10,
      data_vencimento_inicial: '2026-01-01',
      data_vencimento_final: '2026-03-01',
    });
    expect(error).toBeUndefined();
  });
});

describe('contaPagarUpdateSchema', () => {
  it('aceita edição só do status', () => {
    const { error, value } = contaPagarUpdateSchema.validate({ status: 'CANCELADO' });
    expect(error).toBeUndefined();
    expect(value.status).toBe('CANCELADO');
  });

  it('recusa valor zero', () => {
    const { error } = contaPagarUpdateSchema.validate({ valor: 0 });
    expect(error).toBeDefined();
  });
});

describe('contaPagarPagamentoSchema', () => {
  it('aceita pagamento', () => {
    const { error, value } = contaPagarPagamentoSchema.validate({
      data: '2026-04-02',
      valor: 150.25,
      tipo_pagamento: 'PIX',
    });
    expect(error).toBeUndefined();
    expect(value.valor).toBe(150.25);
  });

  it('recusa pagamento sem valor', () => {
    const { error } = contaPagarPagamentoSchema.validate({ tipo_pagamento: 'DINHEIRO' });
    expect(error?.details.some((item) => item.path.join('.') === 'valor')).toBe(true);
  });
});
