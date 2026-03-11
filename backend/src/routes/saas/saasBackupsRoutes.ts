import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { BackupController } from '../../controllers/sistema/BackupController';
import { saasAuthMiddleware } from '../../middleware/saasAuthMiddleware';
import { resolveArquivosPath } from '../../utils/pathUtils';

const router = Router();
router.use(saasAuthMiddleware);

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
  fileFilter: backupFileFilter,
  limits: { fileSize: 500 * 1024 * 1024 }
});

router.get('/', BackupController.list);
router.post('/manual', BackupController.executeManual);
router.post('/upload', (req, res, next) => {
  uploadBackup.single('arquivo')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ success: false, message: 'Arquivo muito grande. Tamanho máximo: 500MB' });
        }
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
