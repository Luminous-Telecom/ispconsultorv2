import { Router } from 'express';
import { ServidorWhatsAppController } from '../controllers/ServidorWhatsAppController';

const router = Router();

// Rotas de mensagens WhatsApp
router.post('/', ServidorWhatsAppController.saveMensagem);
router.get('/tipo/:tipo', ServidorWhatsAppController.getMensagemByTipo);

export default router;

