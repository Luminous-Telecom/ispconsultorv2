import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { BackupController } from '../../controllers/sistema/BackupController';
import { authMiddleware } from '../../middleware/authMiddleware';
import { isAdminRequest } from '../../utils/tenantUtils';
import { sendForbidden } from '../../utils/responseUtils';
import { resolveArquivosPath } from '../../utils/pathUtils';

const router = Router();

router.use(authMiddleware);
router.use((req, res, next) => {
  if (!isAdminRequest(req)) {
    sendForbidden(res, 'Apenas administradores podem gerenciar backups do sistema.');
    return;
  }
  next();
});

const backupDir = resolveArquivosPath('backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const backupFileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const name = (file.originalname || '').toLowerCase();
  const allowed =
    name.endsWith('.sql') ||
    name.endsWith('.tar.gz') ||
    name.endsWith('.ndjson') ||
    name.endsWith('.txt');
  if (allowed) {
    cb(null, true);
  } else {
    cb(new Error('Formato não suportado. Use: .sql, .tar.gz, .ndjson ou .txt'));
  }
};

const backupStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, backupDir),
  filename: (_req, file, cb) => {
    const base = path.basename(file.originalname || 'backup').replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, base || `backup_${Date.now()}`);
  }
});

const uploadBackup = multer({
  storage: backupStorage,
  fileFilter: backupFileFilter
});

router.get('/', BackupController.list);
router.post('/manual', BackupController.executeManual);
router.post('/manual-stream', BackupController.executeManualStream);
router.post('/upload', (req, res, next) => {
  uploadBackup.single('arquivo')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ success: false, message: err.message });
      }
      return res.status(400).json({ success: false, message: err.message || 'Erro no upload' });
    }
    return next();
  });
}, BackupController.upload);
router.delete('/:nome', BackupController.delete);
router.get('/:nome/download', BackupController.download);
router.post('/:nome/restore', BackupController.restore);

export default router;
