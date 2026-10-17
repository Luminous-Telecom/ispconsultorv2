import { Client as SshClient, ClientChannel } from 'ssh2';
import type { SshDeviceShape as SshDevice } from '../sshDeviceShape';
import { openDeviceConnection } from '../SshConnectionService';
import { logSshAudit } from '../SshAuditService';
import { logger } from '../../../utils/logger';
import { hrtimeMsSince, isSshTerminalLatencyDebugEnabled } from '../../../utils/terminalLatencyDebug';

interface TerminalSession {
  sessionId: string;
  stream: ClientChannel;
  deviceConn: SshClient;
  deviceId: number;
  deviceName: string;
  empresaId: number | null;
  userId: string;
  ip: string;
  openedAt: Date;
  onOutput: (data: string) => void;
  onClose: (reason: string) => void;
  /** Marca hrtime após stdin — primeiro chunk de saída mede eco SSH (debug latência). */
  awaitingEchoSince: bigint | null;
}

const sessions = new Map<string, TerminalSession>();
const commandBuffers = new Map<string, string>();

function stripAnsiAndControl(str: string): string {
  return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').replace(/[\x00-\x1f\x7f]/g, '').trim();
}

/**
 * Abre um shell interativo para o device e retorna o sessionId.
 */
export async function createTerminalSession(
  device: SshDevice,
  userId: string,
  ip: string,
  sessionId: string,
  onOutput: (data: string) => void,
  onClose: (reason: string) => void,
  options?: { localAddress?: string }
): Promise<string> {
  const deviceConn = await openDeviceConnection(device, options);

  return new Promise((resolve, reject) => {
    deviceConn.shell({ term: 'xterm-256color', cols: 80, rows: 24 }, (err, stream) => {
      if (err) {
        try { deviceConn.end(); } catch { /* ignora */ }
        reject(new Error(`Erro ao abrir shell: ${err.message}`));
        return;
      }

      const session: TerminalSession = {
        sessionId,
        stream,
        deviceConn,
        deviceId: device.id,
        deviceName: device.name,
        empresaId: device.empresa_id ?? null,
        userId,
        ip,
        openedAt: new Date(),
        onOutput,
        onClose,
        awaitingEchoSince: null,
      };

      sessions.set(sessionId, session);

      const emitOut = (data: Buffer) => {
        const str = data.toString('utf8');
        if (isSshTerminalLatencyDebugEnabled() && session.awaitingEchoSince !== null) {
          logger.info('SSH terminal latência: eco após entrada (SSH direto do backend)', {
            sessionIdShort: sessionId.slice(0, 8),
            delayMs: hrtimeMsSince(session.awaitingEchoSince),
            outBytes: Buffer.byteLength(str, 'utf8'),
          });
          session.awaitingEchoSince = null;
        }
        onOutput(str);
      };

      stream.on('data', emitOut);

      stream.stderr?.on('data', emitOut);

      stream.on('close', () => {
        sessions.delete(sessionId);
        commandBuffers.delete(sessionId);
        try { deviceConn.end(); } catch { /* ignora */ }

        logSshAudit({
          action: 'TERMINAL_CLOSE',
          userId,
          empresaId: session.empresaId,
          deviceId: device.id,
          deviceName: device.name,
          success: true,
          ip,
          duration: Date.now() - session.openedAt.getTime(),
        });

        logger.info('SSH terminal: sessão encerrada pelo servidor', { sessionId, device: device.name });
        onClose('Sessão encerrada pelo servidor');
      });

      stream.on('error', (streamErr: Error) => {
        sessions.delete(sessionId);
        commandBuffers.delete(sessionId);
        try { deviceConn.end(); } catch { /* ignora */ }
        logger.warn('SSH terminal: erro no stream', { sessionId, error: streamErr.message });
        onClose(`Erro no terminal: ${streamErr.message}`);
      });

      logSshAudit({
        action: 'TERMINAL_OPEN',
        userId,
        empresaId: device.empresa_id ?? null,
        deviceId: device.id,
        deviceName: device.name,
        success: true,
        ip,
      });

      logger.info('SSH terminal: sessão aberta', { sessionId, device: device.name, userId });
      resolve(sessionId);
    });
  });
}

/**
 * Escreve dados no stdin do terminal.
 * Captura linhas completas (ao pressionar Enter) para auditoria.
 */
export function writeToTerminal(sessionId: string, data: string): void {
  const session = sessions.get(sessionId);
  if (!session) {
    logger.warn('SSH terminal: sessão não encontrada para escrita', { sessionId });
    return;
  }

  const dbg = isSshTerminalLatencyDebugEnabled();
  const tProc = dbg ? process.hrtime.bigint() : 0n;

  let buf = commandBuffers.get(sessionId) ?? '';
  buf += data;

  const lines: string[] = [];
  let remaining = buf;
  const parts = remaining.split(/\r\n|\r|\n/);
  if (parts.length > 1) {
    for (let i = 0; i < parts.length - 1; i++) {
      lines.push(parts[i]!);
    }
    remaining = parts[parts.length - 1] ?? '';
  }

  commandBuffers.set(sessionId, remaining);

  for (const line of lines) {
    const cmd = stripAnsiAndControl(line);
    if (cmd.length > 0 && cmd.length < 2000) {
      logSshAudit({
        action: 'TERMINAL_COMMAND',
        userId: session.userId,
        empresaId: session.empresaId,
        deviceId: session.deviceId,
        deviceName: session.deviceName,
        command: cmd,
        success: true,
        ip: session.ip,
      });
    }
  }

  session.awaitingEchoSince = process.hrtime.bigint();
  session.stream.write(data);

  if (dbg) {
    logger.info('SSH terminal latência: stdin escrito (SSH direto)', {
      sessionIdShort: sessionId.slice(0, 8),
      byteLength: Buffer.byteLength(data, 'utf8'),
      writeToTerminalProcessMs: hrtimeMsSince(tProc),
    });
  }
}

/**
 * Redimensiona o PTY do terminal.
 */
export function resizeTerminal(sessionId: string, cols: number, rows: number): void {
  const session = sessions.get(sessionId);
  if (!session) return;
  session.stream.setWindow(rows, cols, 0, 0);
}

/**
 * Encerra uma sessão de terminal.
 */
export function closeTerminalSession(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (!session) return;

  sessions.delete(sessionId);
  commandBuffers.delete(sessionId);

  try { session.stream.end(); } catch { /* ignora */ }
  try { session.deviceConn.end(); } catch { /* ignora */ }

  logger.info('SSH terminal: sessão encerrada pelo cliente', { sessionId });
}

export function getSessionsByUser(userId: string): string[] {
  const result: string[] = [];
  for (const [id, session] of sessions) {
    if (session.userId === userId) result.push(id);
  }
  return result;
}
