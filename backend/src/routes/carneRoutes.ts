import { Router } from 'express';
import { CarneController } from '../controllers/CarneController';

const router = Router();

// Rotas para carnês
router.get('/', CarneController.list);
// Rotas específicas devem vir antes de rotas com parâmetros
router.get('/ativos', CarneController.findAtivos);

// Rotas específicas de carnê (seguindo padrão PHP) - DEVEM VIR ANTES DE /:id
router.get('/:carne/imprimir', CarneController.imprimir);
router.get('/:carne/pdf', CarneController.pdf);
router.post('/:carne/consultar-status', CarneController.consultarStatus);
router.post('/:carne/registrar-banco', CarneController.registrarNoBanco);
router.post('/:carne/cancelar-banco', CarneController.cancelarNoBanco);

// Rotas com parâmetros genéricos (devem vir por último)
router.get('/:id', CarneController.getById);
router.post('/', CarneController.create);
router.put('/:id', CarneController.update);
router.delete('/:id', CarneController.delete);

export default router;
