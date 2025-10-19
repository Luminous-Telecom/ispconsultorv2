import { Router } from 'express';
import { ServidorEmailController } from '../controllers/ServidorEmailController';

const router = Router();

// Rotas CRUD básicas
router.get('/', ServidorEmailController.list);
router.get('/ativo', ServidorEmailController.getActive);
router.get('/:id', ServidorEmailController.show);
router.post('/', ServidorEmailController.create);
router.put('/:id', ServidorEmailController.update);
router.delete('/:id', ServidorEmailController.delete);

// Rotas específicas
router.post('/configurar', ServidorEmailController.createOrUpdate);
router.post('/:id/test', ServidorEmailController.testConnection);
router.post('/:id/teste-email', ServidorEmailController.sendTestEmail);

export default router;
