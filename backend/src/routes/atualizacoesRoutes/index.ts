import { Router } from 'express';
import { AtualizacoesController } from '../../controllers/sistema/AtualizacoesController';

const router = Router();

router.get('/', AtualizacoesController.get);
router.get('/update-stream', AtualizacoesController.updateStream);
router.get('/update-doc-stream', AtualizacoesController.updateDocStream);

export default router;

