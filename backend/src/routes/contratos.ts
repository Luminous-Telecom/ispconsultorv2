import { Router } from 'express';
import { ContratoController } from '../controllers/ContratoController';

const router = Router();

// Rotas para contratos
router.get('/contratos/ativos', ContratoController.getAtivos);
router.get('/contratos/:id', ContratoController.getById);
router.get('/contratos/cliente/:clienteId', ContratoController.getByCliente);
router.post('/contratos', ContratoController.create);
router.put('/contratos/:id', ContratoController.update);
router.delete('/contratos/:id', ContratoController.delete);

export default router;
