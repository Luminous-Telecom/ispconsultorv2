import { Router } from 'express';
import { AgentController } from '../../controllers/agent/AgentController';

const router = Router();

router.get('/', AgentController.index);
router.post('/', AgentController.store);

// Rotas de instalação remota — autenticação própria (X-Agent-Token), antes de /:id genérico
router.get('/:id/files/:filename', AgentController.serveFile);
router.get('/:id/install-script', AgentController.installScript);

router.get('/:id', AgentController.show);
router.patch('/:id', AgentController.update);
router.delete('/:id', AgentController.destroy);
router.post('/:id/regenerate-token', AgentController.regenerateToken);
router.post('/:id/test', AgentController.testConnection);
router.post('/:id/install', AgentController.install);

export default router;
