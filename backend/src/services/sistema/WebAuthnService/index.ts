import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
} from '@simplewebauthn/server';
import { prisma } from '../../../db/prisma';

type ChallengeEntry = { challenge: string; expires: number };

const registrationChallenges = new Map<number, ChallengeEntry>();
const authenticationChallenges = new Map<number, ChallengeEntry>();
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export type WebAuthnRpConfig = { rpID: string; rpName: string; origin: string };

function isRpIdCompatible(hostname: string, rpID: string): boolean {
  return hostname === rpID || hostname.endsWith(`.${rpID}`);
}

/**
 * Resolve RP ID / origin a partir do Origin do browser (prioridade),
 * com fallback em WEBAUTHN_* / BASE_URL. Evita "rp.id cannot be used with the current origin"
 * quando BASE_URL é outro domínio (ex.: prod) e o front está em localhost.
 */
export function resolveWebAuthnRpConfig(requestOrigin?: string | null): WebAuthnRpConfig {
  const rpName = (process.env.WEBAUTHN_RP_NAME || 'ISP Consultor').trim();
  const envRpID = process.env.WEBAUTHN_RP_ID?.trim();
  const envOrigin = process.env.WEBAUTHN_ORIGIN?.trim();

  if (requestOrigin?.trim()) {
    try {
      const url = new URL(requestOrigin.trim());
      const hostname = url.hostname;
      const rpID =
        envRpID && isRpIdCompatible(hostname, envRpID) ? envRpID : hostname;
      return { rpID, rpName, origin: url.origin };
    } catch {
      /* Origin inválido — cai no fallback */
    }
  }

  if (envOrigin) {
    try {
      const url = new URL(envOrigin);
      const rpID =
        envRpID && isRpIdCompatible(url.hostname, envRpID) ? envRpID : url.hostname;
      return { rpID, rpName, origin: url.origin };
    } catch {
      /* ignora */
    }
  }

  const candidates = [process.env.BASE_URL, process.env.ALLOWED_ORIGINS?.split(',')[0]];
  for (const raw of candidates) {
    if (!raw?.trim()) continue;
    try {
      const url = new URL(raw.trim());
      const rpID =
        envRpID && isRpIdCompatible(url.hostname, envRpID) ? envRpID : url.hostname;
      return { rpID, rpName, origin: url.origin };
    } catch {
      /* tenta próximo */
    }
  }

  return {
    rpID: envRpID || 'localhost',
    rpName,
    origin: 'http://localhost:3000',
  };
}

function putChallenge(map: Map<number, ChallengeEntry>, usuarioId: number, challenge: string): void {
  map.set(usuarioId, { challenge, expires: Date.now() + CHALLENGE_TTL_MS });
}

function takeChallenge(map: Map<number, ChallengeEntry>, usuarioId: number): string | null {
  const entry = map.get(usuarioId);
  map.delete(usuarioId);
  if (!entry || entry.expires < Date.now()) return null;
  return entry.challenge;
}

function parseTransports(raw: string | null): AuthenticatorTransportFuture[] | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as AuthenticatorTransportFuture[]) : undefined;
  } catch {
    return undefined;
  }
}

function publicKeyToBase64(key: Uint8Array): string {
  return Buffer.from(key).toString('base64');
}

function publicKeyFromBase64(stored: string): Uint8Array<ArrayBuffer> {
  const buf = Buffer.from(stored, 'base64');
  const copy = new Uint8Array(buf.byteLength);
  copy.set(buf);
  return copy;
}

export class WebAuthnService {
  static async count(usuarioId: number): Promise<number> {
    return prisma.cadastros_usuarios_webauthn.count({ where: { usuario_id: usuarioId } });
  }

  static async list(usuarioId: number): Promise<
    Array<{ id: number; device_name: string | null; created_at: Date }>
  > {
    return prisma.cadastros_usuarios_webauthn.findMany({
      where: { usuario_id: usuarioId },
      select: { id: true, device_name: true, created_at: true },
      orderBy: { created_at: 'desc' },
    });
  }

  static async startRegistration(
    usuarioId: number,
    email: string,
    displayName: string | null,
    requestOrigin?: string | null
  ): Promise<PublicKeyCredentialCreationOptionsJSON> {
    const { rpID, rpName } = resolveWebAuthnRpConfig(requestOrigin);
    const existing = await prisma.cadastros_usuarios_webauthn.findMany({
      where: { usuario_id: usuarioId },
      select: { credential_id: true, transports: true },
    });

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userName: email,
      userDisplayName: displayName || email,
      userID: new TextEncoder().encode(String(usuarioId)),
      attestationType: 'none',
      excludeCredentials: existing.map((c) => ({
        id: c.credential_id,
        transports: parseTransports(c.transports),
      })),
      // Sem authenticatorAttachment: permite Bitwarden, navegador e chaves de segurança
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    putChallenge(registrationChallenges, usuarioId, options.challenge);
    return options;
  }

  static async finishRegistration(
    usuarioId: number,
    empresaId: number | null,
    response: RegistrationResponseJSON,
    deviceName?: string | null,
    requestOrigin?: string | null
  ): Promise<{ id: number; device_name: string | null }> {
    const expectedChallenge = takeChallenge(registrationChallenges, usuarioId);
    if (!expectedChallenge) {
      throw new Error('Desafio de registro expirado. Tente novamente.');
    }

    const { rpID, origin } = resolveWebAuthnRpConfig(requestOrigin);
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new Error('Não foi possível verificar a chave de acesso');
    }

    const { credential } = verification.registrationInfo;
    const name = (deviceName || 'Chave de acesso').slice(0, 150);

    const created = await prisma.cadastros_usuarios_webauthn.create({
      data: {
        usuario_id: usuarioId,
        credential_id: credential.id,
        public_key: publicKeyToBase64(credential.publicKey),
        counter: BigInt(credential.counter),
        transports: credential.transports ? JSON.stringify(credential.transports) : null,
        device_name: name,
        empresa_id: empresaId,
      },
      select: { id: true, device_name: true },
    });

    return created;
  }

  static async startAuthentication(
    usuarioId: number,
    requestOrigin?: string | null
  ): Promise<PublicKeyCredentialRequestOptionsJSON> {
    const { rpID } = resolveWebAuthnRpConfig(requestOrigin);
    const credentials = await prisma.cadastros_usuarios_webauthn.findMany({
      where: { usuario_id: usuarioId },
      select: { credential_id: true, transports: true },
    });
    if (!credentials.length) {
      throw new Error('Nenhuma chave de acesso cadastrada');
    }

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: credentials.map((c) => ({
        id: c.credential_id,
        transports: parseTransports(c.transports),
      })),
      userVerification: 'preferred',
    });

    putChallenge(authenticationChallenges, usuarioId, options.challenge);
    return options;
  }

  static async finishAuthentication(
    usuarioId: number,
    response: AuthenticationResponseJSON,
    requestOrigin?: string | null
  ): Promise<boolean> {
    const expectedChallenge = takeChallenge(authenticationChallenges, usuarioId);
    if (!expectedChallenge) {
      throw new Error('Desafio de autenticação expirado. Tente novamente.');
    }

    const stored = await prisma.cadastros_usuarios_webauthn.findFirst({
      where: { usuario_id: usuarioId, credential_id: response.id },
    });
    if (!stored) {
      return false;
    }

    const { rpID, origin } = resolveWebAuthnRpConfig(requestOrigin);
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: stored.credential_id,
        publicKey: publicKeyFromBase64(stored.public_key),
        counter: Number(stored.counter),
        transports: parseTransports(stored.transports),
      },
      requireUserVerification: false,
    });

    if (!verification.verified) {
      return false;
    }

    await prisma.cadastros_usuarios_webauthn.update({
      where: { id: stored.id },
      data: { counter: BigInt(verification.authenticationInfo.newCounter) },
    });

    return true;
  }

  static async remove(usuarioId: number, credentialId: number): Promise<void> {
    await prisma.cadastros_usuarios_webauthn.deleteMany({
      where: { id: credentialId, usuario_id: usuarioId },
    });
  }

  static async removeAll(usuarioId: number): Promise<void> {
    await prisma.cadastros_usuarios_webauthn.deleteMany({
      where: { usuario_id: usuarioId },
    });
  }
}
