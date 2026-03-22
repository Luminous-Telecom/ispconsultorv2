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
 * Registra no banco um arquivo já gravado em disco (metadados).
 */
export async function registerSshDeviceBackupRow(
  sshDeviceId: string,
  fileName: string,
  sizeBytes: number
): Promise<void> {
  const base = path.basename(fileName);
  if (base !== fileName || base.includes('..')) {
    logger.warn('registerSshDeviceBackupRow: nome de arquivo inválido', { fileName });
    return;
  }
  try {
    await SshDeviceBackup.create({
      ssh_device_id: sshDeviceId,
      file_name: base,
      size_bytes: sizeBytes,
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
  size_bytes: number | bigint | string;
  created_at: Date | string;
  ssh_device_id?: string;
};

export async function listBackupsForDevice(deviceId: string): Promise<SshDeviceBackupFileMeta[]> {
  const rows = (await SshDeviceBackup.findAll({
    where: { ssh_device_id: deviceId },
    order: [['created_at', 'DESC']],
    raw: true,
  })) as unknown as BackupRow[];

  return rows.map((r) => ({
    fileName: r.file_name,
    size: Number(r.size_bytes),
    modifiedAt:
      r.created_at instanceof Date ? r.created_at.toISOString() : new Date(r.created_at).toISOString(),
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
  deviceIds: string[],
  deviceIdToName: Map<string, string>
): Promise<ClienteBackupFlatRow[]> {
  if (deviceIds.length === 0) return [];

  const rows = (await SshDeviceBackup.findAll({
    where: { ssh_device_id: { [Op.in]: deviceIds } },
    order: [['created_at', 'DESC']],
    raw: true,
  })) as unknown as BackupRow[];

  return rows.map((r) => ({
    fileName: r.file_name,
    size: Number(r.size_bytes),
    modifiedAt:
      r.created_at instanceof Date ? r.created_at.toISOString() : new Date(r.created_at).toISOString(),
    device_id: r.ssh_device_id ?? '',
    device_name: deviceIdToName.get(r.ssh_device_id ?? '') ?? (r.ssh_device_id ?? ''),
  }));
}

/**
 * Resolve caminho seguro para download: registro no banco + arquivo no disco (sem path traversal).
 */
export async function resolveBackupFileForDownload(deviceId: string, fileName: string): Promise<string | null> {
  const base = path.basename(fileName);
  if (base !== fileName || base.includes('..') || !base.startsWith(`${deviceId}_`)) {
    return null;
  }

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
