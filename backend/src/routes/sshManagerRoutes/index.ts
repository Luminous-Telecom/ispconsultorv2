import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { DeviceController } from '../../controllers/ssh-manager/DeviceController';
import { SshAuditController } from '../../controllers/ssh-manager/AuditController';

const router = Router();

/**
 * Rate limiter restritivo para operações SSH sensíveis (execute e test).
 * 10 requisições por minuto por usuário (identificado por IP).
 */
const sshOperationsLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  keyGenerator: (req) => req.ip ?? '0.0.0.0',
  message: {
    success: false,
    message: 'Limite de operações SSH atingido. Tente novamente em 1 minuto.',
    error: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Devices ───────────────────────────────────────────────────────────────────
router.get('/devices', DeviceController.index);
router.get('/backup-agendamento', DeviceController.backupAgendamento);
router.get('/device-backups', DeviceController.listBackupsByCliente);
router.post('/devices', DeviceController.store);
router.get('/devices/:id', DeviceController.show);
router.get('/devices/:id/backups', DeviceController.listDeviceBackups);
router.delete('/devices/:id/backups', DeviceController.deleteDeviceBackup);
router.get('/devices/:id/backups/download', DeviceController.downloadDeviceBackup);
router.patch('/devices/:id', DeviceController.update);
router.delete('/devices/:id', DeviceController.destroy);
router.post('/devices/:id/test', sshOperationsLimiter, DeviceController.testConnection);
router.post('/devices/:id/execute', sshOperationsLimiter, DeviceController.executeCommand);
router.post('/devices/:id/backup', sshOperationsLimiter, DeviceController.queueManualBackup);

// ── Auditoria ─────────────────────────────────────────────────────────────────
router.get('/audit', SshAuditController.index);

export default router;
