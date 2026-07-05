import { Router } from 'express';
import { AtualizacoesController } from '../../controllers/sistema/AtualizacoesController';
import { saasAuthMiddleware } from '../../middleware/saasAuthMiddleware';

const router = Router();
router.use(saasAuthMiddleware);

router.get('/', AtualizacoesController.get);
router.get('/update-stream', AtualizacoesController.updateStream);

export default router;
