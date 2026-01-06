import { Router } from 'express';
import NFSeConfigController from '../../controllers/nfse/NFSeConfigController';
import { authMiddleware } from '../../middleware/authMiddleware';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// Obter configuração
router.get('/', NFSeConfigController.get);

// Atualizar configuração
router.put('/', NFSeConfigController.update);

// Testar autenticação
router.post('/test-auth', NFSeConfigController.testAuth);

export default router;

