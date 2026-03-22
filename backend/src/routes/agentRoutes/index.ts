import { Router } from 'express';
import { AgentController } from '../../controllers/agent/AgentController';

const router = Router();

router.get('/', AgentController.index);
router.post('/', AgentController.store);

// Rotas públicas — devem vir ANTES de /:id para evitar conflito de parâmetro
router.get('/files/:filename', AgentController.serveFile);

router.get('/:id', AgentController.show);
router.patch('/:id', AgentController.update);
router.delete('/:id', AgentController.destroy);
router.post('/:id/regenerate-token', AgentController.regenerateToken);
router.post('/:id/test', AgentController.testConnection);
router.post('/:id/install', AgentController.install);
router.get('/:id/install-script', AgentController.installScript);

export default router;
