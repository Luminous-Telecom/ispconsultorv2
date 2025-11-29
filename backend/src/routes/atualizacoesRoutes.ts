import { Router } from 'express';
import { AtualizacoesController } from '../controllers/AtualizacoesController';

const router = Router();

router.get('/', AtualizacoesController.get);
router.post('/update', AtualizacoesController.update);

export default router;

