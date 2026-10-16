import * as http from 'http';
import * as https from 'https';

export type RosRecord = Record<string, unknown>;

export type MikrotikRest = {
  get(path: string): Promise<unknown>;
  put(path: string, body: RosRecord): Promise<unknown>;
  patch(path: string, body: RosRecord): Promise<unknown>;
};

export type MikrotikRestOptions = {
  host: string;
  port: number;
  tls: boolean;
  username: string;
  password: string;
  timeoutMs?: number;
};

function isRecord(value: unknown): value is RosRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function asRecords(data: unknown): RosRecord[] {
  if (Array.isArray(data)) return data.filter(isRecord);
  if (isRecord(data)) return [data];
  return [];
}

export function asRecord(data: unknown): RosRecord {
  if (Array.isArray(data)) {
    const first = data.find(isRecord);
    return first ?? {};
  }
  return isRecord(data) ? data : {};
}

function rosErrorMessage(status: number, raw: string): string {
  try {
    const parsed = JSON.parse(raw) as { message?: string; detail?: string };
    const detail = parsed.detail || parsed.message;
    if (detail) return `MikroTik HTTP ${status}: ${detail}`;
  } catch {
    /* corpo não é JSON */
  }
  const snippet = raw.replace(/\s+/g, ' ').trim().slice(0, 180);
  return snippet ? `MikroTik HTTP ${status}: ${snippet}` : `MikroTik HTTP ${status}`;
}

export function createMikrotikRest(options: MikrotikRestOptions): MikrotikRest {
  const timeoutMs = options.timeoutMs ?? 20_000;
  const lib = options.tls ? https : http;
  const auth = Buffer.from(`${options.username}:${options.password}`, 'utf8').toString('base64');

  const request = (method: string, path: string, body?: RosRecord): Promise<unknown> =>
    new Promise((resolve, reject) => {
      const payload = body ? JSON.stringify(body) : undefined;
      const req = lib.request(
        {
          hostname: options.host,
          port: options.port,
          path,
          method,
          timeout: timeoutMs,
          headers: {
            Authorization: `Basic ${auth}`,
            Accept: 'application/json',
            ...(payload
              ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
              : {}),
          },
          ...(options.tls ? { rejectUnauthorized: false } : {}),
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => {
            const raw = Buffer.concat(chunks).toString('utf8');
            const status = res.statusCode ?? 0;
            if (status < 200 || status >= 300) {
              reject(new Error(rosErrorMessage(status, raw)));
              return;
            }
            if (!raw.trim()) {
              resolve(null);
              return;
            }
            try {
              resolve(JSON.parse(raw) as unknown);
            } catch {
              reject(new Error('Resposta do MikroTik não é JSON'));
            }
          });
        }
      );
      req.on('error', (err) => {
        reject(new Error(`Sem acesso à API do MikroTik (${options.host}:${options.port}): ${err.message}`));
      });
      req.setTimeout(timeoutMs, () => {
        req.destroy();
        reject(new Error('Tempo esgotado ao falar com a API do MikroTik'));
      });
      if (payload) req.write(payload);
      req.end();
    });

  return {
    get: (path) => request('GET', path),
    put: (path, body) => request('PUT', path, body),
    patch: (path, body) => request('PATCH', path, body),
  };
}
