import { Client as SshClient, ConnectConfig } from 'ssh2';
import { EventEmitter } from 'events';
import { SshDevice } from '../../../models/ssh-manager/SshDevice';
import { decryptSshCredential } from '../../../utils/encryption';
import { privateKeyPemForSsh2 } from '../../../utils/sshPrivateKey';
import { logger } from '../../../utils/logger';

export const sshEvents = new EventEmitter();
sshEvents.setMaxListeners(100);

const SSH_TIMEOUT_MS = 10_000;
const SSH_DEVICE_TIMEOUT_MS = parseInt(process.env.SSH_DEVICE_TIMEOUT_MS ?? '30000', 10);

/**
 * Base: MikroTik, Huawei NE, Linux e a maioria dos vendors — KEX/ciphers legados + curve25519.
 */
const SSH_ALGORITHMS_BASE: ConnectConfig['algorithms'] = {
  kex: [
    'curve25519-sha256',
    'curve25519-sha256@libssh.org',
    'ecdh-sha2-nistp256',
    'ecdh-sha2-nistp384',
    'ecdh-sha2-nistp521',
    'diffie-hellman-group-exchange-sha256',
    'diffie-hellman-group14-sha256',
    'diffie-hellman-group14-sha1',
    'diffie-hellman-group-exchange-sha1',
    'diffie-hellman-group1-sha1',
  ],
  cipher: [
    'aes128-gcm@openssh.com',
    'aes256-gcm@openssh.com',
    'aes128-ctr',
    'aes192-ctr',
    'aes256-ctr',
    'aes128-cbc',
    'aes192-cbc',
    'aes256-cbc',
    '3des-cbc',
  ],
  hmac: [
    'hmac-sha2-256',
    'hmac-sha2-512',
    'hmac-sha1',
    'hmac-md5',
  ],
  serverHostKey: [
    'ssh-rsa',
    'ecdsa-sha2-nistp256',
    'ecdsa-sha2-nistp384',
    'ecdsa-sha2-nistp521',
    'ssh-ed25519',
    'rsa-sha2-256',
    'rsa-sha2-512',
  ],
};

/** IOS / IOS-XE / IOS-XR: KEX adicionais e host key DSS em hardware muito antigo. */
const SSH_ALGORITHMS_LEGACY = {
  kex: [
    ...(SSH_ALGORITHMS_BASE.kex as string[]),
    'diffie-hellman-group18-sha512',
    'diffie-hellman-group16-sha512',
    'diffie-hellman-group15-sha512',
  ],
  cipher: SSH_ALGORITHMS_BASE.cipher,
  hmac: SSH_ALGORITHMS_BASE.hmac,
  serverHostKey: ['ssh-dss', ...(SSH_ALGORITHMS_BASE.serverHostKey as string[])],
} as ConnectConfig['algorithms'];

/** Alinha com o agente (`sshAlgorithmsForDeviceType`). */
export function sshAlgorithmsForDeviceType(deviceType?: string | null): ConnectConfig['algorithms'] {
  const t = (deviceType ?? '').toLowerCase().trim();
  if (t === 'cisco') return SSH_ALGORITHMS_LEGACY;
  return SSH_ALGORITHMS_BASE;
}

function buildConnectConfig(
  host: string,
  port: number,
  username: string,
  encryptedPassword: string,
  encryptedPrivateKey: string | null,
  deviceType?: string | null
): ConnectConfig {
  const password = decryptSshCredential(encryptedPassword, 'senha');
  const rawKey = encryptedPrivateKey ? decryptSshCredential(encryptedPrivateKey, 'chave_privada') : undefined;
  const privateKey = rawKey ? privateKeyPemForSsh2(rawKey) : '';
  const usePrivateKey = privateKey.length > 0;

  return {
    host,
    port,
    username,
    readyTimeout: SSH_TIMEOUT_MS,
    algorithms: sshAlgorithmsForDeviceType(deviceType),
    ...(usePrivateKey ? { privateKey } : { password }),
  };
}

/**
 * Abre uma conexão SSH direta com um device e retorna o Client pronto.
 */
export function openDeviceConnection(device: SshDevice, options?: { localAddress?: string }): Promise<SshClient> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const conn = new SshClient();

    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      conn.destroy();
      reject(new Error(`Timeout ao conectar ao device "${device.name}" (${SSH_DEVICE_TIMEOUT_MS / 1000}s)`));
    }, SSH_DEVICE_TIMEOUT_MS);

    conn.on('ready', () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      logger.info('SSH: device conectado', {
        device: device.name,
        host: device.host,
        type: device.device_type,
      });
      resolve(conn);
    });

    conn.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      const message = buildFriendlyError(err);
      logger.warn('SSH: erro ao conectar ao device', { device: device.name, error: message });
      reject(new Error(message));
    });

    try {
      conn.connect({
        ...buildConnectConfig(
          device.host,
          device.port,
          device.username,
          device.password,
          device.private_key,
          device.device_type
        ),
        readyTimeout: SSH_DEVICE_TIMEOUT_MS,
        ...(options?.localAddress ? { localAddress: options.localAddress } : {}),
      });
    } catch (err) {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        reject(err);
      }
    }
  });
}

/**
 * Executa um comando em qualquer conexão SSH e retorna o output completo.
 */
export function executeCommand(
  conn: SshClient,
  command: string,
  targetId: number,
  options?: { timeoutMs?: number }
): Promise<string> {
  const timeoutMs = options?.timeoutMs ?? SSH_TIMEOUT_MS;
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timeout: comando demorou mais de ${timeoutMs / 1000}s para responder`));
    }, timeoutMs);

    conn.exec(command, (err, stream) => {
      if (err) {
        clearTimeout(timeout);
        reject(new Error(`Erro ao executar comando: ${err.message}`));
        return;
      }

      let output = '';
      let stderr = '';

      stream.on('data', (data: Buffer) => {
        const chunk = data.toString('utf8');
        output += chunk;
        sshEvents.emit('log', { targetId: String(targetId), level: 'info', message: chunk, timestamp: new Date() });
      });

      stream.stderr.on('data', (data: Buffer) => {
        const chunk = data.toString('utf8');
        stderr += chunk;
        sshEvents.emit('log', { targetId: String(targetId), level: 'warn', message: chunk, timestamp: new Date() });
      });

      stream.on('close', (code: number | null | undefined, signal?: string) => {
        clearTimeout(timeout);
        const exitCode =
          code === undefined ? 0 : code === null ? (signal ? 1 : 0) : code;
        if (exitCode !== 0 && stderr) {
          resolve(`${output}\n[stderr]: ${stderr}`.trim());
        } else {
          resolve(output.trim());
        }
      });

      stream.on('error', (streamErr: Error) => {
        clearTimeout(timeout);
        reject(new Error(`Erro no stream: ${streamErr.message}`));
      });
    });
  });
}

/**
 * Converte erros do ssh2 em mensagens amigáveis.
 */
export function buildFriendlyError(err: Error): string {
  const msg = err.message.toLowerCase();
  if (msg.includes('auth') || msg.includes('authentication')) return 'Falha de autenticação SSH: usuário ou senha/chave incorretos';
  if (msg.includes('timeout') || msg.includes('timed out')) return 'Timeout: host não respondeu no tempo esperado';
  if (msg.includes('econnrefused') || msg.includes('refused')) return 'Conexão recusada: verifique o host e a porta SSH';
  if (msg.includes('enotfound') || msg.includes('getaddrinfo')) return 'Host não encontrado: verifique o endereço do servidor';
  if (msg.includes('econnreset') || msg.includes('reset')) return 'Conexão resetada pelo servidor SSH';
  if (msg.includes('no supported authentication')) return 'Nenhum método de autenticação suportado pelo servidor';
  return `Erro SSH: ${err.message}`;
}
