import { clienteSchema, updateClienteSchema } from './cliente.schema';

const clienteValido = {
  cnpj: '11.444.777/0001-61',
  razao_social: 'Empresa Teste',
  email: 'financeiro@empresa.test',
  cep: '01310100',
  endereco: 'Avenida Paulista',
  numero: '1000',
  bairro: 'Centro',
  cidade: 'Sao Paulo',
  estado: 'SP',
};

describe('clienteSchema', () => {
  it('aceita o cadastro e aplica os padrões', () => {
    const parsed = clienteSchema.parse(clienteValido);
    expect(parsed.razao_social).toBe('Empresa Teste');
    expect(parsed.ativo).toBe(true);
    expect(parsed.valor_primeiro_titulo).toBe('total');
  });

  it('recusa cadastro sem razão social e com senha da central curta', () => {
    const semRazao = { ...clienteValido, razao_social: '' };
    expect(clienteSchema.safeParse(semRazao).success).toBe(false);
    expect(clienteSchema.safeParse({ ...clienteValido, central_assinante_senha: '123' }).success).toBe(false);
  });

  it('edição parcial não exige o cadastro inteiro', () => {
    const parsed = updateClienteSchema.parse({ cidade: 'Campinas' });
    expect(parsed.cidade).toBe('Campinas');
  });
});
