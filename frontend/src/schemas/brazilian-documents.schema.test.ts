import {
  cepOptionalSchema,
  cepSchema,
  cnpjSchema,
  cpfSchema,
  emailOptionalSchema,
  emailSchema,
  estadoOptionalSchema,
  estadoSchema,
  phoneSchema,
} from './brazilian-documents.schema';

describe('documentos brasileiros', () => {
  it('aceita CNPJ, CPF, CEP, e-mail, telefone e UF válidos', () => {
    expect(cnpjSchema.safeParse('11.444.777/0001-61').success).toBe(true);
    expect(cnpjSchema.safeParse('12.ABC.345/01DE-35').success).toBe(true);
    expect(cpfSchema.safeParse('529.982.247-25').success).toBe(true);
    expect(cepSchema.safeParse('01310-100').success).toBe(true);
    expect(emailSchema.safeParse('financeiro@provedor.test').success).toBe(true);
    expect(phoneSchema.safeParse('11988887777').success).toBe(true);
    expect(estadoSchema.parse('sp')).toBe('SP');
  });

  it('recusa documento inválido, CEP curto e e-mail vazio', () => {
    expect(cnpjSchema.safeParse('11.111.111/1111-11').success).toBe(false);
    expect(cnpjSchema.safeParse('12.ABC.345/01DE-00').success).toBe(false);
    expect(cpfSchema.safeParse('111.111.111-11').success).toBe(false);
    expect(cepSchema.safeParse('123').success).toBe(false);
    expect(emailSchema.safeParse('').success).toBe(false);
    expect(phoneSchema.safeParse('123').success).toBe(false);
    expect(estadoSchema.safeParse('SPP').success).toBe(false);
  });

  it('campos opcionais aceitam vazio e recusam formato inválido', () => {
    expect(cepOptionalSchema.safeParse('').success).toBe(true);
    expect(cepOptionalSchema.safeParse('123').success).toBe(false);
    expect(emailOptionalSchema.safeParse('').success).toBe(true);
    expect(emailOptionalSchema.safeParse('nao-email').success).toBe(false);
    expect(estadoOptionalSchema.safeParse('').success).toBe(true);
    expect(estadoOptionalSchema.safeParse('S').success).toBe(false);
  });
});
