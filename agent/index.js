#!/usr/bin/env node
'use strict';

/**
 * Backnet Agent
 *
 * Conecta ao servidor Backnet via WebSocket (outbound),
 * sem necessidade de abrir portas SSH no servidor.
 *
 * Uso (token único, formato Cloudflare):
 *   BACKNET_TOKEN=<base64({"s":"https://...","t":"..."})> node index.js
 *
 * Uso (separado):
 *   BACKNET_SERVER=https://... BACKNET_TOKEN=<token> node index.js
 *
 * Imagem Docker :dev / :prod: URLs fixas abaixo; canal via ENV BACKNET_AGENT_CHANNEL (build da imagem).
 *
 * Variáveis de ambiente:
 * | Variável                  | Padrão   | Descrição                                                                    |
 * |---------------------------|----------|------------------------------------------------------------------------------|
 * | BACKNET_TOKEN             | —        | Token de autenticação (formato Cloudflare base64 {s,t})                      |
 * | BACKNET_SERVER            | —        | URL do servidor Backnet                                                      |
 * | BACKNET_AGENT_CHANNEL     | —        | dev ou prod (define URL automaticamente)                                     |
 * | BACKNET_ALLOWED_BASE_PATH | /tmp     | Caminhos permitidos para file transfer (separados por vírgula)               |
 * | BACKNET_MAX_SHELLS        | 10       | Máximo de sessões de shell simultâneas                                       |
 * | BACKNET_SSH_STRICT_HOST   | false    | true = bloqueia conexões SSH sem fingerprint verificado                      |
 * | BACKNET_SSH_WARN_LEGACY   | true     | false = suprime aviso de algoritmos SSH legados                              |
 */

const { io } = require('socket.io-client');
const os = require('os');
const { Client: SshClient } = require('ssh2');
const { randomUUID } = require('crypto');

// ── Configuração ───────────────────────────────────────────────────────────────

/** URLs do Backnet por ambiente (imagem :dev ou :prod define o canal no build). */
const BACKNET_URL_BY_CHANNEL = {
  dev: 'https://dev.luminoustelecom.com.br',
  prod: 'https://backnet.app',
};

function getConfig() {
  const args = process.argv.slice(2);
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : null;
  };

  let server = get('--server') || process.env.BACKNET_SERVER || null;
  let token  = get('--token')  || process.env.BACKNET_TOKEN;

  const channel = (process.env.BACKNET_AGENT_CHANNEL || '').toLowerCase();
  if (!server && (channel === 'dev' || channel === 'prod')) {
    server = BACKNET_URL_BY_CHANNEL[channel];
  }

  // Token combinado base64({"s":"url","t":"token"}) — sobrescreve servidor embutido
  if (token && !server) {
    try {
      const decoded = Buffer.from(token.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
      const parsed = JSON.parse(decoded);
      if (parsed.s && parsed.t) {
        server = parsed.s;
        token = parsed.t;
      }
    } catch { /* ignora */ }
  }

  if (!server) {
    console.error(
      '[backnet-agent] Servidor não definido. Imagem deve ter BACKNET_AGENT_CHANNEL=dev ou prod no build ' +
        '(tags :dev / :prod), ou use --server / BACKNET_SERVER / token base64 {s,t}.'
    );
    process.exit(1);
  }
  if (!token) {
    console.error('[backnet-agent] BACKNET_TOKEN não definido');
    process.exit(1);
  }

  return { server, token };
}

const config = getConfig();

const SSH_STRICT_HOST = process.env.BACKNET_SSH_STRICT_HOST === 'true';
const SSH_WARN_LEGACY = process.env.BACKNET_SSH_WARN_LEGACY !== 'false';
const MAX_CONCURRENT_SHELLS = parseInt(process.env.BACKNET_MAX_SHELLS || '10', 10);

/** Base paths permitidos para file transfer (segurança: evita path traversal). Ex: /tmp,/home/user/dados */
const ALLOWED_BASE_PATHS = (process.env.BACKNET_ALLOWED_BASE_PATH || '/tmp')
  .split(',')
  .map((p) => p.trim())
  .filter(Boolean)
  .map((p) => require('path').resolve(p));

function getRealPathSafe(filePath) {
  const path = require('path');
  const fs = require('fs');
  const resolved = path.resolve(filePath);
  try {
    return fs.realpathSync(resolved);
  } catch {
    const dir = path.dirname(resolved);
    try {
      return path.join(fs.realpathSync(dir), path.basename(resolved));
    } catch {
      return null;
    }
  }
}

function isPathAllowed(filePath) {
  if (!filePath || typeof filePath !== 'string') return false;
  const path = require('path');
  const resolved = path.resolve(filePath);
  if (resolved.includes('..')) return false;
  const realPath = getRealPathSafe(filePath);
  if (!realPath) return false;
  return ALLOWED_BASE_PATHS.some((base) => {
    let realBase;
    try {
      realBase = require('fs').realpathSync(base);
    } catch {
      realBase = base;
    }
    return realPath === realBase || realPath.startsWith(realBase + path.sep);
  });
}

// ── Estado ────────────────────────────────────────────────────────────────────

/** @type {Map<string, import('node-pty').IPty>} */
const shells = new Map();

/** @type {Map<string, import('ssh2').ClientChannel>} */
const proxySessions = new Map();

// ── Node-pty (carregamento seguro) ─────────────────────────────────────────────

let pty;
try {
  pty = require('node-pty');
} catch {
  console.warn('[backnet-agent] node-pty não disponível — usando fallback (child_process)');
  pty = null;
}

const SENSITIVE_ENV_KEYS = new Set([
  'BACKNET_TOKEN', 'BACKNET_SERVER', 'PATH', 'LD_PRELOAD', 'LD_LIBRARY_PATH',
  'NODE_OPTIONS', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'SSH_AUTH_SOCK',
]);

function getSafeEnv() {
  const env = {
    ...process.env,
    TERM: 'xterm-256color',
    COLORTERM: 'truecolor',
    FORCE_COLOR: '1',
    CLICOLOR: '1',
  };
  for (const key of Object.keys(env)) {
    const upper = key.toUpperCase();
    if (SENSITIVE_ENV_KEYS.has(key) || SENSITIVE_ENV_KEYS.has(upper) || upper.startsWith('BACKNET_')) {
      delete env[key];
    }
  }
  return env;
}

function resolveShell() {
  if (process.platform === 'win32') return 'cmd.exe';
  if (process.env.SHELL) return process.env.SHELL;
  const fs = require('fs');
  for (const candidate of ['/bin/bash', '/usr/bin/bash', '/bin/sh']) {
    try { fs.accessSync(candidate, fs.constants.X_OK); return candidate; } catch { /* tenta próximo */ }
  }
  return '/bin/sh';
}

function spawnShell(cols, rows) {
  const shell = resolveShell();

  const safeEnv = getSafeEnv();
  const c = Math.min(Math.max(Number(cols) || 80, 8), 500);
  const r = Math.min(Math.max(Number(rows) || 24, 4), 200);

  if (pty) {
    return pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: c,
      rows: r,
      env: safeEnv,
    });
  }

  // Fallback sem PTY (saída sem formatação, funcional)
  const { spawn } = require('child_process');
  const child = spawn(shell, [], {
    env: safeEnv,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  const nativeKill = child.kill.bind(child);
  child.kill = () => {
    try { nativeKill('SIGTERM'); } catch { /* ignora */ }
  };

  child.stdin.on('error', () => {
    try { child.kill(); } catch { /* ignora */ }
  });

  // Adapta a interface para ser compatível com node-pty
  child.write = (data) => child.stdin.write(data);
  child.resize = () => {};
  child.onData = (cb) => {
    child.stdout.on('data', (d) => cb(d.toString()));
    child.stderr.on('data', (d) => cb(d.toString()));
  };
  child.onExit = (cb) => child.on('exit', (code) => cb({ exitCode: code ?? 0 }));
  return child;
}

// ── Conexão Socket.IO ─────────────────────────────────────────────────────────

console.log(`[backnet-agent] Conectando a ${config.server}...`);

const socket = io(`${config.server}/backnet-agent`, {
  path: '/socket.io',
  auth: { token: config.token },
  transports: ['polling', 'websocket'],
  reconnection: true,
  reconnectionDelay: 3000,
  reconnectionDelayMax: 30000,
  reconnectionAttempts: Infinity,
});

/** Socket.IO desliga o backoff após CONNECT_ERROR (ex.: unauthorized) — precisamos agendar connect() manual. */
const RECONNECT_DELAY_MS = 3000;
let reconnectTimer = null;
/** Token regenerado: não ficar em loop até recriar o container com novo --token */
let pauseAutoReconnect = false;
/** Servidor avisou desativação no painel — reconectar quando reativar */
let awaitingPanelReactivation = false;
let loggedShortUnauthorizedHint = false;

function scheduleReconnect(logLine) {
  if (pauseAutoReconnect) return;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (logLine) console.log(logLine);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (!socket.connected) {
      try {
        socket.connect();
      } catch (e) {
        console.error('[backnet-agent] Erro ao chamar connect():', e?.message || e);
        scheduleReconnect(`[backnet-agent] Nova tentativa em ${RECONNECT_DELAY_MS / 1000}s...`);
      }
    }
  }, RECONNECT_DELAY_MS);
}

socket.on('agent:session-ended', (payload) => {
  const r = payload && payload.reason;
  if (r === 'token_regenerated') {
    pauseAutoReconnect = true;
    awaitingPanelReactivation = false;
    loggedShortUnauthorizedHint = false;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    console.log(
      '[backnet-agent] Token revogado no Backnet. Recrie o container com o novo --token (sem tentativas automáticas).'
    );
    return;
  }
  pauseAutoReconnect = false;
  awaitingPanelReactivation = r === 'inactive';
  loggedShortUnauthorizedHint = false;
  if (r === 'inactive') {
    console.log('[backnet-agent] Túnel desativado no Backnet. Reconexão automática ao reativar o agente.');
  } else if (r) {
    console.log('[backnet-agent] Sessão encerrada pelo servidor:', r);
  }
});

socket.on('connect', () => {
  pauseAutoReconnect = false;
  awaitingPanelReactivation = false;
  loggedShortUnauthorizedHint = false;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  console.log('[backnet-agent] Conectado ao servidor. Socket ID:', socket.id);

  socket.emit('agent:info', {
    hostname: os.hostname(),
    os_info: `${os.type()} ${os.release()} (${os.arch()})`,
    version: require('./package.json').version,
  });
});

socket.on('agent:ready', () => {
  console.log('[backnet-agent] Agente pronto e registrado.');
});

socket.on('connect_error', (err) => {
  const msg = err?.message || String(err);
  console.error('[backnet-agent] Erro de conexão:', msg);
  if (pauseAutoReconnect) return;
  if (/unauthorized/i.test(msg)) {
    if (awaitingPanelReactivation) {
      if (!loggedShortUnauthorizedHint) {
        console.log(
          '[backnet-agent] Aguardando reativação no painel (ou token válido). Tentando a cada 3s.'
        );
        loggedShortUnauthorizedHint = true;
      }
    } else {
      console.error(
        '[backnet-agent] O servidor recusou o token. Verifique: (1) agente "Ativo" no Backnet, (2) --token igual ao token atual do agente (se regenerou, rode o container de novo com o novo token), (3) URL dev/prod correta na imagem (:dev vs :prod).'
      );
    }
  }
  scheduleReconnect(
    `[backnet-agent] Próxima tentativa de conexão em ${RECONNECT_DELAY_MS / 1000}s...`
  );
});

socket.on('disconnect', (reason) => {
  console.warn('[backnet-agent] Desconectado:', reason);
  for (const [, shell] of shells) {
    try { shell.kill(); } catch { /* ignora */ }
  }
  shells.clear();
  for (const [, ch] of proxySessions) {
    try { ch.end(); } catch { /* ignora */ }
  }
  proxySessions.clear();
  uploadBuffers.clear();

  if (reason === 'io server disconnect') {
    scheduleReconnect(
      '[backnet-agent] Conexão encerrada pelo servidor; nova tentativa em 3s...'
    );
  }
});

socket.on('agent:ping', ({ pingId }) => {
  if (typeof pingId === 'string' && pingId) socket.emit('agent:pong', { pingId });
});

// Heartbeat a cada 25s para manter last_seen_at atualizado
setInterval(() => {
  if (socket.connected) socket.emit('agent:heartbeat');
}, 25_000);

// ── Shell local ───────────────────────────────────────────────────────────────

socket.on('shell:open', ({ sessionId, cols, rows }) => {
  if (shells.size + proxySessions.size >= MAX_CONCURRENT_SHELLS) {
    console.warn(`[backnet-agent] Limite de sessões atingido (${MAX_CONCURRENT_SHELLS}). Rejeitando sessão ${sessionId}.`);
    socket.emit('shell:exit', { sessionId, code: 1 });
    return;
  }
  console.log(`[backnet-agent] Abrindo shell — sessão ${sessionId}`);

  try {
    const shell = spawnShell(cols, rows);

    shell.onData((data) => {
      socket.emit('shell:data', { sessionId, data });
    });

    shell.onExit(({ exitCode }) => {
      console.log(`[backnet-agent] Shell encerrado (${exitCode}) — sessão ${sessionId}`);
      shells.delete(sessionId);
      socket.emit('shell:exit', { sessionId, code: exitCode });
    });

    shells.set(sessionId, shell);
  } catch (err) {
    console.error('[backnet-agent] Erro ao abrir shell:', err.message);
    socket.emit('shell:exit', { sessionId, code: 1 });
  }
});

const MAX_INPUT_BYTES = 65536;

socket.on('shell:write', ({ sessionId, data }) => {
  if (typeof data !== 'string' || data.length > MAX_INPUT_BYTES) return;

  const shell = shells.get(sessionId);
  if (shell) {
    shell.write(data);
    return;
  }

  const stream = proxySessions.get(sessionId);
  if (stream) {
    stream.write(data);
    return;
  }

  console.warn(`[backnet-agent] shell:write ignorado: sessão desconhecida ${sessionId}`);
});

socket.on('shell:resize', ({ sessionId, cols, rows }) => {
  const shell = shells.get(sessionId);
  if (shell) {
    try { shell.resize(cols, rows); } catch { /* ignora */ }
  }
});

socket.on('shell:close', ({ sessionId }) => {
  const shell = shells.get(sessionId);
  if (shell) {
    try { shell.kill(); } catch { /* ignora */ }
    shells.delete(sessionId);
    console.log(`[backnet-agent] Shell encerrado pelo servidor — sessão ${sessionId}`);
  }
});

// ── Proxy SSH (para outros hosts na rede local) ───────────────────────────────

/** Alinhado ao backend (SshConnectionService) — equipamentos com ciphers/KEX legados */
const SSH_LEGACY_ALGORITHMS = {
  kex: [
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
  hmac: ['hmac-sha2-256', 'hmac-sha2-512', 'hmac-sha1', 'hmac-md5'],
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

socket.on('proxy:ssh:test', ({ testId, host, port, username, password, privateKey, hostFingerprint }) => {
  if (!testId || !host || !username) return;
  const p = Number(port) || 22;
  if (SSH_WARN_LEGACY) {
    console.warn(
      `[backnet-agent] Conexão SSH para ${host}:${p} usa algoritmos legados (inclui DH group1, 3DES, MD5). ` +
      'Defina BACKNET_SSH_WARN_LEGACY=false para suprimir este aviso.'
    );
  }
  const start = Date.now();
  const conn = new SshClient();
  conn.on('ready', () => {
    const latencyMs = Date.now() - start;
    conn.end();
    socket.emit('proxy:ssh:test:result', { testId, ok: true, latencyMs });
  });
  conn.on('error', (err) => {
    socket.emit('proxy:ssh:test:result', { testId, ok: false, error: err.message });
  });
  try {
    const useKey = typeof privateKey === 'string' && privateKey.trim().length > 0;
    conn.connect({
      host,
      port: p,
      username,
      readyTimeout: 15000,
      algorithms: SSH_LEGACY_ALGORITHMS,
      hostHash: 'sha256',
      hostVerifier: (fingerprint) => {
        if (hostFingerprint) {
          const match = fingerprint === hostFingerprint;
          if (!match) console.error(`[backnet-agent] SSH fingerprint mismatch para ${host}: esperado ${hostFingerprint}, recebido ${fingerprint}`);
          return match;
        }
        if (SSH_STRICT_HOST) {
          console.error(`[backnet-agent] Conexão SSH bloqueada: fingerprint ausente e BACKNET_SSH_STRICT_HOST=true (host: ${host})`);
          return false;
        }
        console.warn(`[backnet-agent] SSH: fingerprint não verificado para ${host}:${p}. Defina BACKNET_SSH_STRICT_HOST=true para bloquear conexões sem fingerprint.`);
        return true;
      },
      ...(useKey ? { privateKey: privateKey.trim() } : { password }),
    });
  } catch (e) {
    socket.emit('proxy:ssh:test:result', { testId, ok: false, error: e.message });
  }
});

socket.on(
  'proxy:ssh:exec',
  ({ execId, host, port, username, password, privateKey, command, timeoutMs, hostFingerprint }) => {
    if (!execId || !host || !username || !command) {
      console.warn('[backnet-agent] proxy:ssh:exec parâmetros inválidos', {
        hasExecId: Boolean(execId),
        hasHost: Boolean(host),
        hasUsername: Boolean(username),
        hasCommand: Boolean(command),
      });
      if (execId) {
        socket.emit('proxy:ssh:exec:result', {
          execId,
          ok: false,
          error: 'Parâmetros inválidos (execId/host/username/command)',
        });
      }
      return;
    }
    const timeout = Math.min(Math.max(Number(timeoutMs) || 120000, 5000), 600000);
    const p = Number(port) || 22;
    const useKey = typeof privateKey === 'string' && privateKey.trim().length > 0;
    if (SSH_WARN_LEGACY) {
      console.warn(
        `[backnet-agent] Conexão SSH para ${host}:${p} usa algoritmos legados (inclui DH group1, 3DES, MD5). ` +
        'Defina BACKNET_SSH_WARN_LEGACY=false para suprimir este aviso.'
      );
    }
    console.log(
      `[backnet-agent] proxy:ssh:exec início execId=${execId} → ${host}:${p} user=${username} auth=${useKey ? 'key' : 'password'} timeout=${timeout}ms cmd=${JSON.stringify(command)}`
    );
    const conn = new SshClient();
    let settled = false;

    const fail = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      console.warn(`[backnet-agent] proxy:ssh:exec falha execId=${execId}`, String(error));
      try {
        conn.destroy();
      } catch {
        /* ignora */
      }
      socket.emit('proxy:ssh:exec:result', { execId, ok: false, error: String(error) });
    };

    const timer = setTimeout(() => {
      fail('Timeout ao executar comando SSH');
    }, timeout);

    conn.on('ready', () => {
      console.log(`[backnet-agent] proxy:ssh:exec SSH ready execId=${execId} → executando comando`);
      conn.exec(command, (err, stream) => {
        if (err) {
          fail(err.message);
          return;
        }
        let out = '';
        let errOut = '';
        stream.on('data', (data) => {
          out += data.toString('utf8');
        });
        stream.stderr.on('data', (data) => {
          errOut += data.toString('utf8');
        });
        stream.on('close', (code) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          const combined = (errOut ? `${out}\n[stderr]: ${errOut}` : out).trim();
          const ok = code === 0;
          const outBytes = Buffer.byteLength(combined, 'utf8');
          console.log(
            `[backnet-agent] proxy:ssh:exec fim execId=${execId} exit=${code} ok=${ok} outputBytes=${outBytes}`
          );
          socket.emit('proxy:ssh:exec:result', {
            execId,
            ok,
            output: combined,
            ...(ok ? {} : { error: errOut || `Comando encerrou com código ${code}` }),
          });
          try {
            conn.end();
          } catch {
            /* ignora */
          }
        });
        stream.on('error', (streamErr) => {
          fail(streamErr.message);
        });
      });
    });

    conn.on('error', (e) => {
      fail(e.message);
    });

    try {
      conn.connect({
        host,
        port: p,
        username,
        readyTimeout: 15000,
        algorithms: SSH_LEGACY_ALGORITHMS,
        hostHash: 'sha256',
        hostVerifier: (fingerprint) => {
          if (hostFingerprint) {
            const match = fingerprint === hostFingerprint;
            if (!match) console.error(`[backnet-agent] SSH fingerprint mismatch para ${host}: esperado ${hostFingerprint}, recebido ${fingerprint}`);
            return match;
          }
          if (SSH_STRICT_HOST) {
            console.error(`[backnet-agent] Conexão SSH bloqueada: fingerprint ausente e BACKNET_SSH_STRICT_HOST=true (host: ${host})`);
            return false;
          }
          console.warn(`[backnet-agent] SSH: fingerprint não verificado para ${host}:${p}. Defina BACKNET_SSH_STRICT_HOST=true para bloquear conexões sem fingerprint.`);
          return true;
        },
        ...(useKey ? { privateKey: privateKey.trim() } : { password }),
      });
    } catch (e) {
      fail(e.message);
    }
  }
);

socket.on('proxy:ssh:open', ({ sessionId, host, port, username, password, privateKey, cols, rows, hostFingerprint }) => {
  if (shells.size + proxySessions.size >= MAX_CONCURRENT_SHELLS) {
    console.warn(`[backnet-agent] Limite de sessões atingido (${MAX_CONCURRENT_SHELLS}). Rejeitando sessão ${sessionId}.`);
    socket.emit('shell:exit', { sessionId, code: 1 });
    return;
  }
  const p = Number(port) || 22;
  if (SSH_WARN_LEGACY) {
    console.warn(
      `[backnet-agent] Conexão SSH para ${host}:${p} usa algoritmos legados (inclui DH group1, 3DES, MD5). ` +
      'Defina BACKNET_SSH_WARN_LEGACY=false para suprimir este aviso.'
    );
  }
  console.log(`[backnet-agent] Proxy SSH → ${host}:${p} (${username}) — sessão ${sessionId}`);

  const c = Math.min(Math.max(Number(cols) || 80, 8), 500);
  const r = Math.min(Math.max(Number(rows) || 24, 4), 200);
  const conn = new SshClient();

  conn.on('ready', () => {
    conn.shell({ term: 'xterm-256color', cols: c, rows: r }, (err, stream) => {
      if (err) {
        console.error('[backnet-agent] Erro ao abrir shell SSH:', err.message);
        socket.emit('shell:exit', { sessionId, code: 1 });
        conn.end();
        return;
      }

      proxySessions.set(sessionId, stream);

      stream.on('data', (data) => {
        socket.emit('shell:data', { sessionId, data: data.toString('utf8') });
      });

      stream.stderr.on('data', (data) => {
        socket.emit('shell:data', { sessionId, data: data.toString('utf8') });
      });

      stream.on('close', () => {
        proxySessions.delete(sessionId);
        socket.emit('shell:exit', { sessionId, code: 0 });
        conn.end();
      });
    });
  });

  conn.on('error', (err) => {
    console.error('[backnet-agent] Erro SSH:', err.message);
    socket.emit('shell:data', {
      sessionId,
      data: `\r\n\x1b[1;31m[Erro SSH] ${err.message}\x1b[0m\r\n`,
    });
    socket.emit('shell:exit', { sessionId, code: 1 });
    proxySessions.delete(sessionId);
  });

  const useKey = typeof privateKey === 'string' && privateKey.trim().length > 0;
  conn.connect({
    host,
    port: p,
    username,
    readyTimeout: 15000,
    algorithms: SSH_LEGACY_ALGORITHMS,
    hostHash: 'sha256',
    hostVerifier: (fingerprint) => {
      if (hostFingerprint) {
        const match = fingerprint === hostFingerprint;
        if (!match) console.error(`[backnet-agent] SSH fingerprint mismatch para ${host}: esperado ${hostFingerprint}, recebido ${fingerprint}`);
        return match;
      }
      if (SSH_STRICT_HOST) {
        console.error(`[backnet-agent] Conexão SSH bloqueada: fingerprint ausente e BACKNET_SSH_STRICT_HOST=true (host: ${host})`);
        return false;
      }
      console.warn(`[backnet-agent] SSH: fingerprint não verificado para ${host}:${p}. Defina BACKNET_SSH_STRICT_HOST=true para bloquear conexões sem fingerprint.`);
      return true;
    },
    ...(useKey ? { privateKey: privateKey.trim() } : { password }),
  });
});

socket.on('proxy:ssh:resize', ({ sessionId, cols, rows }) => {
  const stream = proxySessions.get(sessionId);
  if (stream) {
    try { stream.setWindow(rows, cols, 0, 0); } catch { /* ignora */ }
  }
});

socket.on('proxy:ssh:close', ({ sessionId }) => {
  const stream = proxySessions.get(sessionId);
  if (stream) {
    try { stream.end(); } catch { /* ignora */ }
    proxySessions.delete(sessionId);
  }
});

// ── File download (agente lê o arquivo e envia em chunks) ─────────────────────

socket.on('file:download:request', ({ transferId, path }) => {
  const fs = require('fs');
  if (!isPathAllowed(path)) {
    console.warn('[backnet-agent] Download bloqueado: path fora da área permitida', { path });
    socket.emit('file:chunk', { transferId, chunk: '', done: true, error: 'Caminho não permitido' });
    return;
  }
  try {
    const buf = fs.readFileSync(path);
    const CHUNK = 64 * 1024; // 64 KB por chunk
    let offset = 0;

    while (offset < buf.length) {
      const slice = buf.slice(offset, offset + CHUNK);
      offset += slice.length;
      const done = offset >= buf.length;
      socket.emit('file:chunk', {
        transferId,
        chunk: slice.toString('base64'),
        done,
      });
    }

    if (buf.length === 0) {
      socket.emit('file:chunk', { transferId, chunk: '', done: true });
    }
  } catch (err) {
    console.error('[backnet-agent] Erro no download:', err.message);
    socket.emit('file:chunk', { transferId, chunk: '', done: true, error: err.message });
  }
});

// ── File upload (agente recebe chunks e escreve o arquivo) ────────────────────

const uploadBuffers = new Map();

socket.on('file:upload:start', ({ transferId, path, size }) => {
  if (!isPathAllowed(path)) {
    console.warn('[backnet-agent] Upload bloqueado: path fora da área permitida', { path });
    return;
  }
  if (size > 100 * 1024 * 1024) {
    console.warn('[backnet-agent] Upload bloqueado: tamanho excede 100MB', { size });
    return;
  }
  console.log(`[backnet-agent] Upload iniciado: ${path} (${size} bytes)`);
  uploadBuffers.set(transferId, { path, chunks: [], size });
});

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

const MAX_CHUNK_BYTES = 256 * 1024;

socket.on('file:upload:chunk', ({ transferId, chunk, done }) => {
  const buf = uploadBuffers.get(transferId);
  if (!buf || typeof chunk !== 'string') return;

  const decoded = Buffer.from(chunk, 'base64');
  if (decoded.length > MAX_CHUNK_BYTES) {
    uploadBuffers.delete(transferId);
    return;
  }
  buf.chunks.push(decoded);
  const total = buf.chunks.reduce((acc, c) => acc + c.length, 0);
  if (total > MAX_UPLOAD_BYTES) {
    console.warn('[backnet-agent] Upload abortado: excede 100MB');
    uploadBuffers.delete(transferId);
    return;
  }

  if (done) {
    const fs = require('fs');
    try {
      fs.writeFileSync(buf.path, Buffer.concat(buf.chunks));
      console.log(`[backnet-agent] Upload concluído: ${buf.path}`);
    } catch (err) {
      console.error('[backnet-agent] Erro no upload:', err.message);
    }
    uploadBuffers.delete(transferId);
  }
});

// ── Tratamento de erros não capturados ─────────────────────────────────────────

process.on('uncaughtException', (err) => {
  console.error('[backnet-agent] Erro não capturado:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('[backnet-agent] Promise rejeitada:', reason);
});

process.on('SIGINT', () => {
  console.log('\n[backnet-agent] Encerrando...');
  socket.disconnect();
  process.exit(0);
});
