import { Router } from 'express';
import { SaasUsuarioSuperController } from '../../controllers/saas/SaasUsuarioSuperController';
import { saasAuthMiddleware } from '../../middleware/saasAuthMiddleware';

const router = Router();

router.use(saasAuthMiddleware);

router.get('/', SaasUsuarioSuperController.list);
router.get('/:id', SaasUsuarioSuperController.getById);
router.post('/', SaasUsuarioSuperController.create);
router.put('/:id', SaasUsuarioSuperController.update);
router.delete('/:id', SaasUsuarioSuperController.delete);

export default router;
