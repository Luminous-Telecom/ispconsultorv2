import { Client as SshClient, ConnectConfig } from 'ssh2';
import { logger } from '../../../utils/logger';

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
          reject(new Error(`Comando encerrou com código ${exitCode}: ${command}`));
        } else {
          resolve();
        }
      });
    });
  });
}

function execOutput(conn: SshClient, command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
      if (err) { reject(err); return; }
      let out = '';
      stream.on('data', (d: Buffer) => { out += d.toString(); });
      stream.stderr.on('data', () => {});
      stream.on('close', () => resolve(out.trim()));
    });
  });
}

// ── Instalação Docker ─────────────────────────────────────────────────────────

async function checkAndInstallDocker(conn: SshClient, log: LogFn): Promise<void> {
  log('🔍 Verificando Docker...');

  const dockerVersion = await execOutput(conn, 'docker --version 2>/dev/null || echo "not_found"');

  if (dockerVersion.includes('Docker version')) {
    log(`✅ Docker já instalado: ${dockerVersion}`);
    return;
  }

  log('📦 Docker não encontrado. Detectando sistema operacional...');
  const osInfo = await execOutput(conn, 'cat /etc/os-release 2>/dev/null || uname -s');

  if (osInfo.includes('debian') || osInfo.includes('ubuntu') || osInfo.includes('Ubuntu') || osInfo.includes('Debian')) {
    log('🐧 Sistema Debian/Ubuntu detectado. Instalando Docker...');
    await exec(conn, 'apt-get update -qq', log);
    await exec(conn, 'apt-get install -y -qq ca-certificates curl gnupg', log);
    await exec(conn, 'install -m 0755 -d /etc/apt/keyrings', log);
    await exec(conn, 'curl -fsSL https://download.docker.com/linux/$(. /etc/os-release && echo "$ID")/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg 2>/dev/null', log);
    await exec(conn, 'chmod a+r /etc/apt/keyrings/docker.gpg', log);
    await exec(conn,
      'echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$(. /etc/os-release && echo "$ID") $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list',
      log
    );
    await exec(conn, 'apt-get update -qq', log);
    await exec(conn, 'apt-get install -y -qq docker-ce docker-ce-cli containerd.io', log);
    await exec(conn, 'systemctl enable docker && systemctl start docker', log);
  } else if (osInfo.includes('centos') || osInfo.includes('rhel') || osInfo.includes('fedora') || osInfo.includes('CentOS') || osInfo.includes('AlmaLinux') || osInfo.includes('Rocky')) {
    log('🐧 Sistema RHEL/CentOS detectado. Instalando Docker...');
    await exec(conn, 'yum install -y -q yum-utils', log);
    await exec(conn, 'yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo', log);
    await exec(conn, 'yum install -y -q docker-ce docker-ce-cli containerd.io', log);
    await exec(conn, 'systemctl enable docker && systemctl start docker', log);
  } else {
    throw new Error('Sistema operacional não suportado para instalação automática do Docker. Instale o Docker manualmente e tente novamente.');
  }

  log('✅ Docker instalado com sucesso!');
}

function isAgentDevServerUrl(serverUrl: string): boolean {
  return (
    serverUrl.includes('dev.luminoustelecom.com.br') ||
    serverUrl.includes('localhost') ||
    serverUrl.includes('127.0.0.1')
  );
}

function getDockerImage(serverUrl: string): string {
  const customImage = process.env.ISPCONSULTOR_AGENT_IMAGE;
  if (customImage) return customImage;
  const tag = isAgentDevServerUrl(serverUrl) ? 'dev' : 'prod';
  return `midia181/ispconsultor-tunnel:${tag}`;
}

export function getAgentContainerName(serverUrl: string): string {
  return isAgentDevServerUrl(serverUrl) ? 'ispconsultor-agent-dev' : 'ispconsultor-agent';
}

// ── Pull e run do container (imagem do Docker Hub) ─────────────────────────────

async function pullAndRunContainer(
  conn: SshClient,
  token: string,
  serverUrl: string,
  log: LogFn
): Promise<void> {
  const dockerImage = getDockerImage(serverUrl);
  const containerName = getAgentContainerName(serverUrl);

  log(`📥 Baixando imagem do agente (${dockerImage})...`);
  await exec(conn, `docker pull "${dockerImage}"`, log);

  log('🔄 Substituindo instalação anterior (se existir)...');
  await exec(conn, `docker rm -f ${containerName} 2>/dev/null || true`, log);

  log(`🚀 Iniciando container ${containerName}...`);
  await exec(conn,
    `docker run -d ` +
    `--name ${containerName} ` +
    `--restart unless-stopped ` +
    `"${dockerImage}" ` +
    `--token ${token}`,
    log
  );

  log('⏳ Aguardando inicialização do agente...');
  await new Promise((r) => setTimeout(r, 3000));

  const containerStatus = await execOutput(conn, `docker inspect --format='{{.State.Status}}' ${containerName} 2>/dev/null`);
  if (containerStatus === 'running') {
    log('✅ Container rodando com sucesso!');
  } else {
    const containerLogs = await execOutput(conn, `docker logs --tail 20 ${containerName} 2>&1`);
    throw new Error(`Container não está rodando (status: ${containerStatus}).\nLogs:\n${containerLogs}`);
  }
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

  try {
    await checkAndInstallDocker(conn, log);
    await pullAndRunContainer(conn, token, serverUrl, log);
    log('');
    log('🎉 Instalação concluída! O agente deve aparecer online em instantes.');
  } finally {
    conn.end();
  }
}
