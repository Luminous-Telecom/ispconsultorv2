import * as fs from 'fs/promises';
import * as path from 'path';
import { prisma } from '../../../db/prisma';
import type { SshDeviceShape as SshDevice, SshDeviceType } from '../sshDeviceShape';
import { sshPool } from '../SshPoolService';
import { executeCommand, openDeviceConnection } from '../SshConnectionService';
import { isWireguardAgent, resolveWireguardBind } from '../../agent/wireguard/AgentWireguardService';
import { logSshAudit } from '../SshAuditService';
import { logger } from '../../../utils/logger';
import { resolveArquivosPath } from '../../../utils/pathUtils';
import { decryptSshCredential } from '../../../utils/encryption';
import { privateKeyPemForSsh2 } from '../../../utils/sshPrivateKey';
import { registerSshDeviceBackupRow } from '../SshDeviceBackupStorageService';
import { recordSshDeviceBackupEvent } from '../SshDeviceBackupEventService';
import { executeHttpFetchThroughAgent, executeSshCommandThroughAgent, isAgentOnline } from '../../agent/AgentService';
import { httpGetWithDigestAuth } from '../../../utils/httpDigestGet';
import * as routeros from './models/routeros';
import * as vrp from './models/vrp';

export type RunSshDeviceBackupContext = {
  manual?: boolean;
  userId?: string;
  ip?: string;
};

export type RunSshDeviceBackupResult = { success: boolean; message: string };

const BACKUP_CMD_TIMEOUT_MS = parseInt(process.env.SSH_BACKUP_COMMAND_TIMEOUT_MS ?? '120000', 10);

/** Porta HTTP da interface SwOS (campo `port` do cadastro; 22 assume 80 como no Oxidized). */
function swosHttpPort(device: SshDevice): number {
  const p = device.port ?? 80;
  if (p === 22) return 80;
  return p;
}

function swosBackupUrl(device: SshDevice): string {
  const port = swosHttpPort(device);
  const host = device.host.trim();
  if (port === 80) return `http://${host}/backup.swb`;
  return `http://${host}:${port}/backup.swb`;
}

async function fetchSwosBackupBuffer(
  device: SshDevice,
  passwordPlain: string,
  timeoutMs: number
): Promise<{ ok: true; body: Buffer } | { ok: false; error: string }> {
  const url = swosBackupUrl(device);
  const user = device.username.trim();
  const viaAgent = Boolean(device.agent_id);

  if (viaAgent) {
    const agentRow = await prisma.agent_agents.findUnique({ where: { id: device.agent_id! } });
    if (agentRow && isWireguardAgent(agentRow)) {
      try {
        const localAddress = await resolveWireguardBind(agentRow as unknown as Parameters<typeof resolveWireguardBind>[0]);
        const res = await httpGetWithDigestAuth(url, user, passwordPlain, timeoutMs, { localAddress });
        if (!res.ok) {
          return { ok: false, error: res.error ?? `HTTP ${res.statusCode} ao baixar backup SwOS` };
        }
        if (!res.body.length) {
          return { ok: false, error: 'Resposta vazia do equipamento SwOS' };
        }
        return { ok: true, body: res.body };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return { ok: false, error: msg };
      }
    }
    if (!isAgentOnline(device.agent_id!)) {
      return { ok: false, error: 'Agente offline. O backup SwOS usa HTTP na rede do agente.' };
    }
    const r = await executeHttpFetchThroughAgent(device.agent_id!, {
      url,
      username: user,
      password: passwordPlain,
      timeoutMs,
    });
    if (!r.success || !r.body?.length) {
      return { ok: false, error: r.error ?? 'Falha ao baixar .swb via agente' };
    }
    return { ok: true, body: r.body };
  }

  try {
    const res = await httpGetWithDigestAuth(url, user, passwordPlain, timeoutMs);
    if (!res.ok) {
      return { ok: false, error: res.error ?? `HTTP ${res.statusCode} ao baixar backup SwOS` };
    }
    if (!res.body.length) {
      return { ok: false, error: 'Resposta vazia do equipamento SwOS' };
    }
    return { ok: true, body: res.body };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.toLowerCase().includes('timeout')) {
      return { ok: false, error: 'Timeout ao baixar backup SwOS (HTTP)' };
    }
    return { ok: false, error: msg };
  }
}

async function runSwosHttpBackup(
  device: SshDevice,
  context?: RunSshDeviceBackupContext
): Promise<RunSshDeviceBackupResult> {
  const manual = context?.manual === true;
  const auditUserId = manual ? (context?.userId ?? 'user') : 'scheduler';
  const auditIp = context?.ip ?? '127.0.0.1';
  const backupStartedAt = new Date();
  const started = Date.now();
  const auditLabel = `HTTP GET ${swosBackupUrl(device)}`;

  const auditFail = (errorMessage: string): RunSshDeviceBackupResult => {
    void recordSshDeviceBackupEvent({
      sshDeviceId: device.id,
      empresaId: device.empresa_id ?? null,
      status: 'falha',
      detail: errorMessage,
    });
    logSshAudit({
      action: 'COMMAND',
      userId: auditUserId,
      empresaId: device.empresa_id ?? null,
      deviceId: device.id,
      deviceName: device.name,
      command: auditLabel,
      success: false,
      errorMessage,
      ip: auditIp,
      duration: Date.now() - started,
    });
    return { success: false, message: errorMessage };
  };

  let passwordPlain: string;
  try {
    passwordPlain = decryptSshCredential(device.password, 'senha');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('Backup SwOS: credenciais', { context: 'SshDeviceBackupRunner', deviceId: device.id, error: msg });
    return auditFail(msg);
  }

  if (device.agent_id) {
    const agentRow = await prisma.agent_agents.findUnique({ where: { id: device.agent_id } });
    if (!agentRow || !agentRow.is_active) {
      return auditFail('Agente não encontrado ou inativo.');
    }
  }

  const got = await fetchSwosBackupBuffer(device, passwordPlain, BACKUP_CMD_TIMEOUT_MS);
  if (!got.ok) {
    logger.error('Backup SwOS falhou', { context: 'SshDeviceBackupRunner', deviceId: device.id, error: got.error });
    return auditFail(got.error);
  }

  if (got.body.length < 32) {
    return auditFail('Arquivo .swb muito pequeno ou inválido.');
  }

  const baseDir = resolveArquivosPath('ssh-device-backups');
  await fs.mkdir(baseDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeName = device.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  const fileName = `${device.id}_${safeName}_${stamp}.swb`;
  const filePath = path.join(baseDir, fileName);

  await fs.writeFile(filePath, got.body);
  const sizeBytes = got.body.length;
  await registerSshDeviceBackupRow(device.id, fileName, sizeBytes, backupStartedAt, new Date());
  const duration = Date.now() - started;

  logger.info('Backup SwOS concluído', {
    context: 'SshDeviceBackupRunner',
    deviceId: device.id,
    name: device.name,
    bytes: sizeBytes,
    durationMs: duration,
  });
  logSshAudit({
    action: 'COMMAND',
    userId: auditUserId,
    empresaId: device.empresa_id ?? null,
    deviceId: device.id,
    deviceName: device.name,
    command: auditLabel,
    output: `.swb ${sizeBytes} bytes`,
    success: true,
    ip: auditIp,
    duration,
  });
  await recordSshDeviceBackupEvent({
    sshDeviceId: device.id,
    empresaId: device.empresa_id ?? null,
    status: 'sucesso',
    detail: null,
  });
  return { success: true, message: 'Backup concluído com sucesso.' };
}

function backupSpec(deviceType: SshDeviceType): {
  command: string;
  auditLabel: string;
  fileExtension: string;
} | null {
  if (deviceType === 'mikrotik') {
    return {
      command: routeros.PACKAGE_PROBE_CMD,
      auditLabel: routeros.OXIDIZED_AUDIT_BASE,
      fileExtension: 'rsc',
    };
  }
  if (deviceType === 'huawei') {
    return {
      command: vrp.BACKUP_SSH_CMD,
      auditLabel: vrp.OXIDIZED_AUDIT_LABEL,
      fileExtension: 'cfg',
    };
  }
  return null;
}

type ExecFn = (cmd: string) => Promise<{ success: boolean; output?: string; error?: string }>;

async function mikrotikProbeAndExport(exec: ExecFn): Promise<
  | { ok: true; output: string; auditLabel: string }
  | { ok: false; error: string; auditLabel: string }
> {
  const probe = await exec(routeros.PACKAGE_PROBE_CMD);
  if (!probe.success) {
    return {
      ok: false,
      error: probe.error ?? 'Falha no probe MikroTik',
      auditLabel: routeros.PACKAGE_PROBE_CMD,
    };
  }
  const major = routeros.parseRouterOsMajorFromPackageUpdatePrint(probe.output ?? '');
  const exportCmd = routeros.buildExportCommand(major);
  const auditLabel = `${routeros.PACKAGE_PROBE_CMD} → ${exportCmd}`;
  const exp = await exec(exportCmd);
  if (!exp.success) {
    return { ok: false, error: exp.error ?? `Falha no export (${exportCmd})`, auditLabel };
  }
  return { ok: true, output: exp.output ?? '', auditLabel };
}

export async function runSshDeviceBackup(
  deviceId: number,
  context?: RunSshDeviceBackupContext
): Promise<RunSshDeviceBackupResult> {
  const manual = context?.manual === true;
  const auditUserId = manual ? (context?.userId ?? 'user') : 'scheduler';
  const auditIp = context?.ip ?? '127.0.0.1';

  logger.info('Backup SSH: execução iniciada', {
    context: 'SshDeviceBackupRunner',
    deviceId,
    manual,
    auditUserId,
  });

  const device = await prisma.ssh_manager_devices.findUnique({ where: { id: deviceId } });
  if (!device) {
    logger.warn('Backup SSH: device não encontrado', { context: 'SshDeviceBackupRunner', deviceId, manual });
    return { success: false, message: 'Device não encontrado.' };
  }

  if (!device.is_active) {
    logger.warn('Backup SSH ignorado: device inativo', { context: 'SshDeviceBackupRunner', deviceId, name: device.name });
    void recordSshDeviceBackupEvent({
      sshDeviceId: device.id,
      empresaId: device.empresa_id ?? null,
      status: 'falha',
      detail: 'Device inativo não pode receber backup.',
    });
    return { success: false, message: 'Device inativo não pode receber backup.' };
  }

  if (!manual && !device.backup_enabled) {
    logger.warn('Backup SSH ignorado: backup_enabled off', { context: 'SshDeviceBackupRunner', deviceId, name: device.name });
    void recordSshDeviceBackupEvent({
      sshDeviceId: device.id,
      empresaId: device.empresa_id ?? null,
      status: 'falha',
      detail: 'Backup desabilitado para este device.',
    });
    return { success: false, message: 'Backup desabilitado para este device.' };
  }

  if (device.device_type === 'swos') {
    return runSwosHttpBackup(device, context);
  }

  const spec = backupSpec(device.device_type);
  if (!spec) {
    logger.warn('Backup SSH ignorado: tipo não suportado', {
      context: 'SshDeviceBackupRunner',
      deviceId,
      device_type: device.device_type,
    });
    void recordSshDeviceBackupEvent({
      sshDeviceId: device.id,
      empresaId: device.empresa_id ?? null,
      status: 'falha',
      detail: 'Backup não suportado para este tipo de equipamento.',
    });
    return { success: false, message: 'Backup não suportado para este tipo de equipamento.' };
  }

  const { command: backupCommand, auditLabel, fileExtension } = spec;

  const baseDir = resolveArquivosPath('ssh-device-backups');
  await fs.mkdir(baseDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeName = device.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  const fileName = `${device.id}_${safeName}_${stamp}.${fileExtension}`;
  const filePath = path.join(baseDir, fileName);

  const viaAgent = Boolean(device.agent_id);
  let usedPool = false;

  const backupStartedAt = new Date();
  const started = Date.now();
  let commandAuditLabel = auditLabel;

  const auditCommandFail = (command: string, errorMessage: string): RunSshDeviceBackupResult => {
    void recordSshDeviceBackupEvent({
      sshDeviceId: device.id,
      empresaId: device.empresa_id ?? null,
      status: 'falha',
      detail: errorMessage,
    });
    logSshAudit({
      action: 'COMMAND',
      userId: auditUserId,
      empresaId: device.empresa_id ?? null,
      deviceId: device.id,
      deviceName: device.name,
      command,
      success: false,
      errorMessage,
      ip: auditIp,
      duration: Date.now() - started,
    });
    return { success: false, message: errorMessage };
  };

  try {
    let output = '';

    if (viaAgent) {
      const agentRow = await prisma.agent_agents.findUnique({ where: { id: device.agent_id! } });
      if (!agentRow || !agentRow.is_active) {
        return auditCommandFail(auditLabel, 'Agente não encontrado ou inativo.');
      }
      if (isWireguardAgent(agentRow)) {
        let localAddress: string;
        try {
          localAddress = await resolveWireguardBind(agentRow as unknown as Parameters<typeof resolveWireguardBind>[0]);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return auditCommandFail(auditLabel, msg);
        }
        const conn = await openDeviceConnection(device, { localAddress });
        try {
          const execWg: ExecFn = async (cmd) => {
            try {
              const out = await executeCommand(conn, cmd, device.id, { timeoutMs: BACKUP_CMD_TIMEOUT_MS });
              return { success: true, output: out };
            } catch (e) {
              return { success: false, error: e instanceof Error ? e.message : String(e) };
            }
          };
          if (device.device_type === 'mikrotik') {
            const mt = await mikrotikProbeAndExport(execWg);
            commandAuditLabel = mt.auditLabel;
            if (!mt.ok) {
              return auditCommandFail(commandAuditLabel, mt.error);
            }
            output = mt.output;
          } else {
            const via = await execWg(backupCommand);
            if (!via.success) {
              return auditCommandFail(auditLabel, via.error ?? 'Falha no comando SSH pela VPN');
            }
            output = via.output ?? '';
          }
        } finally {
          try { conn.end(); } catch { /* ignora */ }
        }
      } else {
      if (!isAgentOnline(device.agent_id!)) {
        return auditCommandFail(
          auditLabel,
          'Agente offline. Mantenha o túnel conectado para o backup via agente.'
        );
      }

      let password: string;
      try {
        password = decryptSshCredential(device.password, 'senha');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error('Backup SSH via agente: credenciais', { context: 'SshDeviceBackupRunner', deviceId, error: msg });
        return auditCommandFail(auditLabel, msg);
      }

      let privateKey: string | undefined;
      if (device.private_key) {
        try {
          privateKey = privateKeyPemForSsh2(decryptSshCredential(device.private_key, 'chave_privada'));
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return auditCommandFail(auditLabel, msg);
        }
      }
      const useKey = !!privateKey?.length;
      const agentSshOpts = {
        host: device.host,
        port: device.port,
        username: device.username,
        deviceType: device.device_type,
        ...(useKey && privateKey ? { privateKey } : { password }),
      };

      const execAgent: ExecFn = (cmd) =>
        executeSshCommandThroughAgent(device.agent_id!, agentSshOpts, cmd, BACKUP_CMD_TIMEOUT_MS).then(
          (r) => ({
            success: r.success,
            output: r.output ?? undefined,
            error: r.error ?? undefined,
          })
        );

      if (device.device_type === 'mikrotik') {
        const mt = await mikrotikProbeAndExport(execAgent);
        commandAuditLabel = mt.auditLabel;
        if (!mt.ok) {
          logger.error('Backup SSH MikroTik via agente falhou', {
            context: 'SshDeviceBackupRunner',
            deviceId,
            error: mt.error,
          });
          return auditCommandFail(commandAuditLabel, mt.error);
        }
        output = mt.output;
      } else {
        const via = await execAgent(backupCommand);
        if (!via.success) {
          const msg = via.error ?? `Falha ao executar backup via agente (${auditLabel})`;
          logger.error('Backup SSH via agente falhou', { context: 'SshDeviceBackupRunner', deviceId, error: msg });
          return auditCommandFail(auditLabel, msg);
        }
        output = via.output ?? '';
      }
      }
    } else {
      usedPool = true;
      const conn = await sshPool.getDeviceConnection(device);
      const timeoutMs = BACKUP_CMD_TIMEOUT_MS;

      const execPool: ExecFn = async (cmd) => {
        try {
          const out = await executeCommand(conn, cmd, device.id, { timeoutMs });
          return { success: true, output: out };
        } catch (e) {
          return { success: false, error: e instanceof Error ? e.message : String(e) };
        }
      };

      if (device.device_type === 'mikrotik') {
        const mt = await mikrotikProbeAndExport(execPool);
        commandAuditLabel = mt.auditLabel;
        if (!mt.ok) {
          logger.error('Backup SSH MikroTik (pool) falhou', {
            context: 'SshDeviceBackupRunner',
            deviceId,
            error: mt.error,
          });
          return auditCommandFail(commandAuditLabel, mt.error);
        }
        output = mt.output;
      } else {
        const r = await execPool(backupCommand);
        if (!r.success) {
          return auditCommandFail(auditLabel, r.error ?? 'Falha no comando SSH');
        }
        output = r.output ?? '';
      }
    }

    if (device.device_type === 'huawei') {
      const polished = vrp.polishBackupOutput(output);
      if (polished == null) {
        const msg = vrp.huaweiFailureMessage(output);
        logger.error('Backup SSH Huawei: sem config após sanitize', {
          context: 'SshDeviceBackupRunner',
          deviceId,
          preview: output.slice(0, 400),
        });
        return auditCommandFail(commandAuditLabel, msg);
      }
      output = polished;
    }

    if (device.device_type === 'mikrotik') {
      output = routeros.polishExportOutput(output);
      if (!output.trim() || !/\/[a-z-]/i.test(output)) {
        const msg = 'Export MikroTik inválido ou vazio após normalização.';
        return auditCommandFail(commandAuditLabel, msg);
      }
    }

    await fs.writeFile(filePath, output, 'utf8');
    const sizeBytes = Buffer.byteLength(output, 'utf8');
    await registerSshDeviceBackupRow(device.id, fileName, sizeBytes, backupStartedAt, new Date());
    const duration = Date.now() - started;
    logger.info('Backup SSH concluído', {
      context: 'SshDeviceBackupRunner',
      deviceId,
      name: device.name,
      manual,
      viaAgent,
      bytes: sizeBytes,
      durationMs: duration,
    });
    logSshAudit({
      action: 'COMMAND',
      userId: auditUserId,
      empresaId: device.empresa_id ?? null,
      deviceId: device.id,
      deviceName: device.name,
      command: commandAuditLabel,
      output: output.slice(0, 500),
      success: true,
      ip: auditIp,
      duration,
    });
    await recordSshDeviceBackupEvent({
      sshDeviceId: device.id,
      empresaId: device.empresa_id ?? null,
      status: 'sucesso',
      detail: null,
    });
    return { success: true, message: 'Backup concluído com sucesso.' };
  } catch (err) {
    const duration = Date.now() - started;
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('Backup SSH falhou', {
      context: 'SshDeviceBackupRunner',
      deviceId,
      error: msg,
      stack: err instanceof Error ? err.stack : undefined,
    });
    logSshAudit({
      action: 'COMMAND',
      userId: auditUserId,
      empresaId: device.empresa_id ?? null,
      deviceId: device.id,
      deviceName: device.name,
      command: commandAuditLabel,
      success: false,
      errorMessage: msg,
      ip: auditIp,
      duration,
    });
    void recordSshDeviceBackupEvent({
      sshDeviceId: device.id,
      empresaId: device.empresa_id ?? null,
      status: 'falha',
      detail: msg,
    });
    return { success: false, message: `Falha no backup: ${msg}` };
  } finally {
    if (usedPool) {
      sshPool.releaseDevice(deviceId);
    }
  }
}
