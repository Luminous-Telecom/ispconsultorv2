import { Router } from 'express';
import { ServidorEmailController } from '../controllers/ServidorEmailController';

const router = Router();

// Rotas de mensagens Email
router.post('/', ServidorEmailController.saveMensagem);
router.get('/tipo/:tipo', ServidorEmailController.getMensagemByTipo);

export default router;

