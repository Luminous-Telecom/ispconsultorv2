import { Router } from 'express';
import { BackupController } from '../../controllers/sistema/BackupController';
import { saasAuthMiddleware } from '../../middleware/saasAuthMiddleware';

const router = Router();
router.use(saasAuthMiddleware);

router.get('/', BackupController.list);
router.post('/manual', BackupController.executeManual);
router.delete('/:nome', BackupController.delete);
router.get('/:nome/download', BackupController.download);
router.post('/:nome/restore', BackupController.restore);

export default router;
