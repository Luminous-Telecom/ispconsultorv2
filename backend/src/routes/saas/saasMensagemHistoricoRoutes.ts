import { Router } from 'express';
import { SaasMensagemHistoricoController } from '../../controllers/saas/SaasMensagemHistoricoController';
import { saasAuthMiddleware } from '../../middleware/saasAuthMiddleware';

const router = Router();
router.use(saasAuthMiddleware);

router.post('/reenviar-falhas', SaasMensagemHistoricoController.reenviarFalhas);
router.get('/', SaasMensagemHistoricoController.list);
router.get('/entidade/:entidade_tipo/:entidade_id', SaasMensagemHistoricoController.getByEntity);
router.get('/:id', SaasMensagemHistoricoController.show);

export default router;
