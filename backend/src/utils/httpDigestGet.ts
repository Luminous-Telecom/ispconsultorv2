import * as crypto from 'crypto';
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';

function md5Hex(value: string): string {
  return crypto.createHash('md5').update(value, 'utf8').digest('hex');
}

function digVal(wwwAuthenticate: string, field: string): string | null {
  const quoted = new RegExp(`${field}\\s*=\\s*"([^"]*)"`, 'i');
  let match = wwwAuthenticate.match(quoted);
  if (match) return match[1];
  const unquoted = new RegExp(`${field}\\s*=\\s*([^,\\s]+)`, 'i');
  match = wwwAuthenticate.match(unquoted);
  return match ? String(match[1]).replace(/,$/, '') : null;
}

function httpRequestBuffer(
  urlStr: string,
  requestHeaders: Record<string, string>,
  timeoutMs: number,
  localAddress?: string
): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(urlStr);
    const lib = parsed.protocol === 'https:' ? https : http;
    const port = parsed.port ? Number(parsed.port) : parsed.protocol === 'https:' ? 443 : 80;
    const chunks: Buffer[] = [];

    const req = lib.request(
      {
        hostname: parsed.hostname,
        port,
        path: parsed.pathname + parsed.search,
        method: 'GET',
        headers: requestHeaders,
        timeout: timeoutMs,
        ...(localAddress ? { localAddress } : {}),
      },
      (res) => {
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () =>
          resolve({
            statusCode: res.statusCode ?? 0,
            headers: res.headers,
            body: Buffer.concat(chunks),
          })
        );
      }
    );

    req.on('error', reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error('Timeout HTTP'));
    });
    req.end();
  });
}

export type HttpDigestGetResult =
  | { ok: true; statusCode: number; body: Buffer }
  | { ok: false; statusCode: number; error: string };

/** GET com autenticação HTTP Digest (MD5) — só módulos nativos do Node. */
export async function httpGetWithDigestAuth(
  urlStr: string,
  username: string,
  password: string,
  timeoutMs: number,
  options?: { localAddress?: string }
): Promise<HttpDigestGetResult> {
  const parsed = new URL(urlStr);
  const uri = `${parsed.pathname}${parsed.search || ''}` || '/';

  const first = await httpRequestBuffer(urlStr, {}, timeoutMs, options?.localAddress);
  if (first.statusCode >= 200 && first.statusCode < 300) {
    if (first.body.length > 0) return { ok: true, statusCode: first.statusCode, body: first.body };
    return { ok: false, statusCode: first.statusCode, error: 'Resposta HTTP vazia' };
  }
  if (first.statusCode !== 401) {
    return { ok: false, statusCode: first.statusCode, error: `HTTP ${first.statusCode}` };
  }

  const raw = first.headers['www-authenticate'] ?? first.headers['WWW-Authenticate'];
  const www = Array.isArray(raw) ? raw.join(', ') : raw;
  if (!www || !/digest/i.test(www)) {
    return { ok: false, statusCode: 401, error: '401 sem Digest (credenciais ou equipamento)' };
  }

  const realm = digVal(www, 'realm');
  const nonce = digVal(www, 'nonce');
  if (!realm || !nonce) {
    return { ok: false, statusCode: 401, error: '401 challenge Digest incompleto' };
  }

  const opaque = digVal(www, 'opaque');
  const qopRaw = digVal(www, 'qop');
  let qopUse: string | null = null;
  if (qopRaw) {
    const parts = String(qopRaw)
      .split(',')
      .map((part) => part.trim().replace(/^"|"$/g, ''));
    if (parts.includes('auth')) qopUse = 'auth';
  }

  const nc = '00000001';
  const cnonce = crypto.randomBytes(16).toString('hex');
  const ha1 = md5Hex(`${username}:${realm}:${password}`);
  const ha2 = md5Hex(`GET:${uri}`);
  const responseDigest = qopUse
    ? md5Hex(`${ha1}:${nonce}:${nc}:${cnonce}:${qopUse}:${ha2}`)
    : md5Hex(`${ha1}:${nonce}:${ha2}`);

  const esc = (value: string) => String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  let authHeader = `Digest username="${esc(username)}", realm="${esc(realm)}", nonce="${esc(nonce)}", uri="${esc(uri)}", response="${responseDigest}"`;
  if (qopUse) {
    authHeader += `, qop=${qopUse}, nc=${nc}, cnonce="${cnonce}"`;
  }
  if (opaque) authHeader += `, opaque="${esc(opaque)}"`;
  authHeader += ', algorithm=MD5';

  const second = await httpRequestBuffer(urlStr, { Authorization: authHeader }, timeoutMs, options?.localAddress);
  if (second.statusCode >= 200 && second.statusCode < 300) {
    return { ok: true, statusCode: second.statusCode, body: second.body };
  }
  return { ok: false, statusCode: second.statusCode, error: `HTTP ${second.statusCode}` };
}
