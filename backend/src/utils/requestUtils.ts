import { IncomingHttpHeaders } from 'http';
import { Request } from 'express';

export interface ClientIpSource {
  headers?: IncomingHttpHeaders;
  webhookClientIp?: string | null;
  expressIp?: string | null;
  socketRemoteAddress?: string | null;
}

function normalizeIp(value: string | undefined | null): string | null {
  if (!value?.trim()) return null;
  return value.trim().replace(/^::ffff:/, '');
}

function firstForwardedIp(value: string): string | null {
  const first = value.split(',')[0]?.trim();
  return first ? normalizeIp(first) : null;
}

/**
 * Resolve o IP do cliente a partir de headers e metadados da conexão.
 * Ordem: webhook override → Cloudflare/proxy → socket.
 */
export function getClientIpFromSource(source: ClientIpSource): string | null {
  const webhook = normalizeIp(source.webhookClientIp ?? undefined);
  if (webhook) return webhook;

  const headers = source.headers ?? {};
  const headerCandidates = [
    headers['cf-connecting-ip'],
    headers['x-client-ip'],
    headers['x-forwarded-for'],
    headers['x-real-ip'],
    headers['true-client-ip'],
    headers['x-forwarded'],
    headers['forwarded-for'],
  ];

  for (const raw of headerCandidates) {
    if (typeof raw !== 'string' || !raw.trim()) continue;
    if (raw.includes(',')) {
      const ip = firstForwardedIp(raw);
      if (ip) return ip;
    } else {
      const ip = normalizeIp(raw);
      if (ip) return ip;
    }
  }

  const forwarded = headers['forwarded'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    const forMatch = forwarded.match(/for=([^;,\s]+)/i);
    if (forMatch?.[1]) {
      const ip = normalizeIp(forMatch[1].replace(/^["[\]]|["[\]]$/g, ''));
      if (ip) return ip;
    }
  }

  const expressIp = normalizeIp(source.expressIp ?? undefined);
  if (expressIp) return expressIp;

  return normalizeIp(source.socketRemoteAddress ?? undefined);
}

/** IP do cliente a partir de uma requisição Express. */
export function getClientIp(req: Request): string | null {
  const reqAny = req as Request & { webhookClientIp?: string };
  return getClientIpFromSource({
    headers: req.headers,
    webhookClientIp: reqAny.webhookClientIp,
    expressIp: req.ip,
    socketRemoteAddress: req.socket?.remoteAddress ?? null,
  });
}

export function getClientIpOrDefault(req: Request, fallback: string): string {
  return getClientIp(req) ?? fallback;
}

/** IP a partir do handshake de um socket (agent, SSH manager, etc.). */
export function getClientIpFromHandshake(handshake: {
  headers: IncomingHttpHeaders;
  address?: string;
}): string | null {
  return getClientIpFromSource({
    headers: handshake.headers,
    socketRemoteAddress: handshake.address ?? null,
  });
}

/**
 * Grava IP do cliente no request para auditoria em processamento assíncrono (webhooks).
 * Retorna o IP resolvido.
 */
export function assignWebhookClientIp(req: Request, fallback = 'unknown'): string {
  const ip = getClientIp(req) ?? fallback;
  (req as Request & { webhookClientIp?: string }).webhookClientIp = ip;
  return ip;
}
