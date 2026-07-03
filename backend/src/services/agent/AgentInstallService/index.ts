import { Client as SshClient, ConnectConfig } from 'ssh2';
import { logger } from '../../../utils/logger';
import { generateInstallScript } from '../AgentInstallScript';

export interface InstallConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
}

export type LogFn = (line: string) => void;

// ── Helpers SSH ───────────────────────────────────────────────────────────────

function connect(cfg: InstallConfig): Promise<SshClient> {
  return new Promise((resolve, reject) => {
    const conn = new SshClient();
    const timeout = setTimeout(() => {
      conn.destroy();
      reject(new Error(`Timeout ao conectar em ${cfg.host}:${cfg.port}`));
    }, 15_000);

    conn.on('ready', () => { clearTimeout(timeout); resolve(conn); });
    conn.on('error', (err) => { clearTimeout(timeout); reject(err); });

    const connectCfg: ConnectConfig = {
      host: cfg.host,
      port: cfg.port,
      username: cfg.username,
      readyTimeout: 12_000,
      ...(cfg.privateKey ? { privateKey: cfg.privateKey } : { password: cfg.password }),
    };
    conn.connect(connectCfg);
  });
}

function exec(conn: SshClient, command: string, log: LogFn): Promise<void> {
  return new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
      if (err) { reject(err); return; }

      stream.on('data', (data: Buffer) => {
        data.toString().split('\n').filter(Boolean).forEach((l) => log(`  ${l}`));
      });
      stream.stderr.on('data', (data: Buffer) => {
        data.toString().split('\n').filter(Boolean).forEach((l) => log(`  [stderr] ${l}`));
      });
      stream.on('close', (code: number | null | undefined, signal?: string) => {
        const exitCode =
          code === undefined ? 0 : code === null ? (signal ? 1 : 0) : code;
        if (exitCode !== 0) {
          reject(new Error(`Comando encerrou com código ${exitCode}`));
        } else {
          resolve();
        }
      });
    });
  });
}

/** Erro de rede no SSH automático (a conexão sai do servidor da API, não do PC do usuário). */
export function formatAgentInstallSshError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const l = raw.toLowerCase();
  if (
    l.includes('econnrefused') ||
    l.includes('connection refused') ||
    l.includes('etimedout') ||
    l.includes('timed out')
  ) {
    return `${raw}\nDica: o SSH automático parte do servidor da API (linha Servidor: acima). Libere a porta no firewall ou use instalação manual.`;
  }
  return raw;
}

// ── API pública ────────────────────────────────────────────────────────────────

export interface InstallAgentOptions {
  agentId: number;
  token: string;
  serverUrl: string;
  sshConfig: InstallConfig;
  onLog: LogFn;
}

export async function installAgent(opts: InstallAgentOptions): Promise<void> {
  const { token, serverUrl, sshConfig, onLog } = opts;

  const log: LogFn = (line) => {
    onLog(line);
    logger.debug('AgentInstall', { line });
  };

  log(`🔌 Conectando a ${sshConfig.host}:${sshConfig.port}...`);
  const conn = await connect(sshConfig);
  log('✅ SSH conectado.');

  const script = generateInstallScript({ token, serverUrl });

  try {
    log('📥 Baixando e instalando agente a partir do servidor ISP Consultor...');
    await exec(conn, `bash -s <<'ISPCONSULTOR_INSTALL_EOF'\n${script}\nISPCONSULTOR_INSTALL_EOF`, log);
    log('');
    log('🎉 Instalação concluída! O agente deve aparecer online em instantes.');
  } finally {
    conn.end();
  }
}
