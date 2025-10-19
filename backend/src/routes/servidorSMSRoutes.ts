import { Router } from 'express';
import { ServidorSMSController } from '../controllers/ServidorSMSController';

const router = Router();

// Rotas CRUD básicas
router.get('/', ServidorSMSController.list);
router.get('/ativo', ServidorSMSController.getActive);
router.get('/:id', ServidorSMSController.show);
router.post('/', ServidorSMSController.create);
router.put('/:id', ServidorSMSController.update);
router.delete('/:id', ServidorSMSController.delete);

// Rotas específicas
router.post('/:id/test', ServidorSMSController.testConnection);

export default router;
