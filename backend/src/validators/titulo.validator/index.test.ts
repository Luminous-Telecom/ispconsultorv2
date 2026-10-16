import { tituloCreateSchema, tituloUpdateSchema, titulosBulkCreateSchema } from './index';

const tituloValido = {
  cliente_id: 10,
  contrato_id: 20,
  plano_id: 30,
  data_vencimento: '2026-03-10',
};

describe('tituloCreateSchema', () => {
  it('aceita cadastro de título', () => {
    const { error, value } = tituloCreateSchema.validate(tituloValido);
    expect(error).toBeUndefined();
    expect(value.status).toBe('pendente');
    expect(value.pago).toBe(false);
  });

  it('recusa cadastro sem data de vencimento', () => {
    const { data_vencimento: _omit, ...semData } = tituloValido;
    const { error } = tituloCreateSchema.validate(semData, { abortEarly: false });
    expect(error?.details.some((item) => item.path.join('.') === 'data_vencimento')).toBe(true);
  });

  it('recusa valor negativo', () => {
    const { error } = tituloCreateSchema.validate({ ...tituloValido, valor: -1 });
    expect(error?.details[0]?.path).toEqual(['valor']);
  });
});

describe('tituloUpdateSchema', () => {
  it('aceita edição parcial de valor pago', () => {
    const { error, value } = tituloUpdateSchema.validate({ valor_pago: 15.5, status: 'parcial' });
    expect(error).toBeUndefined();
    expect(value.status).toBe('parcial');
  });

  it('recusa status desconhecido', () => {
    const { error } = tituloUpdateSchema.validate({ status: 'estornado' });
    expect(error).toBeDefined();
  });
});

describe('titulosBulkCreateSchema', () => {
  it('aceita lote com um título válido', () => {
    const { error } = titulosBulkCreateSchema.validate({ titulos: [tituloValido] });
    expect(error).toBeUndefined();
  });

  it('recusa lote vazio', () => {
    const { error } = titulosBulkCreateSchema.validate({ titulos: [] });
    expect(error?.details[0]?.path).toEqual(['titulos']);
  });
});
