import { Router } from 'express';
import { ContratoController } from '../controllers/ContratoController';

const router = Router();

// Rotas para contratos
router.get('/ativos', ContratoController.getAtivos);
router.get('/:id', ContratoController.getById);
router.get('/cliente/:clienteId', ContratoController.getByCliente);
router.post('/', ContratoController.create);
router.put('/:id', ContratoController.update);
router.delete('/:id', ContratoController.delete);

export default router;
