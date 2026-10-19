import { tituloCreateSchema, tituloUpdateSchema, titulosBulkCreateSchema } from './index';
import { formatDateOnly } from '../../utils/timezoneUtils';

const hoje = formatDateOnly(new Date()) || '2099-01-01';
const ontem = (() => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return formatDateOnly(d) || '2000-01-01';
})();
const amanha = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return formatDateOnly(d) || '2099-01-02';
})();

const tituloValido = {
  cliente_id: 10,
  contrato_id: 20,
  plano_id: 30,
  data_vencimento: amanha,
};

describe('tituloCreateSchema', () => {
  it('aceita cadastro de título', () => {
    const { error, value } = tituloCreateSchema.validate(tituloValido);
    expect(error).toBeUndefined();
    expect(value.status).toBe('pendente');
    expect(value.pago).toBe(false);
  });

  it('aceita vencimento igual a hoje', () => {
    const { error } = tituloCreateSchema.validate({ ...tituloValido, data_vencimento: hoje });
    expect(error).toBeUndefined();
  });

  it('recusa cadastro sem data de vencimento', () => {
    const { data_vencimento: _omit, ...semData } = tituloValido;
    const { error } = tituloCreateSchema.validate(semData, { abortEarly: false });
    expect(error?.details.some((item) => item.path.join('.') === 'data_vencimento')).toBe(true);
  });

  it('recusa vencimento anterior a hoje', () => {
    const { error } = tituloCreateSchema.validate(
      { ...tituloValido, data_vencimento: ontem },
      { abortEarly: false }
    );
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

  it('aceita descrição e descontos na edição', () => {
    const { error, value } = tituloUpdateSchema.validate({
      descricao: 'Mensalidade',
      desconto_percentual: 5,
      desconto_valor: 10,
      acrescimo_percentual: 0,
      acrescimo_valor: 2,
      observacoes: 'ok',
    });
    expect(error).toBeUndefined();
    expect(value.descricao).toBe('Mensalidade');
    expect(value.desconto_percentual).toBe(5);
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
