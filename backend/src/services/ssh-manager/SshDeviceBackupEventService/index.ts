import { logger } from '../../../utils/logger';
import {
  SshDeviceBackupEvent,
  type SshDeviceBackupEventStatus,
} from '../../../models/ssh-manager/SshDeviceBackupEvent';

/**
 * Registra um evento de backup (sucesso/falha/etc.) para métricas do dashboard.
 * Falha na gravação não interrompe o fluxo de backup.
 */
export async function recordSshDeviceBackupEvent(params: {
  sshDeviceId: number;
  empresaId: number | null;
  status: SshDeviceBackupEventStatus;
  detail?: string | null;
}): Promise<void> {
  if (!Number.isInteger(params.sshDeviceId) || params.sshDeviceId < 1) return;
  try {
    await SshDeviceBackupEvent.create({
      ssh_device_id: params.sshDeviceId,
      empresa_id: params.empresaId,
      status: params.status,
      detail: params.detail ?? null,
    });
  } catch (err) {
    logger.warn('Falha ao registrar evento de backup do equipamento', {
      context: 'SshDeviceBackupEventService',
      sshDeviceId: params.sshDeviceId,
      status: params.status,
      error: err instanceof Error ? err.message : 'Erro desconhecido',
    });
  }
}
