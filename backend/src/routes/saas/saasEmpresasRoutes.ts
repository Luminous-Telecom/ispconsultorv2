import { Router } from 'express';
import { SaasDadosEmpresaController } from '../../controllers/saas/SaasDadosEmpresaController';
import { saasAuthMiddleware } from '../../middleware/saasAuthMiddleware';

const router = Router();

router.use(saasAuthMiddleware);

router.get('/stats', SaasDadosEmpresaController.dashboardStats);
router.get('/', SaasDadosEmpresaController.list);
router.post('/:id/desbloquear-manual', SaasDadosEmpresaController.desbloquearManual);
router.patch('/:id/data-fim-desbloqueio-manual', SaasDadosEmpresaController.updateDataFimDesbloqueioManual);
router.get('/:id', SaasDadosEmpresaController.getById);
router.post('/', SaasDadosEmpresaController.create);
router.put('/:id', SaasDadosEmpresaController.update);
router.delete('/:id', SaasDadosEmpresaController.delete);

export default router;
