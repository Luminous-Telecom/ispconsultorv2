import { Router } from 'express';
import { AtualizacoesController } from '../../controllers/sistema/AtualizacoesController';
import { saasAuthMiddleware } from '../../middleware/saasAuthMiddleware';

const router = Router();
router.use(saasAuthMiddleware);

router.get('/', AtualizacoesController.get);
router.get('/update-stream', AtualizacoesController.updateStream);
router.get('/doc-update-stream', AtualizacoesController.docUpdateStream);

export default router;
