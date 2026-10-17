import { fornecedorCreateSchema, fornecedorUpdateSchema } from './index';

describe('fornecedorCreateSchema', () => {
  it('aceita pessoa jurídica e formata CNPJ numérico', () => {
    const { error, value } = fornecedorCreateSchema.validate({
      tipo_pessoa: 'JURIDICA',
      nome_razao_social: 'Fornecedor Teste',
      cpf_cnpj: '11444777000161',
    });
    expect(error).toBeUndefined();
    expect(value.cpf_cnpj).toBe('11.444.777/0001-61');
    expect(value.pais).toBe('Brasil');
  });

  it('aceita CNPJ alfanumérico e formata a máscara', () => {
    const { error, value } = fornecedorCreateSchema.validate({
      tipo_pessoa: 'JURIDICA',
      nome_razao_social: 'Fornecedor Alfa',
      cpf_cnpj: '12abc34501de35',
    });
    expect(error).toBeUndefined();
    expect(value.cpf_cnpj).toBe('12.ABC.345/01DE-35');
  });

  it('recusa CNPJ alfanumérico com dígito verificador errado', () => {
    const { error } = fornecedorCreateSchema.validate({
      tipo_pessoa: 'JURIDICA',
      nome_razao_social: 'Fornecedor Alfa',
      cpf_cnpj: '12ABC34501DE00',
    });
    expect(error?.details[0]?.path).toEqual(['cpf_cnpj']);
  });

  it('recusa CPF com dígitos repetidos para pessoa física', () => {
    const { error } = fornecedorCreateSchema.validate({
      tipo_pessoa: 'FISICA',
      nome_razao_social: 'Pessoa Teste',
      cpf_cnpj: '11111111111',
    });
    expect(error?.details[0]?.path).toEqual(['cpf_cnpj']);
  });

  it('recusa cadastro sem tipo de pessoa', () => {
    const { error } = fornecedorCreateSchema.validate({
      nome_razao_social: 'Sem Tipo',
      cpf_cnpj: '11444777000161',
    });
    expect(error?.details.some((item) => item.path.join('.') === 'tipo_pessoa')).toBe(true);
  });
});

describe('fornecedorUpdateSchema', () => {
  it('aceita edição só do nome', () => {
    const { error, value } = fornecedorUpdateSchema.validate({ nome_razao_social: 'Nome Atualizado' });
    expect(error).toBeUndefined();
    expect(value.nome_razao_social).toBe('Nome Atualizado');
  });

  it('recusa CEP com tamanho inválido', () => {
    const { error } = fornecedorUpdateSchema.validate({ cep: '123' });
    expect(error?.details[0]?.path).toEqual(['cep']);
  });
});
