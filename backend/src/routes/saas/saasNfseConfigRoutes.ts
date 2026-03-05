import { Router } from 'express';
import { SaasNFSeConfigController } from '../../controllers/saas/SaasNFSeConfigController';
import { saasAuthMiddleware } from '../../middleware/saasAuthMiddleware';

const router = Router();
router.use(saasAuthMiddleware);

router.get('/', SaasNFSeConfigController.get);
router.put('/', SaasNFSeConfigController.update);
router.post('/test-auth', SaasNFSeConfigController.testAuth);

export default router;
