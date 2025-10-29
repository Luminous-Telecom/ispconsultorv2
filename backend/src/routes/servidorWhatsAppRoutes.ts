import { Router } from 'express';
import { ServidorWhatsAppController } from '../controllers/ServidorWhatsAppController';

const router = Router();

// Rotas CRUD básicas
router.get('/ativo', ServidorWhatsAppController.getActive);
router.get('/', ServidorWhatsAppController.list);
router.get('/:id', ServidorWhatsAppController.show);
router.post('/', ServidorWhatsAppController.create);
router.put('/:id', ServidorWhatsAppController.update);
router.delete('/:id', ServidorWhatsAppController.delete);

// Rotas específicas
router.post('/configurar', ServidorWhatsAppController.createOrUpdate);
router.post('/:id/conectar', ServidorWhatsAppController.connectInstance);
router.post('/:id/enviar-mensagem-teste', ServidorWhatsAppController.sendTestMessage);

export default router;
