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

const BACKUP_CMD_TIMEOUT_MS = parseInt(process.env.SSH_BACKUP_COMMAND_TIMEOUT_MS ?? '120000', 10);

/** MikroTik RouterOS */
const MIKROTIK_BACKUP_CMD = '/export';
/**
 * Huawei VRP — espelha Oxidized `model/vrp.rb`:
 * - cfg :ssh post_login → `screen-length 0 temporary`
 * - cmd → `display current-configuration all` (sem `| no-more`; paginação já desligada)
 * Não use `;` num único exec — vários VRP rejeitam. Duas linhas (\r\n) na mesma string costumam rodar em sequência na sessão.
 * @see repo local `model/vrp.rb` (pasta ignorada no git, referência Oxidized)
 */
const HUAWEI_VRP_DISPLAY_CMD = 'display current-configuration all';
const HUAWEI_NE_BACKUP_CMD = `screen-length 0 temporary\r\n${HUAWEI_VRP_DISPLAY_CMD}\r\n`;
const HUAWEI_NE_BACKUP_AUDIT_LABEL = `Huawei VRP: screen-length 0 temporary + ${HUAWEI_VRP_DISPLAY_CMD}`;

/**
 * Linha contendo só timestamp (Oxidized vrp.rb filtra isso na saída do display config).
 * Aceita offset ±HH:MM (ex.: -03:00).
 */
const VRP_OXIDIZED_STANDALONE_TIMESTAMP =
  /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d{3})?(\s*[+-]\d{2}:\d{2})?\s*$/;

/** Corta banners, prompts (ex.: <host>) e avisos antes do bloco que começa em !Software Version (ou primeira linha !). */
function sanitizeHuaweiBackupOutput(raw: string): string {
  const s = raw.replace(/^\uFEFF/, '').trim();
  const head = '!Software Version';
  const i = s.indexOf(head);
  if (i > 0) {
    return s.slice(i).trim();
  }
  if (i === 0) {
    return s;
  }
  const lines = s.split('\n');
  const firstBang = lines.findIndex((line) => /^\s*!/.test(line));
  if (firstBang >= 0) {
    return lines.slice(firstBang).join('\n').trim();
  }
  return s;
}

function stripVrpOxidizedTimestampLines(cfg: string): string {
  return cfg
    .split(/\r?\n/)
    .filter((line) => !VRP_OXIDIZED_STANDALONE_TIMESTAMP.test(line.trimEnd()))
    .join('\n')
    .trim();
}

/** Indica se o texto já sanitizado parece running-config VRP (linhas !). */
function huaweiSanitizedLooksLikeConfig(sanitized: string): boolean {
  const t = sanitized.trim();
  if (t.length === 0) return false;
  return /^\s*!/.test(t) || t.includes('\n!');
}

/**
 * Falha “explicável” só quando não há config após sanitize.
 * Banner de senha + "timed out" pode aparecer no mesmo buffer que um display bem-sucedido (~30kB).
 */
function huaweiBackupCliFailureMessageWhenNoConfig(raw: string): string | null {
  const t = raw.toLowerCase();
  if (t.includes('unrecognized command') || t.includes('unknown command')) {
    return 'O equipamento rejeitou o comando de backup (CLI). Teste no SSH: `display current-configuration` ou `display current-configuration all` (Oxidized vrp.rb).';
  }
  if (t.includes('the operation timed out') && t.includes('change now')) {
    return 'O Huawei exige troca de senha interativa no login (Change now? Y/N), o que trava o backup automático. Altere a senha no equipamento ou desative esse aviso.';
  }
  return null;
}

type SshBackupSpec = { command: string; auditLabel: string; fileExtension: string };

function sshBackupSpec(deviceType: SshDeviceType): SshBackupSpec | null {
  if (deviceType === 'mikrotik') {
    return { command: MIKROTIK_BACKUP_CMD, auditLabel: MIKROTIK_BACKUP_CMD, fileExtension: 'rsc' };
  }
  if (deviceType === 'huawei') {
    return {
      command: HUAWEI_NE_BACKUP_CMD,
      auditLabel: HUAWEI_NE_BACKUP_AUDIT_LABEL,
      fileExtension: 'cfg',
    };
  }
  return null;
}

export type RunSshDeviceBackupContext = {
  manual?: boolean;
  userId?: string;
  ip?: string;
};

export type RunSshDeviceBackupResult = { success: boolean; message: string };

/**
 * Executa backup de configuração (MikroTik: /export; Huawei: como Oxidized vrp.rb — screen-length + display current-configuration all, sanitização + timestamps)
 * e grava em arquivos/ssh-device-backups.
 * Com agente túnel: comando roda no agente (SSH até o equipamento na rede local).
 * Sem agente: SSH direto do servidor (pool).
 */
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
    logger.warn('Backup SSH ignorado: device inativo', {
      context: 'SshDeviceBackupRunner',
      deviceId,
      name: device.name,
      manual,
    });
    return { success: false, message: 'Device inativo não pode receber backup.' };
  }

  if (!manual && !device.backup_enabled) {
    logger.warn('Backup SSH ignorado: backup_enabled desligado (apenas rotina agendada)', {
      context: 'SshDeviceBackupRunner',
      deviceId,
      name: device.name,
    });
    return { success: false, message: 'Backup desabilitado para este device.' };
  }

  const backupSpec = sshBackupSpec(device.device_type);
  if (!backupSpec) {
    logger.warn('Backup SSH ignorado: tipo não suportado', {
      context: 'SshDeviceBackupRunner',
      deviceId,
      device_type: device.device_type,
      manual,
    });
    return { success: false, message: 'Backup não suportado para este tipo de equipamento.' };
  }

  const { command: backupCommand, auditLabel, fileExtension } = backupSpec;

  const baseDir = resolveArquivosPath('ssh-device-backups');
  await fs.mkdir(baseDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeName = device.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  const fileName = `${device.id}_${safeName}_${stamp}.${fileExtension}`;
  const filePath = path.join(baseDir, fileName);

  const viaAgent = Boolean(device.agent_id);
  let usedPool = false;

  const started = Date.now();
  try {
    let output: string;

    if (viaAgent) {
      logger.info('Backup SSH: via agente (túnel)', {
        context: 'SshDeviceBackupRunner',
        deviceId,
        name: device.name,
        agentId: device.agent_id,
        manual,
      });

      const agentRow = await Agent.findByPk(device.agent_id!);
      if (!agentRow || !agentRow.is_active) {
        const msg = 'Agente não encontrado ou inativo.';
        logger.warn('Backup SSH via agente abortado', {
          context: 'SshDeviceBackupRunner',
          deviceId,
          error: msg,
        });
        logSshAudit({
          action: 'COMMAND',
          userId: auditUserId,
          deviceId: device.id,
          deviceName: device.name,
          command: auditLabel,
          success: false,
          errorMessage: msg,
          ip: auditIp,
          duration: Date.now() - started,
        });
        return { success: false, message: msg };
      }
      if (!isAgentOnline(device.agent_id!)) {
        const msg = 'Agente offline. Mantenha o túnel conectado para o backup via agente.';
        logger.warn('Backup SSH via agente abortado', {
          context: 'SshDeviceBackupRunner',
          deviceId,
          error: msg,
        });
        logSshAudit({
          action: 'COMMAND',
          userId: auditUserId,
          deviceId: device.id,
          deviceName: device.name,
          command: auditLabel,
          success: false,
          errorMessage: msg,
          ip: auditIp,
          duration: Date.now() - started,
        });
        return { success: false, message: msg };
      }

      let password: string;
      try {
        password = decrypt(device.password);
      } catch {
        const msg = 'Erro ao descriptografar credenciais do device.';
        logger.error('Backup SSH via agente: credenciais', { context: 'SshDeviceBackupRunner', deviceId });
        logSshAudit({
          action: 'COMMAND',
          userId: auditUserId,
          deviceId: device.id,
          deviceName: device.name,
          command: auditLabel,
          success: false,
          errorMessage: msg,
          ip: auditIp,
          duration: Date.now() - started,
        });
        return { success: false, message: msg };
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

      logger.info('Backup SSH: chamando executeSshCommandThroughAgent', {
        context: 'SshDeviceBackupRunner',
        deviceId,
        agentId: device.agent_id,
        host: device.host,
        port: device.port,
        username: device.username,
        authMode: useKey ? 'privateKey' : 'password',
        commandTimeoutMs: BACKUP_CMD_TIMEOUT_MS,
      });

      const via = await executeSshCommandThroughAgent(
        device.agent_id!,
        {
          host: device.host,
          port: device.port,
          username: device.username,
          deviceType: device.device_type,
          ...(useKey && privateKey ? { privateKey } : { password }),
        },
        backupCommand,
        BACKUP_CMD_TIMEOUT_MS
      );

      logger.info('Backup SSH: retorno executeSshCommandThroughAgent', {
        context: 'SshDeviceBackupRunner',
        deviceId,
        success: via.success,
        outputBytes: via.output != null ? Buffer.byteLength(via.output, 'utf8') : null,
        error: via.error?.slice(0, 300),
      });

      if (!via.success) {
        const msg = via.error ?? `Falha ao executar backup via agente (${auditLabel})`;
        logger.error('Backup SSH via agente falhou', {
          context: 'SshDeviceBackupRunner',
          deviceId,
          name: device.name,
          error: msg,
        });
        logSshAudit({
          action: 'COMMAND',
          userId: auditUserId,
          deviceId: device.id,
          deviceName: device.name,
          command: auditLabel,
          success: false,
          errorMessage: msg,
          ip: auditIp,
          duration: Date.now() - started,
        });
        return { success: false, message: msg };
      }

      output = via.output ?? '';
    } else {
      logger.info('Backup SSH: SSH direto do servidor', {
        context: 'SshDeviceBackupRunner',
        deviceId,
        name: device.name,
        manual,
      });
      usedPool = true;
      const conn = await sshPool.getDeviceConnection(device);
      output = await executeCommand(conn, backupCommand, device.id, { timeoutMs: BACKUP_CMD_TIMEOUT_MS });
    }

    if (device.device_type === 'huawei') {
      const sanitized = stripVrpOxidizedTimestampLines(sanitizeHuaweiBackupOutput(output));
      if (!huaweiSanitizedLooksLikeConfig(sanitized)) {
        const cliFail = huaweiBackupCliFailureMessageWhenNoConfig(output);
        const message =
          cliFail ??
          'Backup Huawei sem configuração reconhecível. Resolva avisos no login (ex.: troca de senha) e tente de novo.';
        logger.error('Backup SSH Huawei: sem config válida após sanitize', {
          context: 'SshDeviceBackupRunner',
          deviceId,
          preview: output.slice(0, 400),
          hadCliHint: Boolean(cliFail),
        });
        logSshAudit({
          action: 'COMMAND',
          userId: auditUserId,
          deviceId: device.id,
          deviceName: device.name,
          command: auditLabel,
          success: false,
          errorMessage: message,
          ip: auditIp,
          duration: Date.now() - started,
        });
        return { success: false, message };
      }
      output = sanitized;
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
      filePath,
      bytes: output.length,
      durationMs: duration,
    });
    logSshAudit({
      action: 'COMMAND',
      userId: auditUserId,
      deviceId: device.id,
      deviceName: device.name,
      command: auditLabel,
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
      name: device.name,
      manual,
      viaAgent,
      error: msg,
      durationMs: duration,
      stack: err instanceof Error ? err.stack : undefined,
    });
    logSshAudit({
      action: 'COMMAND',
      userId: auditUserId,
      deviceId: device.id,
      deviceName: device.name,
      command: auditLabel,
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
