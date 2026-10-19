import { describe, expect, it } from '@jest/globals';
import { addDays, getTodayISO } from '../utils/dateUtils';
import {
  createTituloSchema,
  isDataVencimentoNaoAnteriorAHoje,
  tituloSchema,
  updateTituloSchema,
} from './titulo.schema';

const tituloBase = {
  plano_id: 1,
  data_vencimento: addDays(getTodayISO(), 1),
  status: 'pendente' as const,
  pago: false,
};

describe('isDataVencimentoNaoAnteriorAHoje', () => {
  it('aceita hoje e datas futuras', () => {
    expect(isDataVencimentoNaoAnteriorAHoje(getTodayISO())).toBe(true);
    expect(isDataVencimentoNaoAnteriorAHoje(addDays(getTodayISO(), 5))).toBe(true);
  });

  it('recusa datas anteriores a hoje', () => {
    expect(isDataVencimentoNaoAnteriorAHoje(addDays(getTodayISO(), -1))).toBe(false);
  });
});

describe('createTituloSchema', () => {
  it('aceita cadastro com vencimento futuro', () => {
    const result = createTituloSchema.safeParse(tituloBase);
    expect(result.success).toBe(true);
  });

  it('aceita vencimento igual a hoje', () => {
    const result = createTituloSchema.safeParse({
      ...tituloBase,
      data_vencimento: getTodayISO(),
    });
    expect(result.success).toBe(true);
  });

  it('recusa vencimento anterior a hoje', () => {
    const result = createTituloSchema.safeParse({
      ...tituloBase,
      data_vencimento: addDays(getTodayISO(), -1),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((item) => item.path.join('.') === 'data_vencimento')).toBe(
        true
      );
    }
  });
});

describe('updateTituloSchema', () => {
  it('permite manter vencimento passado na edição parcial', () => {
    const result = updateTituloSchema.safeParse({
      data_vencimento: addDays(getTodayISO(), -10),
      observacoes: 'ajuste',
    });
    expect(result.success).toBe(true);
  });
});

describe('tituloSchema', () => {
  it('recusa data de vencimento inválida', () => {
    const result = tituloSchema.safeParse({
      ...tituloBase,
      data_vencimento: 'nao-e-data',
    });
    expect(result.success).toBe(false);
  });
});
