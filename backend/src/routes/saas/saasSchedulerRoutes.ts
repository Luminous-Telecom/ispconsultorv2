import { Router } from 'express';
import SaasSchedulerController from '../../controllers/saas/SaasSchedulerController';
import { saasAuthMiddleware } from '../../middleware/saasAuthMiddleware';

const router = Router();
router.use(saasAuthMiddleware);

const saasSchedulerController = new SaasSchedulerController();

router.get('/', saasSchedulerController.index.bind(saasSchedulerController));
router.get('/:id', saasSchedulerController.show.bind(saasSchedulerController));
router.post('/', saasSchedulerController.store.bind(saasSchedulerController));
router.put('/:id', saasSchedulerController.update.bind(saasSchedulerController));
router.post('/:id/execute', saasSchedulerController.execute.bind(saasSchedulerController));
router.delete('/:id', saasSchedulerController.destroy.bind(saasSchedulerController));

export default router;
