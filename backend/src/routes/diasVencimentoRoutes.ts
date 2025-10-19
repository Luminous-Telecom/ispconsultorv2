import { Router } from 'express';
import { DiasVencimentoController } from '../controllers/DiasVencimentoController';

const router = Router();

// Rotas para configuração de dias de vencimento
router.get('/', DiasVencimentoController.get);
router.post('/', DiasVencimentoController.create);
router.put('/', DiasVencimentoController.update);
router.get('/historico', DiasVencimentoController.list);

// Rotas específicas para cálculos
router.post('/calcular-proximo', DiasVencimentoController.calculateNextDueDate);
router.post('/validar-data', DiasVencimentoController.validateDueDate);

export default router;
