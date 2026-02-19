import { Router } from 'express';
import { BackupController } from '../../controllers/sistema/BackupController';
import { authMiddleware } from '../../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

router.get('/', BackupController.list);
router.post('/manual', BackupController.executeManual);
router.delete('/:nome', BackupController.delete);
router.get('/:nome/download', BackupController.download);
router.post('/:nome/restore', BackupController.restore);

export default router;
