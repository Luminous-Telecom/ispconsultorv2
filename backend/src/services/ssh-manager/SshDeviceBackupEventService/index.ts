import { prisma } from '../../../db/prisma';
import { logger } from '../../../utils/logger';

export type SshDeviceBackupEventStatus =
  | 'falha'
  | 'sucesso'
  | 'somente_local'
  | 'falha_envio'
  | 'verificado';

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
    await prisma.sistema_logs_operacionais.create({
      data: {
        empresa_id: params.empresaId,
        canal: 'ssh',
        tipo: params.status,
        recurso: 'ssh_manager_devices',
        recurso_id: String(params.sshDeviceId),
        mensagem: params.detail ?? null,
        payload: JSON.stringify({
          log_contexto: 'ssh_backup',
          ssh_device_id: params.sshDeviceId,
          status: params.status,
          detail: params.detail ?? null,
        }),
      },
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
