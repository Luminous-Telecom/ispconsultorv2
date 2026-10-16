import { generateWireguardKeyPair, wireguardPublicFromPrivate } from '../wireguardKeys';

describe('generateWireguardKeyPair', () => {
  it('gera chave privada de 32 bytes e a pública correspondente', () => {
    const keys = generateWireguardKeyPair();
    expect(Buffer.from(keys.privateKey, 'base64')).toHaveLength(32);
    expect(Buffer.from(keys.publicKey, 'base64')).toHaveLength(32);
    expect(wireguardPublicFromPrivate(keys.privateKey)).toBe(keys.publicKey);
  });
});
