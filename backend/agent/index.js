#!/usr/bin/env node
'use strict';

/**
 * ISP Consultor Agent
 *
 * Conecta ao servidor ISP Consultor via WebSocket (outbound),
 * sem necessidade de abrir portas SSH no servidor.
 *
 * Uso (token único, formato Cloudflare):
 *   ISPCONSULTOR_TOKEN=<base64({"s":"https://...","t":"..."})> node index.js
 *
 * Uso (separado):
 *   ISPCONSULTOR_SERVER=https://... ISPCONSULTOR_TOKEN=<token> node index.js
 *
 * Canal dev/prod: defina ISPCONSULTOR_AGENT_CHANNEL ou ISPCONSULTOR_SERVER conforme a tabela abaixo.
 *
 * Variáveis de ambiente:
 * | Variável                  | Padrão   | Descrição                                                                    |
 * |---------------------------|----------|------------------------------------------------------------------------------|
 * | ISPCONSULTOR_TOKEN             | —        | Token de autenticação (formato Cloudflare base64 {s,t})                      |
 * | ISPCONSULTOR_SERVER            | —        | URL do servidor ISP Consultor                                                      |
 * | ISPCONSULTOR_AGENT_CHANNEL     | —        | dev ou prod (define URL automaticamente)                                     |
 * | ISPCONSULTOR_ALLOWED_BASE_PATH | /tmp     | Caminhos permitidos para file transfer (separados por vírgula)               |
 * | ISPCONSULTOR_MAX_SHELLS        | 10       | Máximo de sessões de shell simultâneas                                       |
 * | ISPCONSULTOR_SSH_STRICT_HOST   | false    | true = bloqueia conexões SSH sem fingerprint verificado                      |
 * | ISPCONSULTOR_SSH_WARN_LEGACY   | true     | false = suprime aviso de algoritmos SSH legados                              |
 *
 * Proxy SSH: o servidor envia deviceType (mikrotik, huawei, cisco, …) em proxy:ssh:test|exec|open;
 * sem campo, usa perfil base. Cisco adiciona KEX group15/16/18 e host key ssh-dss.
 */

const { io } = require('socket.io-client');
const os = require('os');
const http = require('http');
const https = require('https');
const { URL: NodeURL } = require('url');
const { Client: SshClient } = require('ssh2');
const crypto = require('crypto');
const { randomUUID } = crypto;

// ── HTTP GET + Digest (SwOS /backup.swb) — só módulos nativos (sem node-fetch/digest-fetch) ──

function md5Hex(s) {
  return crypto.createHash('md5').update(s, 'utf8').digest('hex');
}

function digVal(www, field) {
  const q = new RegExp(`${field}\\s*=\\s*"([^"]*)"`, 'i');
  let m = www.match(q);
  if (m) return m[1];
  const u = new RegExp(`${field}\\s*=\\s*([^,\\s]+)`, 'i');
  m = www.match(u);
  return m ? String(m[1]).replace(/,$/, '') : null;
}

function httpRequestBuffer(urlStr, requestHeaders, timeoutMs) {
  return new Promise((resolve, reject) => {
    const u = new NodeURL(urlStr);
    const lib = u.protocol === 'https:' ? https : http;
    const port = u.port ? Number(u.port) : u.protocol === 'https:' ? 443 : 80;
    const chunks = [];
    const req = lib.request(
      {
        hostname: u.hostname,
        port,
        path: u.pathname + u.search,
        method: 'GET',
        headers: requestHeaders || {},
        timeout: timeoutMs,
      },
      (res) => {
        res.on('data', (c) => chunks.push(c));
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

async function httpGetWithDigestAuth(urlStr, username, password, timeoutMs) {
  const u = new NodeURL(urlStr);
  const uri = `${u.pathname}${u.search || ''}` || '/';
  const r1 = await httpRequestBuffer(urlStr, {}, timeoutMs);
  if (r1.statusCode >= 200 && r1.statusCode < 300) {
    if (r1.body.length > 0) return { ok: true, statusCode: r1.statusCode, body: r1.body };
    return { ok: false, statusCode: r1.statusCode, error: 'Resposta HTTP vazia' };
  }
  if (r1.statusCode !== 401) {
    return { ok: false, statusCode: r1.statusCode, error: `HTTP ${r1.statusCode}` };
  }
  const raw = r1.headers['www-authenticate'] || r1.headers['WWW-Authenticate'];
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
  let qopUse = null;
  if (qopRaw) {
    const parts = String(qopRaw)
      .split(',')
      .map((x) => x.trim().replace(/^"|"$/g, ''));
    if (parts.includes('auth')) qopUse = 'auth';
  }
  const nc = '00000001';
  const cnonce = crypto.randomBytes(16).toString('hex');
  const ha1 = md5Hex(`${username}:${realm}:${password}`);
  const ha2 = md5Hex(`GET:${uri}`);
  let responseDigest;
  if (qopUse) {
    responseDigest = md5Hex(`${ha1}:${nonce}:${nc}:${cnonce}:${qopUse}:${ha2}`);
  } else {
    responseDigest = md5Hex(`${ha1}:${nonce}:${ha2}`);
  }
  const esc = (v) => String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  let authHeader = `Digest username="${esc(username)}", realm="${esc(realm)}", nonce="${esc(nonce)}", uri="${esc(uri)}", response="${responseDigest}"`;
  if (qopUse) {
    authHeader += `, qop=${qopUse}, nc=${nc}, cnonce="${cnonce}"`;
  }
  if (opaque) authHeader += `, opaque="${esc(opaque)}"`;
  authHeader += ', algorithm=MD5';
  const r2 = await httpRequestBuffer(urlStr, { Authorization: authHeader }, timeoutMs);
  if (r2.statusCode >= 200 && r2.statusCode < 300) {
    return { ok: true, statusCode: r2.statusCode, body: r2.body };
  }
  return { ok: false, statusCode: r2.statusCode, error: `HTTP ${r2.statusCode}` };
}

// ── Configuração ───────────────────────────────────────────────────────────────

/**
 * Fallback quando não há --server / ISPCONSULTOR_SERVER / token base64 {s,t}.
 * Instalação via painel sempre passa --server (BASE_URL do tenant).
 * Canal dev/prod na imagem (:dev / :prod) só cobre dev local e produção principal.
 */
const ISPCONSULTOR_URL_BY_CHANNEL = {
  dev: 'https://dev.luminoustelecom.com.br',
  prod: 'https://ispconsultor.com.br',
};

function getConfig() {
  const args = process.argv.slice(2);
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : null;
  };

  let server = get('--server') || process.env.ISPCONSULTOR_SERVER || null;
  let token  = get('--token')  || process.env.ISPCONSULTOR_TOKEN;

  const channel = (process.env.ISPCONSULTOR_AGENT_CHANNEL || '').toLowerCase();
  if (!server && (channel === 'dev' || channel === 'prod')) {
    server = ISPCONSULTOR_URL_BY_CHANNEL[channel];
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
      '[ispconsultor-agent] Servidor não definido. Imagem deve ter ISPCONSULTOR_AGENT_CHANNEL=dev ou prod no build ' +
        '(tags :dev / :prod), ou use --server / ISPCONSULTOR_SERVER / token base64 {s,t}.'
    );
    process.exit(1);
  }
  if (!token) {
    console.error('[ispconsultor-agent] ISPCONSULTOR_TOKEN não definido');
    process.exit(1);
  }

  return { server, token };
}

const config = getConfig();

const SSH_STRICT_HOST = process.env.ISPCONSULTOR_SSH_STRICT_HOST === 'true';
const SSH_WARN_LEGACY = process.env.ISPCONSULTOR_SSH_WARN_LEGACY !== 'false';
const MAX_CONCURRENT_SHELLS = parseInt(process.env.ISPCONSULTOR_MAX_SHELLS || '10', 10);

/** Diagnóstico de latência (eco após stdin) — mesmo nome do backend: SSH_TERMINAL_LATENCY_DEBUG=1 */
const SSH_TERMINAL_LATENCY_DEBUG =
  process.env.SSH_TERMINAL_LATENCY_DEBUG === '1' ||
  process.env.SSH_TERMINAL_LATENCY_DEBUG === 'true';

/** @type {Map<string, bigint>} */
const pendingShellWriteHr = new Map();

function markAgentShellWrite(sessionId) {
  if (!SSH_TERMINAL_LATENCY_DEBUG) return;
  pendingShellWriteHr.set(sessionId, process.hrtime.bigint());
}

function logFirstShellDataAfterWrite(sessionId, label) {
  if (!SSH_TERMINAL_LATENCY_DEBUG) return;
  const t0 = pendingShellWriteHr.get(sessionId);
  if (t0 === undefined) return;
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  console.info(
    `[ispconsultor-agent] latência terminal (${label}) sessão=${String(sessionId).slice(0, 8)}… delayMs=${ms.toFixed(2)} (1º chunk após shell:write)`
  );
  pendingShellWriteHr.delete(sessionId);
}

function clearAgentShellWritePending(sessionId) {
  pendingShellWriteHr.delete(sessionId);
}

/** Base paths permitidos para file transfer (segurança: evita path traversal). Ex: /tmp,/home/user/dados */
const ALLOWED_BASE_PATHS = (process.env.ISPCONSULTOR_ALLOWED_BASE_PATH || '/tmp')
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
  console.warn('[ispconsultor-agent] node-pty não disponível — usando fallback (child_process)');
  pty = null;
}

const SENSITIVE_ENV_KEYS = new Set([
  'ISPCONSULTOR_TOKEN', 'ISPCONSULTOR_SERVER', 'PATH', 'LD_PRELOAD', 'LD_LIBRARY_PATH',
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
    if (SENSITIVE_ENV_KEYS.has(key) || SENSITIVE_ENV_KEYS.has(upper) || upper.startsWith('ISPCONSULTOR_')) {
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

console.log(`[ispconsultor-agent] Conectando a ${config.server}...`);

const socket = io(`${config.server}/ispconsultor-agent`, {
  path: '/socket.io',
  auth: { token: config.token },
  /** WebSocket primeiro: menos RTT que long-polling em links lentos até o ISP Consultor. */
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 3000,
  reconnectionDelayMax: 30000,
  reconnectionAttempts: Infinity,
});

/** Agrega stdout/stderr no mesmo tick — menos pacotes Socket.IO em equipamentos que enviam chunks pequenos. */
const shellOutPending = new Map();

function queueShellData(sessionId, chunk) {
  if (typeof chunk !== 'string' || chunk.length === 0) return;
  let o = shellOutPending.get(sessionId);
  if (!o) {
    o = { buf: '', scheduled: false };
    shellOutPending.set(sessionId, o);
  }
  o.buf += chunk;
  if (!o.scheduled) {
    o.scheduled = true;
    setImmediate(() => {
      const p = shellOutPending.get(sessionId);
      if (!p) return;
      shellOutPending.delete(sessionId);
      const data = p.buf;
      if (data) socket.emit('shell:data', { sessionId, data });
    });
  }
}

function flushShellDataNow(sessionId) {
  const p = shellOutPending.get(sessionId);
  if (!p) return;
  shellOutPending.delete(sessionId);
  if (p.buf) socket.emit('shell:data', { sessionId, data: p.buf });
}

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
        console.error('[ispconsultor-agent] Erro ao chamar connect():', e?.message || e);
        scheduleReconnect(`[ispconsultor-agent] Nova tentativa em ${RECONNECT_DELAY_MS / 1000}s...`);
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
      '[ispconsultor-agent] Token revogado no ISP Consultor. Recrie o container com o novo --token (sem tentativas automáticas).'
    );
    return;
  }
  pauseAutoReconnect = false;
  awaitingPanelReactivation = r === 'inactive';
  loggedShortUnauthorizedHint = false;
  if (r === 'inactive') {
    console.log('[ispconsultor-agent] Túnel desativado no ISP Consultor. Reconexão automática ao reativar o agente.');
  } else if (r) {
    console.log('[ispconsultor-agent] Sessão encerrada pelo servidor:', r);
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
  console.log('[ispconsultor-agent] Conectado ao servidor. Socket ID:', socket.id);

  socket.emit('agent:info', {
    hostname: os.hostname(),
    os_info: `${os.type()} ${os.release()} (${os.arch()})`,
    version: require('./package.json').version,
  });
});

socket.on('agent:ready', () => {
  console.log('[ispconsultor-agent] Agente pronto e registrado.');
});

socket.on('connect_error', (err) => {
  const msg = err?.message || String(err);
  console.error('[ispconsultor-agent] Erro de conexão:', msg);
  if (pauseAutoReconnect) return;
  if (/unauthorized/i.test(msg)) {
    if (awaitingPanelReactivation) {
      if (!loggedShortUnauthorizedHint) {
        console.log(
          '[ispconsultor-agent] Aguardando reativação no painel (ou token válido). Tentando a cada 3s.'
        );
        loggedShortUnauthorizedHint = true;
      }
    } else {
      console.error(
        '[ispconsultor-agent] O servidor recusou o token. Verifique: (1) agente "Ativo" no ISP Consultor, (2) --token igual ao token atual do agente (se regenerou, rode o container de novo com o novo token), (3) --server / ISPCONSULTOR_SERVER apontando para o mesmo domínio do painel (ex.: beta.ispconsultor.com.br), não só o fallback :prod da imagem.'
      );
    }
  }
  scheduleReconnect(
    `[ispconsultor-agent] Próxima tentativa de conexão em ${RECONNECT_DELAY_MS / 1000}s...`
  );
});

socket.on('disconnect', (reason) => {
  console.warn('[ispconsultor-agent] Desconectado:', reason);
  for (const [, shell] of shells) {
    try { shell.kill(); } catch { /* ignora */ }
  }
  shells.clear();
  for (const [, ch] of proxySessions) {
    try { ch.end(); } catch { /* ignora */ }
  }
  proxySessions.clear();
  shellOutPending.clear();
  uploadBuffers.clear();

  if (reason === 'io server disconnect') {
    scheduleReconnect(
      '[ispconsultor-agent] Conexão encerrada pelo servidor; nova tentativa em 3s...'
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
    console.warn(`[ispconsultor-agent] Limite de sessões atingido (${MAX_CONCURRENT_SHELLS}). Rejeitando sessão ${sessionId}.`);
    socket.emit('shell:exit', { sessionId, code: 1 });
    return;
  }
  console.log(`[ispconsultor-agent] Abrindo shell — sessão ${sessionId}`);

  try {
    const shell = spawnShell(cols, rows);

    shell.onData((data) => {
      logFirstShellDataAfterWrite(sessionId, 'shell-local');
      queueShellData(sessionId, data);
    });

    shell.onExit(({ exitCode }) => {
      clearAgentShellWritePending(sessionId);
      flushShellDataNow(sessionId);
      console.log(`[ispconsultor-agent] Shell encerrado (${exitCode}) — sessão ${sessionId}`);
      shells.delete(sessionId);
      socket.emit('shell:exit', { sessionId, code: exitCode });
    });

    shells.set(sessionId, shell);
  } catch (err) {
    console.error('[ispconsultor-agent] Erro ao abrir shell:', err.message);
    flushShellDataNow(sessionId);
    socket.emit('shell:exit', { sessionId, code: 1 });
  }
});

const MAX_INPUT_BYTES = 65536;

socket.on('shell:write', ({ sessionId, data }) => {
  if (typeof data !== 'string' || data.length > MAX_INPUT_BYTES) return;

  const shell = shells.get(sessionId);
  if (shell) {
    markAgentShellWrite(sessionId);
    shell.write(data);
    return;
  }

  const stream = proxySessions.get(sessionId);
  if (stream) {
    markAgentShellWrite(sessionId);
    stream.write(data);
    return;
  }

  console.warn(`[ispconsultor-agent] shell:write ignorado: sessão desconhecida ${sessionId}`);
});

socket.on('shell:resize', ({ sessionId, cols, rows }) => {
  const shell = shells.get(sessionId);
  if (shell) {
    try { shell.resize(cols, rows); } catch { /* ignora */ }
  }
});

socket.on('shell:close', ({ sessionId }) => {
  clearAgentShellWritePending(sessionId);
  flushShellDataNow(sessionId);
  const shell = shells.get(sessionId);
  if (shell) {
    try { shell.kill(); } catch { /* ignora */ }
    shells.delete(sessionId);
    console.log(`[ispconsultor-agent] Shell encerrado pelo servidor — sessão ${sessionId}`);
  }
});

// ── Proxy SSH (para outros hosts na rede local) ───────────────────────────────

/**
 * Alinhado ao backend (SshConnectionService.sshAlgorithmsForDeviceType).
 * deviceType opcional nos eventos proxy:ssh:* — mikrotik/huawei/outros usam BASE; cisco inclui KEX extras e ssh-dss.
 */
const SSH_ALGORITHMS_BASE = {
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

const SSH_ALGORITHMS_CISCO = {
  kex: [
    ...SSH_ALGORITHMS_BASE.kex,
    'diffie-hellman-group18-sha512',
    'diffie-hellman-group16-sha512',
    'diffie-hellman-group15-sha512',
  ],
  cipher: SSH_ALGORITHMS_BASE.cipher,
  hmac: SSH_ALGORITHMS_BASE.hmac,
  serverHostKey: ['ssh-dss', ...SSH_ALGORITHMS_BASE.serverHostKey],
};

function sshAlgorithmsForDeviceType(deviceType) {
  const t = deviceType != null ? String(deviceType).toLowerCase().trim() : '';
  if (t === 'cisco') return SSH_ALGORITHMS_CISCO;
  return SSH_ALGORITHMS_BASE;
}

/** Reconstrói PEM de uma linha (colada sem \\n) — alinhado ao backend. */
function repairSquashedPrivateKeyPem(s) {
  if (!s.includes('BEGIN') || !s.includes('PRIVATE KEY')) return s;
  const trimmed = s.trim();
  const tryUnwrap = (begin, end) => {
    if (!trimmed.startsWith(begin)) return null;
    const endIdx = trimmed.indexOf(end);
    if (endIdx === -1) return null;
    const body = trimmed.slice(begin.length, endIdx).replace(/\s/g, '');
    if (!body.length) return null;
    const wrapped = body.match(/.{1,64}/g)?.join('\n') ?? body;
    return `${begin}\n${wrapped}\n${end}\n`;
  };
  const rebuilt =
    tryUnwrap('-----BEGIN OPENSSH PRIVATE KEY-----', '-----END OPENSSH PRIVATE KEY-----') ??
    tryUnwrap('-----BEGIN RSA PRIVATE KEY-----', '-----END RSA PRIVATE KEY-----') ??
    tryUnwrap('-----BEGIN EC PRIVATE KEY-----', '-----END EC PRIVATE KEY-----');
  if (rebuilt) return rebuilt;
  let t = s;
  t = t.replace(/(-----BEGIN [^-]+-----)\s+(?=[^\n\r-])/g, '$1\n');
  t = t.replace(/([A-Za-z0-9+/=])\s*(-----END [^-]+-----)/g, '$1\n$2');
  return t;
}

/** Mesma lógica do backend (sshPrivateKey): CRLF/BOM + PEM achatada. */
function normalizeSshPrivateKeyPem(key) {
  if (typeof key !== 'string' || !key) return '';
  let s = key.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  return repairSquashedPrivateKeyPem(s);
}

/** Converte OpenSSH PEM para PKCS#1/PKCS#8 — o ssh2 costuma falhar em `BEGIN OPENSSH PRIVATE KEY`. */
function privateKeyPemForSsh2(raw) {
  const s = normalizeSshPrivateKeyPem(raw);
  if (!s) return '';
  try {
    const keyObj = crypto.createPrivateKey({ key: s, format: 'pem' });
    const t = keyObj.asymmetricKeyType;
    const exported =
      t === 'rsa'
        ? keyObj.export({ format: 'pem', type: 'pkcs1' })
        : keyObj.export({ format: 'pem', type: 'pkcs8' });
    return Buffer.isBuffer(exported) ? exported.toString('utf8') : exported;
  } catch {
    return s;
  }
}

function makeSshHostVerifier(host, port, hostFingerprint) {
  return (fingerprint) => {
    if (hostFingerprint) {
      const match = fingerprint === hostFingerprint;
      if (!match) {
        console.error(
          `[ispconsultor-agent] SSH fingerprint mismatch para ${host}: esperado ${hostFingerprint}, recebido ${fingerprint}`
        );
      }
      return match;
    }
    if (SSH_STRICT_HOST) {
      console.error(
        `[ispconsultor-agent] Conexão SSH bloqueada: fingerprint ausente e ISPCONSULTOR_SSH_STRICT_HOST=true (host: ${host})`
      );
      return false;
    }
    console.warn(
      `[ispconsultor-agent] SSH: fingerprint não verificado para ${host}:${port}. Defina ISPCONSULTOR_SSH_STRICT_HOST=true para bloquear conexões sem fingerprint.`
    );
    return true;
  };
}

/** Opções comuns para conn.connect() no proxy SSH (test / exec / shell). deviceType: mikrotik, huawei, cisco, etc. */
function buildProxySshConnectConfig({ host, port, username, password, privateKey, hostFingerprint, deviceType }) {
  const p = Number(port) || 22;
  const keyPem = privateKeyPemForSsh2(privateKey);
  const useKey = keyPem.length > 0;
  return {
    host,
    port: p,
    username,
    readyTimeout: 15000,
    algorithms: sshAlgorithmsForDeviceType(deviceType),
    hostHash: 'sha256',
    hostVerifier: makeSshHostVerifier(host, p, hostFingerprint),
    ...(useKey ? { privateKey: keyPem } : { password }),
  };
}

/**
 * Download HTTP(S) a partir da rede local do agente (ex.: SwOS GET /backup.swb).
 * MikroTik SwOS: HTTP Digest (RFC 2617), implementação nativa — sem dependências npm.
 * Servidor emite proxy:http:fetch → agente responde proxy:http:fetch:result.
 */
socket.on('proxy:http:fetch', async ({ fetchId, url, username, password, timeoutMs }) => {
  if (!fetchId || !url || typeof url !== 'string') {
    if (fetchId) {
      socket.emit('proxy:http:fetch:result', { fetchId, ok: false, error: 'URL inválida' });
    }
    return;
  }
  const t = Math.min(Math.max(Number(timeoutMs) || 120000, 5000), 600000);
  try {
    const user = String(username ?? '');
    const pass = String(password ?? '');
    const result = await httpGetWithDigestAuth(url, user, pass, t);
    if (!result.ok) {
      socket.emit('proxy:http:fetch:result', {
        fetchId,
        ok: false,
        error: result.error || `HTTP ${result.statusCode}`,
        statusCode: result.statusCode,
      });
      return;
    }
    socket.emit('proxy:http:fetch:result', {
      fetchId,
      ok: true,
      bodyBase64: result.body.toString('base64'),
      statusCode: result.statusCode,
    });
  } catch (e) {
    const msg = String(e && typeof e === 'object' && 'message' in e ? e.message : e);
    socket.emit('proxy:http:fetch:result', { fetchId, ok: false, error: msg });
  }
});

socket.on(
  'proxy:ssh:test',
  ({ testId, host, port, username, password, privateKey, hostFingerprint, deviceType }) => {
  if (!testId || !host || !username) return;
  const p = Number(port) || 22;
  if (SSH_WARN_LEGACY) {
    console.warn(
      `[ispconsultor-agent] Conexão SSH para ${host}:${p} usa algoritmos legados (inclui DH group1, 3DES, MD5). ` +
      'Defina ISPCONSULTOR_SSH_WARN_LEGACY=false para suprimir este aviso.'
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
    conn.connect(
      buildProxySshConnectConfig({
        host,
        port,
        username,
        password,
        privateKey,
        hostFingerprint,
        deviceType,
      })
    );
  } catch (e) {
    socket.emit('proxy:ssh:test:result', { testId, ok: false, error: e.message });
  }
});

socket.on(
  'proxy:ssh:exec',
  ({ execId, host, port, username, password, privateKey, command, timeoutMs, hostFingerprint, deviceType }) => {
    if (!execId || !host || !username || !command) {
      console.warn('[ispconsultor-agent] proxy:ssh:exec parâmetros inválidos', {
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
    const keyPem = privateKeyPemForSsh2(privateKey);
    const useKey = keyPem.length > 0;
    if (SSH_WARN_LEGACY) {
      console.warn(
        `[ispconsultor-agent] Conexão SSH para ${host}:${p} usa algoritmos legados (inclui DH group1, 3DES, MD5). ` +
        'Defina ISPCONSULTOR_SSH_WARN_LEGACY=false para suprimir este aviso.'
      );
    }
    console.log(
      `[ispconsultor-agent] proxy:ssh:exec início execId=${execId} → ${host}:${p} user=${username} auth=${useKey ? 'key' : 'password'} timeout=${timeout}ms cmd=${JSON.stringify(command)}`
    );
    const conn = new SshClient();
    let settled = false;

    const fail = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      console.warn(`[ispconsultor-agent] proxy:ssh:exec falha execId=${execId}`, String(error));
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
      console.log(`[ispconsultor-agent] proxy:ssh:exec SSH ready execId=${execId} → executando comando`);
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
        stream.on('close', (code, signal) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          const combined = (errOut ? `${out}\n[stderr]: ${errOut}` : out).trim();
          // ssh2: sem exit-status do equipamento, close emite code undefined — tratar como 0 (sucesso).
          const exitCode =
            code === undefined ? 0 : code === null ? (signal ? 1 : 0) : code;
          const ok = exitCode === 0;
          const outBytes = Buffer.byteLength(combined, 'utf8');
          console.log(
            `[ispconsultor-agent] proxy:ssh:exec fim execId=${execId} exit=${exitCode} ok=${ok} outputBytes=${outBytes}`
          );
          socket.emit('proxy:ssh:exec:result', {
            execId,
            ok,
            output: combined,
            ...(ok ? {} : { error: errOut || `Comando encerrou com código ${exitCode}` }),
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
      conn.connect(
        buildProxySshConnectConfig({
          host,
          port,
          username,
          password,
          privateKey,
          hostFingerprint,
          deviceType,
        })
      );
    } catch (e) {
      fail(e.message);
    }
  }
);

socket.on(
  'proxy:ssh:open',
  ({ sessionId, host, port, username, password, privateKey, cols, rows, hostFingerprint, deviceType }) => {
  if (shells.size + proxySessions.size >= MAX_CONCURRENT_SHELLS) {
    console.warn(`[ispconsultor-agent] Limite de sessões atingido (${MAX_CONCURRENT_SHELLS}). Rejeitando sessão ${sessionId}.`);
    socket.emit('shell:exit', { sessionId, code: 1 });
    return;
  }
  const p = Number(port) || 22;
  if (SSH_WARN_LEGACY) {
    console.warn(
      `[ispconsultor-agent] Conexão SSH para ${host}:${p} usa algoritmos legados (inclui DH group1, 3DES, MD5). ` +
      'Defina ISPCONSULTOR_SSH_WARN_LEGACY=false para suprimir este aviso.'
    );
  }
  console.log(`[ispconsultor-agent] Proxy SSH → ${host}:${p} (${username}) — sessão ${sessionId}`);

  const c = Math.min(Math.max(Number(cols) || 80, 8), 500);
  const r = Math.min(Math.max(Number(rows) || 24, 4), 200);
  const conn = new SshClient();

  conn.on('ready', () => {
    conn.shell({ term: 'xterm-256color', cols: c, rows: r }, (err, stream) => {
      if (err) {
        console.error('[ispconsultor-agent] Erro ao abrir shell SSH:', err.message);
        flushShellDataNow(sessionId);
        socket.emit('shell:exit', { sessionId, code: 1 });
        conn.end();
        return;
      }

      proxySessions.set(sessionId, stream);

      stream.on('data', (data) => {
        logFirstShellDataAfterWrite(sessionId, 'proxy-ssh-stdout');
        queueShellData(sessionId, data.toString('utf8'));
      });

      stream.stderr.on('data', (data) => {
        logFirstShellDataAfterWrite(sessionId, 'proxy-ssh-stderr');
        queueShellData(sessionId, data.toString('utf8'));
      });

      stream.on('close', () => {
        clearAgentShellWritePending(sessionId);
        flushShellDataNow(sessionId);
        proxySessions.delete(sessionId);
        socket.emit('shell:exit', { sessionId, code: 0 });
        conn.end();
      });
    });
  });

  conn.on('error', (err) => {
    clearAgentShellWritePending(sessionId);
    flushShellDataNow(sessionId);
    console.error('[ispconsultor-agent] Erro SSH:', err.message);
    socket.emit('shell:data', {
      sessionId,
      data: `\r\n\x1b[1;31m[Erro SSH] ${err.message}\x1b[0m\r\n`,
    });
    socket.emit('shell:exit', { sessionId, code: 1 });
    proxySessions.delete(sessionId);
  });

  conn.connect(
    buildProxySshConnectConfig({
      host,
      port,
      username,
      password,
      privateKey,
      hostFingerprint,
      deviceType,
    })
  );
});

socket.on('proxy:ssh:resize', ({ sessionId, cols, rows }) => {
  const stream = proxySessions.get(sessionId);
  if (stream) {
    try { stream.setWindow(rows, cols, 0, 0); } catch { /* ignora */ }
  }
});

socket.on('proxy:ssh:close', ({ sessionId }) => {
  clearAgentShellWritePending(sessionId);
  flushShellDataNow(sessionId);
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
    console.warn('[ispconsultor-agent] Download bloqueado: path fora da área permitida', { path });
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
    console.error('[ispconsultor-agent] Erro no download:', err.message);
    socket.emit('file:chunk', { transferId, chunk: '', done: true, error: err.message });
  }
});

// ── File upload (agente recebe chunks e escreve o arquivo) ────────────────────

const uploadBuffers = new Map();

socket.on('file:upload:start', ({ transferId, path, size }) => {
  if (!isPathAllowed(path)) {
    console.warn('[ispconsultor-agent] Upload bloqueado: path fora da área permitida', { path });
    return;
  }
  if (size > 100 * 1024 * 1024) {
    console.warn('[ispconsultor-agent] Upload bloqueado: tamanho excede 100MB', { size });
    return;
  }
  console.log(`[ispconsultor-agent] Upload iniciado: ${path} (${size} bytes)`);
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
    console.warn('[ispconsultor-agent] Upload abortado: excede 100MB');
    uploadBuffers.delete(transferId);
    return;
  }

  if (done) {
    const fs = require('fs');
    try {
      fs.writeFileSync(buf.path, Buffer.concat(buf.chunks));
      console.log(`[ispconsultor-agent] Upload concluído: ${buf.path}`);
    } catch (err) {
      console.error('[ispconsultor-agent] Erro no upload:', err.message);
    }
    uploadBuffers.delete(transferId);
  }
});

// ── Tratamento de erros não capturados ─────────────────────────────────────────

process.on('uncaughtException', (err) => {
  console.error('[ispconsultor-agent] Erro não capturado:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('[ispconsultor-agent] Promise rejeitada:', reason);
});

process.on('SIGINT', () => {
  console.log('\n[ispconsultor-agent] Encerrando...');
  socket.disconnect();
  process.exit(0);
});
