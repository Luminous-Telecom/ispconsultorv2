import * as fs from 'fs/promises';
import * as path from 'path';
import { Op } from 'sequelize';
import { resolveArquivosPath } from '../../../utils/pathUtils';
import { SshDeviceBackup } from '../../../models/ssh-manager/SshDeviceBackup';
import { logger } from '../../../utils/logger';

export interface SshDeviceBackupFileMeta {
  fileName: string;
  size: number;
  modifiedAt: string;
}

function backupDir(): string {
  return resolveArquivosPath('ssh-device-backups');
}

/**
 * Registra no banco um arquivo já gravado em disco (metadados + janela da execução).
 */
export async function registerSshDeviceBackupRow(
  sshDeviceId: number,
  fileName: string,
  sizeBytes: number,
  startedAt: Date,
  finishedAt: Date
): Promise<void> {
  const base = path.basename(fileName);
  if (base !== fileName || base.includes('..')) {
    logger.warn('registerSshDeviceBackupRow: nome de arquivo inválido', { fileName });
    return;
  }
  if (!Number.isInteger(sshDeviceId) || sshDeviceId < 1) {
    logger.warn('registerSshDeviceBackupRow: ssh_device_id inválido', { sshDeviceId });
    return;
  }
  try {
    await SshDeviceBackup.create({
      ssh_device_id: sshDeviceId,
      file_name: base,
      size_bytes: sizeBytes,
      started_at: startedAt,
      finished_at: finishedAt,
    });
  } catch (err) {
    logger.error('Falha ao registrar backup SSH no banco (arquivo já existe no disco)', {
      context: 'SshDeviceBackupStorageService.registerSshDeviceBackupRow',
      sshDeviceId,
      fileName: base,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Lista backups registrados no banco para o device.
 */
type BackupRow = {
  file_name: string;
  size_bytes: number | bigint;
  created_at: Date | string;
  finished_at?: Date | string | null;
  ssh_device_id?: number;
};

function rowToModifiedAtIso(r: BackupRow): string {
  const ts = r.finished_at ?? r.created_at;
  return ts instanceof Date ? ts.toISOString() : new Date(ts).toISOString();
}

export async function listBackupsForDevice(deviceId: number): Promise<SshDeviceBackupFileMeta[]> {
  if (!Number.isInteger(deviceId) || deviceId < 1) return [];
  const rows = (await SshDeviceBackup.findAll({
    where: { ssh_device_id: deviceId },
    order: [['finished_at', 'DESC']],
    raw: true,
  })) as unknown as BackupRow[];

  return rows.map((r) => ({
    fileName: r.file_name,
    size: Number(r.size_bytes),
    modifiedAt: rowToModifiedAtIso(r),
  }));
}

export interface ClienteBackupFlatRow extends SshDeviceBackupFileMeta {
  device_id: string;
  device_name: string;
}

/**
 * Lista backups de vários devices (já filtrados por cliente/tenant no controller).
 */
export async function listBackupsForDeviceIds(
  deviceIds: number[],
  deviceIdToName: Map<number, string>
): Promise<ClienteBackupFlatRow[]> {
  if (deviceIds.length === 0) return [];

  const ids = deviceIds.filter((n) => Number.isInteger(n) && n > 0);
  if (ids.length === 0) return [];

  const rows = (await SshDeviceBackup.findAll({
    where: { ssh_device_id: { [Op.in]: ids } },
    order: [['finished_at', 'DESC']],
    raw: true,
  })) as unknown as BackupRow[];

  return rows.map((r) => {
    const did = r.ssh_device_id!;
    return {
      fileName: r.file_name,
      size: Number(r.size_bytes),
      modifiedAt: rowToModifiedAtIso(r),
      device_id: String(did),
      device_name: deviceIdToName.get(did) ?? String(did),
    };
  });
}

/**
 * Resolve caminho seguro para download: registro no banco + arquivo no disco (sem path traversal).
 */
export async function resolveBackupFileForDownload(
  deviceId: number,
  fileName: string
): Promise<string | null> {
  const base = path.basename(fileName);
  if (base !== fileName || base.includes('..')) {
    return null;
  }

  if (!Number.isInteger(deviceId) || deviceId < 1) return null;

  const row = await SshDeviceBackup.findOne({
    where: { ssh_device_id: deviceId, file_name: base },
  });
  if (!row) {
    return null;
  }

  const root = path.resolve(backupDir());
  const full = path.resolve(path.join(root, base));
  if (full !== root && !full.startsWith(root + path.sep)) {
    return null;
  }
  try {
    const st = await fs.stat(full);
    if (!st.isFile()) return null;
  } catch {
    return null;
  }
  return full;
}

/**
 * Remove backup do device (registro no banco e arquivo em disco).
 */
export async function deleteBackup(deviceId: number, fileName: string): Promise<boolean> {
  const base = path.basename(fileName);
  if (base !== fileName || base.includes('..')) {
    return false;
  }

  if (!Number.isInteger(deviceId) || deviceId < 1) return false;

  const row = await SshDeviceBackup.findOne({
    where: { ssh_device_id: deviceId, file_name: base },
  });
  if (!row) return false;

  const root = backupDir();
  const full = path.resolve(path.join(root, base));
  if (full !== root && !full.startsWith(root + path.sep)) return false;

  try {
    await fs.unlink(full);
  } catch {
    // Continua para remover o registro
  }
  await row.destroy();
  return true;
}
