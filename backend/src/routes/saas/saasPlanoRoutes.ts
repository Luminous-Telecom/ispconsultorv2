import { Router } from 'express';
import { SaasPlanoController } from '../../controllers/saas/SaasPlanoController';
import { saasAuthMiddleware } from '../../middleware/saasAuthMiddleware';

const router = Router();

router.use(saasAuthMiddleware);

router.get('/', SaasPlanoController.list);
router.get('/:id', SaasPlanoController.getById);
router.post('/', SaasPlanoController.create);
router.put('/:id', SaasPlanoController.update);
router.delete('/:id', SaasPlanoController.delete);

export default router;
