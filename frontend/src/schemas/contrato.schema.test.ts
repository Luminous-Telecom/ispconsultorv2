import { contratoSchema } from './contrato.schema';

const contratoValido = {
  cliente_id: 1,
  plano_id: 2,
  modelo_documento_id: 3,
  dia_vencimento_id: 4,
  conta_boleto: 5,
  tipo_cobranca_contrato_id: 6,
  data_inicio: '2026-01-15',
  endereco: 'Rua das Flores',
  numero: '10',
  bairro: 'Centro',
  cidade: 'Natal',
  estado: 'rn',
};

describe('contratoSchema', () => {
  it('aceita contrato com endereço e normaliza a UF', () => {
    const parsed = contratoSchema.parse(contratoValido);
    expect(parsed.estado).toBe('RN');
    expect(parsed.endereco).toBe('Rua das Flores');
  });

  it('recusa contrato sem endereço', () => {
    const result = contratoSchema.safeParse({
      ...contratoValido,
      endereco: '',
      numero: '',
      bairro: '',
      cidade: '',
      estado: '',
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    const fields = result.error.issues.map((issue) => issue.path.join('.'));
    expect(fields).toEqual(expect.arrayContaining(['endereco', 'numero', 'bairro', 'cidade', 'estado']));
    expect(result.error.issues.some((issue) => String(issue.message).includes('obrigat'))).toBe(true);
  });
});
