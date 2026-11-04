import { clienteCreateSchema, clienteUpdateSchema } from './index';

const clienteValido = {
  cnpj: '11.444.777/0001-61',
  razao_social: 'Empresa Teste',
  email: 'financeiro@example.com',
  cep: '01310-100',
  endereco: 'Avenida Paulista',
  numero: '1000',
  bairro: 'Bela Vista',
  cidade: 'Sao Paulo',
  estado: 'SP',
  valor_primeiro_titulo: 'total',
};

describe('clienteCreateSchema', () => {
  it('aceita cadastro completo', () => {
    const { error, value } = clienteCreateSchema.validate(clienteValido);
    expect(error).toBeUndefined();
    expect(value.razao_social).toBe('Empresa Teste');
    expect(value.ativo).toBe(true);
  });

  it('recusa cadastro sem razão social', () => {
    const { razao_social: _omit, ...semRazao } = clienteValido;
    const { error } = clienteCreateSchema.validate(semRazao, { abortEarly: false });
    expect(error?.details.some((item) => item.path.join('.') === 'razao_social')).toBe(true);
  });

  it('aceita CNPJ alfanumérico e grava com máscara', () => {
    const { error, value } = clienteCreateSchema.validate({
      ...clienteValido,
      cnpj: '12abc34501de35',
    });
    expect(error).toBeUndefined();
    expect(value.cnpj).toBe('12.ABC.345/01DE-35');
  });

  it('recusa e-mail inválido e CNPJ fora do tamanho', () => {
    const { error } = clienteCreateSchema.validate(
      { ...clienteValido, email: 'nao-e-email', cnpj: '123' },
      { abortEarly: false }
    );
    const fields = error?.details.map((item) => item.path.join('.'));
    expect(fields).toEqual(expect.arrayContaining(['email', 'cnpj']));
  });
});

describe('ips DNS do cliente', () => {
  it('aceita IPs e faixas e grava normalizado', () => {
    const { error, value } = clienteCreateSchema.validate({
      ...clienteValido,
      ips_dns: ' 192.168.1.1;\n10.0.0.0/24 ',
    });
    expect(error).toBeUndefined();
    expect(value.ips_dns).toBe('192.168.1.1; 10.0.0.0/24');
  });

  it('aceita cadastro sem IPs DNS', () => {
    const { error, value } = clienteCreateSchema.validate({ ...clienteValido, ips_dns: '' });
    expect(error).toBeUndefined();
    expect(value.ips_dns).toBe('');
  });

  it('recusa IP inválido no campo ips_dns', () => {
    const { error } = clienteUpdateSchema.validate({ ips_dns: 'dns.provedor.net' });
    expect(error?.details.some((item) => item.path.join('.') === 'ips_dns')).toBe(true);
  });
});

describe('clienteUpdateSchema', () => {
  it('aceita edição parcial', () => {
    const { error, value } = clienteUpdateSchema.validate({ razao_social: 'Nome Novo' });
    expect(error).toBeUndefined();
    expect(value.razao_social).toBe('Nome Novo');
  });

  it('recusa estado com tamanho diferente de 2 na edição', () => {
    const { error } = clienteUpdateSchema.validate({ estado: 'SPP' });
    expect(error?.details[0]?.path).toEqual(['estado']);
  });
});
