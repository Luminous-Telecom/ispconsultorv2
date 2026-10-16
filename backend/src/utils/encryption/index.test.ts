import { decrypt, encrypt } from './index';

describe('criptografia SSH', () => {
  const chaveAnterior = process.env.SSH_ENCRYPTION_KEY;

  beforeAll(() => {
    process.env.SSH_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef';
  });

  afterAll(() => {
    if (chaveAnterior === undefined) {
      delete process.env.SSH_ENCRYPTION_KEY;
    } else {
      process.env.SSH_ENCRYPTION_KEY = chaveAnterior;
    }
  });

  it('recupera o texto original e não devolve a senha em claro', () => {
    const cifrado = encrypt('senha-do-equipamento');
    expect(cifrado).not.toContain('senha-do-equipamento');
    expect(decrypt(cifrado)).toBe('senha-do-equipamento');
  });

  it('recusa texto fora do formato iv:ciphertext', () => {
    expect(() => decrypt('sem-separador')).toThrow('Formato de texto criptografado inválido');
  });

  it('recusa criptografar sem chave configurada', () => {
    delete process.env.SSH_ENCRYPTION_KEY;
    expect(() => encrypt('x')).toThrow('SSH_ENCRYPTION_KEY não configurada');
    process.env.SSH_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef';
  });
});
