import { Router } from 'express';
import { CarneAutoController } from '../controllers/CarneAutoController';

const router = Router();

// Verificar todos os carnês pagos e gerar novos automaticamente
router.post('/verificar-todos', CarneAutoController.verificarTodos);

// Verificar um carnê específico e gerar novo se necessário
router.post('/verificar/:id', CarneAutoController.verificarCarne);

// Obter configurações de geração automática
router.get('/configuracao', CarneAutoController.getConfiguracao);

// Atualizar configurações de geração automática
router.put('/configuracao', CarneAutoController.setConfiguracao);

export default router;
