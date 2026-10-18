import { createHash, randomBytes } from 'crypto';
import { prisma } from '../../../db/prisma';

const COOKIE_NAME = 'trusted_device';
const TRUST_DAYS = 90;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Resumo curto do User-Agent (ex.: "Chrome · Windows"). */
export function summarizeUserAgent(ua: string | null | undefined): string {
  if (!ua?.trim()) return 'Navegador';
  const browser =
    /Edg\//.test(ua) ? 'Edge'
    : /OPR\/|Opera/.test(ua) ? 'Opera'
    : /Chrome\//.test(ua) && !/Chromium/.test(ua) ? 'Chrome'
    : /Firefox\//.test(ua) ? 'Firefox'
    : /Safari\//.test(ua) && !/Chrome/.test(ua) ? 'Safari'
    : 'Navegador';
  const os =
    /Windows/.test(ua) ? 'Windows'
    : /Android/.test(ua) ? 'Android'
    : /iPhone|iPad|iPod/.test(ua) ? 'iOS'
    : /Mac OS X|Macintosh/.test(ua) ? 'macOS'
    : /Linux/.test(ua) ? 'Linux'
    : '';
  return os ? `${browser} · ${os}` : browser;
}

export class TrustedDeviceService {
  static get cookieName(): string {
    return COOKIE_NAME;
  }

  static get trustDays(): number {
    return TRUST_DAYS;
  }

  static get maxAgeMs(): number {
    return TRUST_DAYS * MS_PER_DAY;
  }

  /** Verifica cookie opaco contra dispositivos confiáveis do usuário. */
  static async isTrusted(usuarioId: number, rawToken: string | undefined | null): Promise<boolean> {
    if (!rawToken || typeof rawToken !== 'string' || rawToken.length < 32) {
      return false;
    }
    const tokenHash = hashToken(rawToken);
    const now = new Date();
    const row = await prisma.cadastros_usuarios_dispositivos_confiaveis.findFirst({
      where: {
        usuario_id: usuarioId,
        token_hash: tokenHash,
        expires_at: { gt: now },
      },
      select: { id: true },
    });
    return !!row;
  }

  /** Cria dispositivo confiável e devolve o token em claro (só uma vez, para o cookie). */
  static async create(
    usuarioId: number,
    empresaId: number | null,
    options?: { userAgent?: string | null; ip?: string | null }
  ): Promise<{ token: string; expires_at: Date }> {
    const token = randomBytes(32).toString('hex');
    const expires_at = new Date(Date.now() + this.maxAgeMs);
    const label = summarizeUserAgent(options?.userAgent);
    const ip = options?.ip?.trim().slice(0, 45) || null;
    await prisma.cadastros_usuarios_dispositivos_confiaveis.create({
      data: {
        usuario_id: usuarioId,
        token_hash: hashToken(token),
        label,
        ip,
        expires_at,
        empresa_id: empresaId,
      },
    });
    return { token, expires_at };
  }

  static async list(usuarioId: number): Promise<
    Array<{ id: number; label: string | null; ip: string | null; created_at: Date; expires_at: Date }>
  > {
    const now = new Date();
    await prisma.cadastros_usuarios_dispositivos_confiaveis.deleteMany({
      where: { usuario_id: usuarioId, expires_at: { lte: now } },
    });
    return prisma.cadastros_usuarios_dispositivos_confiaveis.findMany({
      where: { usuario_id: usuarioId, expires_at: { gt: now } },
      select: { id: true, label: true, ip: true, created_at: true, expires_at: true },
      orderBy: { created_at: 'desc' },
    });
  }

  static async revoke(usuarioId: number, deviceId: number): Promise<void> {
    await prisma.cadastros_usuarios_dispositivos_confiaveis.deleteMany({
      where: { id: deviceId, usuario_id: usuarioId },
    });
  }

  static async revokeAll(usuarioId: number): Promise<void> {
    await prisma.cadastros_usuarios_dispositivos_confiaveis.deleteMany({
      where: { usuario_id: usuarioId },
    });
  }
}
