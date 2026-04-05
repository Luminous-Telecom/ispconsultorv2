import * as fs from 'fs/promises';
import * as path from 'path';
import { SshDevice, SshDeviceType } from '../../../models/ssh-manager/SshDevice';
import { Agent } from '../../../models/agent/Agent';
import { sshPool } from '../SshPoolService';
import { executeCommand } from '../SshConnectionService';
import { logSshAudit } from '../SshAuditService';
import { logger } from '../../../utils/logger';
import { resolveArquivosPath } from '../../../utils/pathUtils';
import { decrypt } from '../../../utils/encryption';
import { privateKeyPemForSsh2 } from '../../../utils/sshPrivateKey';
import { registerSshDeviceBackupRow } from '../SshDeviceBackupStorageService';
import { executeSshCommandThroughAgent, isAgentOnline } from '../../agent/AgentService';
import * as routeros from './models/routeros';
import * as vrp from './models/vrp';

const BACKUP_CMD_TIMEOUT_MS = parseInt(process.env.SSH_BACKUP_COMMAND_TIMEOUT_MS ?? '120000', 10);

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

export type RunSshDeviceBackupContext = {
  manual?: boolean;
  userId?: string;
  ip?: string;
};

export type RunSshDeviceBackupResult = { success: boolean; message: string };

export async function runSshDeviceBackup(
  deviceId: string,
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

  const device = await SshDevice.findByPk(deviceId);
  if (!device) {
    logger.warn('Backup SSH: device não encontrado', { context: 'SshDeviceBackupRunner', deviceId, manual });
    return { success: false, message: 'Device não encontrado.' };
  }

  if (!device.is_active) {
    logger.warn('Backup SSH ignorado: device inativo', { context: 'SshDeviceBackupRunner', deviceId, name: device.name });
    return { success: false, message: 'Device inativo não pode receber backup.' };
  }

  if (!manual && !device.backup_enabled) {
    logger.warn('Backup SSH ignorado: backup_enabled off', { context: 'SshDeviceBackupRunner', deviceId, name: device.name });
    return { success: false, message: 'Backup desabilitado para este device.' };
  }

  const spec = backupSpec(device.device_type);
  if (!spec) {
    logger.warn('Backup SSH ignorado: tipo não suportado', {
      context: 'SshDeviceBackupRunner',
      deviceId,
      device_type: device.device_type,
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

  const started = Date.now();
  let commandAuditLabel = auditLabel;

  const auditCommandFail = (command: string, errorMessage: string): RunSshDeviceBackupResult => {
    logSshAudit({
      action: 'COMMAND',
      userId: auditUserId,
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
    let output: string;

    if (viaAgent) {
      const agentRow = await Agent.findByPk(device.agent_id!);
      if (!agentRow || !agentRow.is_active) {
        return auditCommandFail(auditLabel, 'Agente não encontrado ou inativo.');
      }
      if (!isAgentOnline(device.agent_id!)) {
        return auditCommandFail(
          auditLabel,
          'Agente offline. Mantenha o túnel conectado para o backup via agente.'
        );
      }

      let password: string;
      try {
        password = decrypt(device.password);
      } catch {
        logger.error('Backup SSH via agente: credenciais', { context: 'SshDeviceBackupRunner', deviceId });
        return auditCommandFail(auditLabel, 'Erro ao descriptografar credenciais do device.');
      }

      let privateKey: string | undefined;
      if (device.private_key) {
        try {
          privateKey = privateKeyPemForSsh2(decrypt(device.private_key));
        } catch {
          privateKey = undefined;
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
    await registerSshDeviceBackupRow(device.id, fileName, sizeBytes);
    const duration = Date.now() - started;
    logger.info('Backup SSH concluído', {
      context: 'SshDeviceBackupRunner',
      deviceId,
      name: device.name,
      manual,
      viaAgent,
      bytes: output.length,
      durationMs: duration,
    });
    logSshAudit({
      action: 'COMMAND',
      userId: auditUserId,
      deviceId: device.id,
      deviceName: device.name,
      command: commandAuditLabel,
      output: output.slice(0, 500),
      success: true,
      ip: auditIp,
      duration,
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
      deviceId: device.id,
      deviceName: device.name,
      command: commandAuditLabel,
      success: false,
      errorMessage: msg,
      ip: auditIp,
      duration,
    });
    return { success: false, message: `Falha no backup: ${msg}` };
  } finally {
    if (usedPool) {
      sshPool.releaseDevice(deviceId);
    }
  }
}
