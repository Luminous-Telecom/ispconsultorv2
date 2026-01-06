import { Router } from 'express';
import { AtualizacoesController } from '../../controllers/sistema/AtualizacoesController';

const router = Router();

router.get('/', AtualizacoesController.get);
router.post('/update', AtualizacoesController.update);
router.get('/update-stream', AtualizacoesController.updateStream);

export default router;

