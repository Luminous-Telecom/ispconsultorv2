import { vendedorCreateSchema, vendedorUpdateSchema } from './index';

describe('vendedorCreateSchema', () => {
  it('aceita cadastro com nome e comissão', () => {
    const { error, value } = vendedorCreateSchema.validate({
      nome: 'Ana Vendas',
      comissao_percentual: 10,
      comissao_valor: 50,
      forma_recebimento: 'PIX',
      tipo_chave_pix: 'EMAIL',
      ativo: true,
    });
    expect(error).toBeUndefined();
    expect(value.nome).toBe('Ana Vendas');
    expect(value.forma_recebimento).toBe('PIX');
  });

  it('recusa cadastro sem nome', () => {
    const { error } = vendedorCreateSchema.validate({ cpf_cnpj: '123' }, { abortEarly: false });
    expect(error?.details.some((item) => item.path.join('.') === 'nome')).toBe(true);
  });

  it('recusa comissão percentual acima de 100 e forma de recebimento inválida', () => {
    const percentual = vendedorCreateSchema.validate({ nome: 'Ana', comissao_percentual: 150 });
    expect(percentual.error?.details[0]?.path).toEqual(['comissao_percentual']);

    const forma = vendedorCreateSchema.validate({ nome: 'Ana', forma_recebimento: 'DINHEIRO' });
    expect(forma.error?.details[0]?.path).toEqual(['forma_recebimento']);
  });
});

describe('vendedorUpdateSchema', () => {
  it('aceita atualização parcial sem exigir nome', () => {
    const { error, value } = vendedorUpdateSchema.validate({ comissao_valor: 80 });
    expect(error).toBeUndefined();
    expect(value.comissao_valor).toBe(80);
  });

  it('recusa e-mail inválido', () => {
    const { error } = vendedorUpdateSchema.validate({ email: 'sem-arroba' });
    expect(error?.details[0]?.path).toEqual(['email']);
  });
});
