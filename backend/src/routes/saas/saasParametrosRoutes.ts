import { Router } from 'express';
import { SaasParametrosController } from '../../controllers/saas/SaasParametrosController';
import { saasAuthMiddleware } from '../../middleware/saasAuthMiddleware';

const router = Router();
router.use(saasAuthMiddleware);

router.get('/', SaasParametrosController.get);
router.put('/', SaasParametrosController.update);

export default router;
