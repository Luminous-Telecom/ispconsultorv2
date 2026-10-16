import { Router } from 'express';
import { AtualizacoesController } from '../../controllers/sistema/AtualizacoesController';

const router = Router();

router.get('/atualizacao-status', AtualizacoesController.getStatus);

export default router;
