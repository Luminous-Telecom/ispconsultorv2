import { Router } from 'express';
import { ContaPagarController } from '../controllers/ContaPagarController';

const router = Router();

// Rotas auxiliares (devem vir antes das rotas com parâmetros dinâmicos)
router.get('/resumo', ContaPagarController.resumo);

// Rotas CRUD básicas
router.get('/', ContaPagarController.index);
router.get('/:id', ContaPagarController.show);
router.post('/', ContaPagarController.store);
router.put('/:id', ContaPagarController.update);
router.delete('/:id', ContaPagarController.destroy);

// Rotas específicas
router.post('/:id/pagar', ContaPagarController.pagar);
router.post('/:id/cancelar', ContaPagarController.cancelar);
router.post('/:id/duplicar', ContaPagarController.duplicar);

export default router;

