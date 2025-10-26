import { Router } from 'express';
import { ContratoController } from '../controllers/ContratoController';

const router = Router();

// Rotas para contratos
router.get('/', ContratoController.list);
router.get('/ativos', ContratoController.getAtivos);
router.get('/cliente/:clienteId', ContratoController.getByCliente);
router.get('/:id', ContratoController.getById);
router.post('/', ContratoController.create);
router.put('/:id', ContratoController.update);
router.delete('/:id', ContratoController.delete);

export default router;
