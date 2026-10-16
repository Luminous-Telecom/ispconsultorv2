import { createPrivateKey, createPublicKey, generateKeyPairSync } from 'crypto';

const PKCS8_PREFIX = Buffer.from('302e020100300506032b656e04220420', 'hex');
const SPKI_PREFIX = Buffer.from('302a300506032b656e032100', 'hex');

function rawFromDer(der: Buffer): Buffer {
  return der.subarray(der.length - 32);
}

/** Par de chaves WireGuard (X25519, base64 de 32 bytes). */
export function generateWireguardKeyPair(): { privateKey: string; publicKey: string } {
  const { publicKey, privateKey } = generateKeyPairSync('x25519');
  const privDer = privateKey.export({ type: 'pkcs8', format: 'der' });
  const pubDer = publicKey.export({ type: 'spki', format: 'der' });
  return {
    privateKey: rawFromDer(Buffer.from(privDer)).toString('base64'),
    publicKey: rawFromDer(Buffer.from(pubDer)).toString('base64'),
  };
}

export function wireguardPublicFromPrivate(privateKeyB64: string): string {
  const raw = Buffer.from(privateKeyB64, 'base64');
  if (raw.length !== 32) {
    throw new Error('Chave privada WireGuard inválida');
  }
  const pkcs8 = Buffer.concat([PKCS8_PREFIX, raw]);
  const priv = createPrivateKey({ key: pkcs8, format: 'der', type: 'pkcs8' });
  const pub = createPublicKey(priv);
  const spki = Buffer.from(pub.export({ type: 'spki', format: 'der' }));
  if (!spki.subarray(0, SPKI_PREFIX.length).equals(SPKI_PREFIX) && spki.length < 32) {
    throw new Error('Chave pública WireGuard inválida');
  }
  return rawFromDer(spki).toString('base64');
}
