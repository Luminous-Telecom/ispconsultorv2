import { contratoSchema, updateContratoSchema } from './contrato.schema';
import { planoSchema, updatePlanoSchema } from './plano.schema';
import { tituloSchema, updateTituloSchema } from './titulo.schema';
import { bancoSchema, updateBancoSchema } from './banco.schema';
import { receberSchema } from './receber.schema';

describe('cadastro, edição e visualização dos schemas', () => {
  it('aceita contrato completo e edição só do status', () => {
    const parsed = contratoSchema.parse({
      cliente_id: 1,
      plano_id: 2,
      modelo_documento_id: 3,
      dia_vencimento_id: 4,
      conta_boleto: 5,
      tipo_cobranca_contrato_id: 6,
      data_inicio: '2026-01-01',
    });
    expect(parsed.status).toBe('ativo');
    expect(updateContratoSchema.parse({ status: 'suspenso' }).status).toBe('suspenso');
    expect(contratoSchema.safeParse({ cliente_id: 1 }).success).toBe(false);
  });

  it('aceita plano e recusa valor mensal zero', () => {
    const parsed = planoSchema.parse({
      nome_plano: 'Fibra 500',
      valor_mensal: 99.9,
      data_inicio: '2026-01-01',
    });
    expect(parsed.status).toBe('ativo');
    expect(planoSchema.safeParse({ nome_plano: 'Fibra', valor_mensal: 0, data_inicio: '2026-01-01' }).success).toBe(false);
    expect(updatePlanoSchema.parse({}).nome_plano).toBeUndefined();
  });

  it('aceita título, edição parcial e recusa vencimento vazio', () => {
    const parsed = tituloSchema.parse({ plano_id: 3, data_vencimento: '2026-03-10' });
    expect(parsed.status).toBe('pendente');
    expect(parsed.pago).toBe(false);
    expect(updateTituloSchema.parse({ descricao: 'Mensalidade' }).descricao).toBe('Mensalidade');
    expect(tituloSchema.safeParse({ plano_id: 3, data_vencimento: '' }).success).toBe(false);
  });

  it('aceita banco e edição do nome', () => {
    const parsed = bancoSchema.parse({ nome: 'EFI' });
    expect(parsed.ativo).toBe(true);
    expect(parsed.tipo_banco).toBe('efi');
    expect(updateBancoSchema.parse({ nome: 'Asaas' }).nome).toBe('Asaas');
    expect(bancoSchema.safeParse({ nome: 'A' }).success).toBe(false);
  });

  it('aceita recebimento passado e recusa data futura ou valor zero', () => {
    expect(receberSchema.parse({ data_pagamento: '2020-01-15', valor_pago: '10.5' }).valor_pago).toBe('10.5');
    expect(receberSchema.safeParse({ data_pagamento: '2999-01-01', valor_pago: '10' }).success).toBe(false);
    expect(receberSchema.safeParse({ data_pagamento: '2020-01-15', valor_pago: '0' }).success).toBe(false);
  });
});
