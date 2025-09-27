import { Router } from 'express';
import { WorkerController } from '../controllers/WorkerController';

const router = Router();

// Status e monitoramento
router.get('/status', WorkerController.getStatus);
router.get('/health', WorkerController.getHealth);
router.get('/stats', WorkerController.getStats);

// Execução de rotinas
router.post('/execute/:id', WorkerController.executeRoutine);

// Logs
router.get('/logs/:id', WorkerController.getExecutionLogs);
router.get('/logs', WorkerController.getRecentLogs);

export default router;

