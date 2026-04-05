import crypto from 'crypto';

/**
 * Chave colada sem quebras (uma linha só) fica inválida para o PEM:
 * `-----BEGIN OPENSSH PRIVATE KEY----- b3Blbn...` — o Node retorna
 * `DECODER routines::unsupported`. Reconstrói o PEM com linhas de 64 chars.
 */
function repairSquashedPrivateKeyPem(s: string): string {
  if (!s.includes('BEGIN') || !s.includes('PRIVATE KEY')) return s;
  const trimmed = s.trim();

  const tryUnwrap = (begin: string, end: string): string | null => {
    if (!trimmed.startsWith(begin)) return null;
    const endIdx = trimmed.indexOf(end);
    if (endIdx === -1) return null;
    const body = trimmed.slice(begin.length, endIdx).replace(/\s/g, '');
    if (!body.length) return null;
    const wrapped = body.match(/.{1,64}/g)?.join('\n') ?? body;
    return `${begin}\n${wrapped}\n${end}\n`;
  };

  const rebuilt =
    tryUnwrap('-----BEGIN OPENSSH PRIVATE KEY-----', '-----END OPENSSH PRIVATE KEY-----') ??
    tryUnwrap('-----BEGIN RSA PRIVATE KEY-----', '-----END RSA PRIVATE KEY-----') ??
    tryUnwrap('-----BEGIN EC PRIVATE KEY-----', '-----END EC PRIVATE KEY-----');

  if (rebuilt) return rebuilt;

  let t = s;
  t = t.replace(/(-----BEGIN [^-]+-----)\s+(?=[^\n\r-])/g, '$1\n');
  t = t.replace(/([A-Za-z0-9+/=])\s*(-----END [^-]+-----)/g, '$1\n$2');
  return t;
}

/**
 * Normaliza PEM de chave privada SSH para o parser do `ssh2` (evita falha
 * "Unsupported key format" com texto colado do Windows ou com espaços extras).
 */
export function normalizeSshPrivateKeyPem(key: string): string {
  let s = key
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
  s = repairSquashedPrivateKeyPem(s);
  return s;
}

/**
 * Reexporta a chave em PEM clássico (PKCS#1 RSA ou PKCS#8 demais tipos).
 * O parser interno do `ssh2` falha em alguns blobs `BEGIN OPENSSH PRIVATE KEY`;
 * o `crypto` do Node aceita e converte para PEM que o `ssh2` entende.
 */
export function privateKeyPemForSsh2(raw: string): string {
  const normalized = normalizeSshPrivateKeyPem(raw);
  if (!normalized) return '';
  try {
    const keyObj = crypto.createPrivateKey({ key: normalized, format: 'pem' });
    const t = keyObj.asymmetricKeyType;
    const exported =
      t === 'rsa'
        ? keyObj.export({ format: 'pem', type: 'pkcs1' })
        : keyObj.export({ format: 'pem', type: 'pkcs8' });
    return Buffer.isBuffer(exported) ? exported.toString('utf8') : exported;
  } catch {
    return normalized;
  }
}
