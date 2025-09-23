import { Router } from 'express';
import { CarneController } from '../controllers/CarneController';

const router = Router();

// Rotas para carnês
router.get('/', CarneController.list);
// Rotas específicas devem vir antes de rotas com parâmetros
router.get('/ativos', CarneController.findAtivos);
router.get('/:id', CarneController.getById);
router.post('/', CarneController.create);
router.put('/:id', CarneController.update);
router.delete('/:id', CarneController.delete);

// Rotas específicas de carnê (seguindo padrão PHP)
router.get('/:carne/imprimir', CarneController.imprimir);
router.get('/:carne/pdf', CarneController.pdf);
router.post('/:carne/gerar-titulos', CarneController.gerarTitulos);
router.post('/:carne/consultar-status', CarneController.consultarStatus);
router.post('/:carne/cancelar-banco', CarneController.cancelarNoBanco);

export default router;
