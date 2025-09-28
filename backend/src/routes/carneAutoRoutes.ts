import { Router } from 'express';
import { CarneAutoController } from '../controllers/CarneAutoController';

const router = Router();

// Verificar se um cliente precisa de um novo carnê
router.get('/verificar-necessidade/:clienteId', CarneAutoController.verificarNecessidadeNovoCarne);

// Obter configurações de auto carnê
router.get('/configuracoes', CarneAutoController.getConfiguracoes);

// Forçar verificação e geração de carnê automático
router.post('/forcar-geracao/:carneId', CarneAutoController.forcarGeracaoCarneAutomatico);

export default router;