import { contratoCreateSchema, contratoUpdateSchema } from './index';

const contratoValido = {
  cliente_id: 1,
  plano_id: 2,
  dia_vencimento_id: 3,
  conta_boleto: 4,
  modelo_documento_id: 5,
};

describe('contratoCreateSchema', () => {
  it('aceita cadastro com os vínculos obrigatórios', () => {
    const { error, value } = contratoCreateSchema.validate(contratoValido);
    expect(error).toBeUndefined();
    expect(value.status).toBe('ativo');
    expect(value.cliente_id).toBe(1);
  });

  it('recusa cadastro sem plano', () => {
    const { plano_id: _omit, ...semPlano } = contratoValido;
    const { error } = contratoCreateSchema.validate(semPlano, { abortEarly: false });
    expect(error?.details.some((item) => item.path.join('.') === 'plano_id')).toBe(true);
  });

  it('recusa desconto percentual acima de 100', () => {
    const { error } = contratoCreateSchema.validate({ ...contratoValido, desconto_percentual: 150 });
    expect(error?.details[0]?.path).toEqual(['desconto_percentual']);
  });
});

describe('contratoUpdateSchema', () => {
  it('aceita edição só do status', () => {
    const { error, value } = contratoUpdateSchema.validate({ status: 'suspenso' });
    expect(error).toBeUndefined();
    expect(value.status).toBe('suspenso');
  });

  it('recusa status fora da lista', () => {
    const { error } = contratoUpdateSchema.validate({ status: 'excluido' });
    expect(error).toBeDefined();
  });
});
